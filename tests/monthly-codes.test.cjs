"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const codes = require("../monthly-codes.js");
const rules = JSON.parse(fs.readFileSync(require("node:path").join(__dirname, "../database.rules.json"))).rules;

test("UTC month boundaries include leap February and December rollover", () => {
  for (const key of ["2024-02", "2026-02", "2026-09", "2026-12"]) {
    const period = codes.monthWindow(key);
    assert.equal(codes.monthKey(period.validFrom), key);
    assert.equal(codes.monthKey(period.expiresAt - 1), key);
    assert.notEqual(codes.monthKey(period.expiresAt), key);
    assert.ok(period.expiresAt - period.validFrom <= 31 * 86400000);
  }
  assert.equal(codes.monthWindow("2024-02").expiresAt - codes.monthWindow("2024-02").validFrom, 29 * 86400000);
  assert.throws(() => codes.monthWindow("2026-13"));
});

test("codes use crypto randomness and tolerate pasted separators and lowercase", async () => {
  const generated = new Set();
  for (let i = 0; i < 100; i++) {
    const code = codes.generateCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{16}$/);
    assert.equal(codes.normalizeCode(codes.formatCode(code).toLowerCase()), code);
    generated.add(code);
  }
  assert.equal(generated.size, 100);
  const code = "ABCD2345EFGH6789";
  assert.equal(await codes.hashCode("2026-09", 1, code), await codes.hashCode("2026-09", 1, "abcd-2345-efgh-6789"));
  assert.notEqual(await codes.hashCode("2026-09", 1, code), await codes.hashCode("2026-10", 1, code));
  assert.notEqual(await codes.hashCode("2026-09", 1, code), await codes.hashCode("2026-09", 2, code));
});

// Evaluate expressions with synthetic snapshots. This does NOT emulate Firebase's
// validation engine, networking, auth token verification, or transaction retries.
class Snapshot {
  constructor(value) { this.value = value; }
  val() { return this.value ?? null; }
  exists() { return this.value !== null && this.value !== undefined; }
  child(path) { return new Snapshot(String(path).split("/").reduce((v, key) => v?.[key], this.value)); }
  hasChildren(keys) { return keys.every(key => this.child(key).exists()); }
  isString() { return typeof this.value === "string"; }
  isNumber() { return typeof this.value === "number" && Number.isFinite(this.value); }
  isBoolean() { return typeof this.value === "boolean"; }
}
function evaluate(expression, variables) {
  if (typeof expression === "boolean") return expression;
  return !!vm.runInNewContext(expression.replace(/\.matches\(/g, ".match("), variables, { timeout: 1000 });
}
function validate(node, value, variables) {
  const scope = { ...variables, newData: new Snapshot(value) };
  if (node[".validate"] !== undefined && !evaluate(node[".validate"], scope)) return false;
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const wildcard = Object.keys(node).find(k => k.startsWith("$"));
      const childRule = node[key] || node[wildcard];
      if (childRule && !validate(childRule, child, wildcard && !node[key] ? {...scope, [wildcard]: key} : scope)) return false;
    }
  }
  return true;
}
const member = { uid: "anonymous-fixture", token: { firebase: { sign_in_provider: "anonymous" } } };
const admin = { uid: "admin-fixture", token: { email: "mohammeddalmohsen@gmail.com", firebase: { sign_in_provider: "password" } } };
const period = codes.monthWindow("2026-09");
const now = period.validFrom + 86400000;
const goodHash = "a".repeat(64);
const fixture = { activation_codes: { "2026-09": { ...period, members: { "1": { code: "ABCD2345EFGH6789", hash: goodHash } } } } };
function context(extra = {}) {
  return { auth: member, now, $month: "2026-09", $id: "1", root: new Snapshot(fixture), data: new Snapshot(null), newData: new Snapshot(null), ...extra };
}
function redeem(extra = {}, payload = { codeHash: goodHash, activatedAt: extra.now ?? now }) {
  const node = rules.monthly_activations.$month.$id;
  const variables = context({ ...extra, newData: new Snapshot(payload) });
  return evaluate(node[".write"], variables) && validate(node, payload, variables);
}
test("correct current-month activation is accepted", () => assert.ok(redeem()));
test("wrong code and another member's code are denied", () => {
  assert.equal(redeem({}, { codeHash: "b".repeat(64), activatedAt: now }), false);
  assert.equal(redeem({ $id: "2" }), false);
});
test("before start, exactly at expiry, and after expiry are denied", () => {
  assert.equal(redeem({ now: period.validFrom - 1 }), false);
  assert.ok(redeem({ now: period.validFrom }));
  assert.ok(redeem({ now: period.expiresAt - 1 }));
  assert.equal(redeem({ now: period.expiresAt }), false);
  assert.equal(redeem({ now: period.expiresAt + 1 }), false);
});
test("old month's hash cannot activate a new month", () => {
  assert.equal(redeem({ $month: "2026-10" }), false);
});
test("replay, unauthenticated writes, deletion, extra fields and forged time are denied", () => {
  assert.equal(redeem({ data: new Snapshot({ codeHash: goodHash, activatedAt: now }) }), false);
  assert.equal(redeem({ auth: null }), false);
  assert.equal(redeem({}, null), false);
  assert.equal(redeem({}, {codeHash: goodHash, activatedAt: now, status: true}), false);
  assert.equal(redeem({}, {codeHash: goodHash, activatedAt: now - 1}), false);
});
test("secrets and root reads are denied to members; admin can read monthly codes", () => {
  assert.equal(evaluate(rules[".read"], context()), false);
  assert.equal(evaluate(rules.secret_codes[".read"], context({auth: admin})), false);
  assert.equal(evaluate(rules.activation_codes.$month[".read"], context()), false);
  assert.ok(evaluate(rules.activation_codes.$month[".read"], context({auth: admin})));
});
test("only admin may create a code batch, and existing batches cannot change", () => {
  const node = rules.activation_codes.$month;
  const payload = { ...period, members: {} };
  for (let id = 1; id <= 10; id++) payload.members[id] = { code: "ABCD2345EFGH6789", hash: goodHash };
  const variables = context({auth:admin,newData:new Snapshot(payload)});
  assert.ok(evaluate(node[".write"], variables) && validate(node, payload, variables));
  assert.equal(evaluate(node[".write"], {...variables,auth:member}), false);
  assert.equal(evaluate(node[".write"], {...variables,data:new Snapshot(payload)}), false);
  assert.equal(validate(node,{...payload,expiresAt:period.validFrom + 32 * 86400000},variables),false);
});
test("member cannot mark payments or payouts; admin payment preserves amount and time validation", () => {
  const payment = {status:true,amount:400,date:"2026-09-02",updatedAt:now};
  const node = rules.payments.$month.$id;
  const variables = context({newData:new Snapshot(payment)});
  assert.equal(evaluate(node[".write"], variables),false);
  assert.equal(evaluate(rules.received_totals.$id[".write"], context({newData:new Snapshot(true)})),false);
  assert.ok(evaluate(node[".write"], {...variables,auth:admin}) && validate(node,payment,variables));
  assert.equal(validate(node,{...payment,amount:1},variables),false);
});
