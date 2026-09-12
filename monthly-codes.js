/* Shared, dependency-free code and calendar helpers. Calendar months use UTC. */
(function (root) {
  "use strict";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function monthKey(time) {
    return new Date(time).toISOString().slice(0, 7);
  }
  function monthWindow(key) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error("Invalid month");
    const [year, month] = key.split("-").map(Number);
    if (year < 2000 || year > 9998) throw new Error("Invalid year");
    return { validFrom: Date.UTC(year, month - 1, 1), expiresAt: Date.UTC(year, month, 1) };
  }
  function normalizeCode(code) {
    return String(code).toUpperCase().replace(/[\s-]/g, "");
  }
  function generateCode(cryptoProvider = root.crypto) {
    // 32 symbols, 16 characters: 80 random bits.
    let code = "";
    while (code.length < 16) {
      for (const byte of cryptoProvider.getRandomValues(new Uint8Array(32))) {
        if (code.length < 16) code += alphabet[byte & 31];
      }
    }
    return code;
  }
  async function hashCode(month, memberId, code, cryptoProvider = root.crypto) {
    const input = new TextEncoder().encode(month + ":" + memberId + ":" + normalizeCode(code));
    const digest = await cryptoProvider.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
  }
  function formatCode(code) {
    return normalizeCode(code).match(/.{1,4}/g)?.join("-") || "";
  }
  const api = { monthKey, monthWindow, normalizeCode, generateCode, hashCode, formatCode };
  if (typeof module !== "undefined") module.exports = api;
  else root.MonthlyCodes = api;
})(globalThis);
