const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const {webcrypto} = require("node:crypto");
const codes = require("../monthly-codes");
test("restored session waits for fresh token; delivery history survives reconnection", async () => {
  const elements = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id,{style:{},hidden:false,textContent:"",innerHTML:"",replaceChildren(){},append(){}});
    return elements.get(id);
  };
  let callback, tokenResolve;
  const token = new Promise(resolve=>{tokenResolve=resolve;});
  const user = {isAnonymous:true,getIdToken:()=>token};
  const auth = {currentUser:user,onAuthStateChanged:cb=>{callback=cb;},signInAnonymously:async()=>{}};
  const active = new Map(), observed = [];
  const db = {ref(p){return {on(event,cb){active.set(p,cb);observed.push(p);return cb;},off(){active.delete(p);}};},goOffline(){},goOnline(){}};
  const firebase = {initializeApp(){},auth:()=>auth,database:()=>db};
  firebase.database.ServerValue={TIMESTAMP:{".sv":"timestamp"}};
  const context=vm.createContext({firebase,MonthlyCodes:codes,Date,console,crypto:webcrypto,TextEncoder,
    document:{getElementById:el,addEventListener(){}},setInterval(){},navigator:{},confirm:()=>false});
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../app.js"),"utf8"),context);
  active.get(".info/serverTimeOffset")({val:()=>0});
  assert.deepEqual(observed,[".info/serverTimeOffset"],"time offset must not start protected reads");
  const initializing=callback(user);
  assert.deepEqual(observed,[".info/serverTimeOffset"],"auth callback must await token");
  tokenResolve("fixture-token"); await initializing;
  assert.ok(active.has("received_totals"));
  active.get("received_totals")({val:()=>({"1":true,"6":false})});
  assert.match(el("payoutTable").innerHTML,/محسن<\/td><td class="paid">تم التسليم/);
  assert.match(el("payoutTable").innerHTML,/عبدالرحمن<\/td><td class="not-paid">لم يتم التسليم/);
  await callback(user);
  assert.match(el("payoutTable").innerHTML,/محسن<\/td><td class="paid">تم التسليم/);
  assert.equal(el("summary").textContent,"");
});
test("no delivery state is fabricated before the first snapshot", async () => {
  const source=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
  assert.match(source,/received === null \? "جارٍ تحميل السجل…"/);
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  assert.doesNotMatch(html,/المؤكد دفعه|الكود يفعّل الشهر المحدد/);
});
const handler=require("../api/send-notification");
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};}
test("notification endpoint authenticates and rejects arbitrary broadcasts", async () => {
  const res=response();
  await handler({method:"POST",headers:{},body:{message:"spam"}},res);
  assert.equal(res.statusCode,401);
});
test("saved payout event controls recipient name and idempotency; missing provider configuration is explicit", async () => {
  const originalFetch=global.fetch, originalKey=process.env.ONESIGNAL_REST_API_KEY;
  const eventId="c318de7b-a876-4df3-8732-c3e7dcce8ca1";
  const requests=[];
  global.fetch=async (url,options)=>{requests.push({url,options});return url.includes("firebasedatabase")?{ok:true,json:async()=>({memberId:2,delivered:true,createdAt:Date.now()})}:{ok:true,json:async()=>({id:"test-notification"})};};
  try {
    delete process.env.ONESIGNAL_REST_API_KEY;
    let res=response();
    await handler({method:"POST",headers:{authorization:"Bearer test-token"},body:{eventId}},res);
    assert.equal(res.statusCode,503); assert.equal(requests.length,1);
    process.env.ONESIGNAL_REST_API_KEY="test-only-key";
    res=response();
    await handler({method:"POST",headers:{authorization:"Bearer test-token"},body:{eventId,message:"untrusted"}},res);
    assert.equal(res.statusCode,200);
    const sent=JSON.parse(requests.at(-1).options.body);
    assert.equal(sent.idempotency_key,eventId); assert.match(sent.contents.ar,/سليم/);
    assert.doesNotMatch(sent.contents.ar,/untrusted/);
  } finally {global.fetch=originalFetch;if(originalKey===undefined)delete process.env.ONESIGNAL_REST_API_KEY;else process.env.ONESIGNAL_REST_API_KEY=originalKey;}
});
