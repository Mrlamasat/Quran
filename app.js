const firebaseConfig={apiKey:"AIzaSyC-J-Cg9OeZD--fwStoZTFzK4xFy5ylz9I",authDomain:"jamia-app-5bd27.firebaseapp.com",databaseURL:"https://jamia-app-5bd27-default-rtdb.europe-west1.firebasedatabase.app",projectId:"jamia-app-5bd27",storageBucket:"jamia-app-5bd27.appspot.com",messagingSenderId:"870308712173",appId:"1:870308712173:web:be101df99fef412f7886e4"};
firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();
const members = ["محسن","سليم","أبو محمد","مشتاق","رضوان","عبدالرحمن","علي","أبو هتان","أبو خالد","حمزة"];
const ADMIN_EMAIL = "mohammeddalmohsen@gmail.com";
let isAdmin = false, monthKey = "", timeReady = false, serverOffset = 0;
let payments = {}, activations = {}, received = {}, unsubscribe = [];
let codesRequest = 0;
const $ = id => document.getElementById(id);
const serverNow = () => Date.now() + serverOffset;
function showAlert(message) { $("alertMsg").textContent = message; $("myAlert").style.display = "block"; }
function closeAlert() { $("myAlert").style.display = "none"; }
function fail(error) { console.error(error.code || "operation_failed"); showAlert("تعذرت العملية. تحقق من الاتصال وصلاحيات Firebase، ثم حاول مجددًا."); }
function detach() { unsubscribe.forEach(fn => fn()); unsubscribe = []; }
function listen(path, setter) {
  const ref = db.ref(path);
  const callback = ref.on("value", snap => { setter(snap.val() || {}); render(); }, fail);
  unsubscribe.push(() => ref.off("value", callback));
}
function syncMonth() {
  if (!auth.currentUser || !timeReady) return;
  const key = MonthlyCodes.monthKey(serverNow());
  if (key === monthKey) return;
  monthKey = key;
  detach(); payments = {}; activations = {}; received = {};
  $("monthLabel").textContent = "سجل شهر: " + monthKey;
  $("codeMonth").value = key;
  clearCodes();
  listen("payments/" + key, value => { payments = value; });
  listen("monthly_activations/" + key, value => { activations = value; });
  listen("received_totals", value => { received = value; });
  render();
}
db.ref(".info/serverTimeOffset").on("value", snap => {
  serverOffset = Number(snap.val()) || 0; timeReady = true; syncMonth();
});
setInterval(syncMonth, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncMonth(); });
auth.onAuthStateChanged(async user => {
  detach(); monthKey = ""; isAdmin = false; clearCodes();
  $("adminPanel").style.display = "block";
  $("adminControls").style.display = "none";
  if (!user) {
    payments = {}; activations = {}; received = {}; render();
    try { await auth.signInAnonymously(); } catch (error) { fail(error); }
    return;
  }
  isAdmin = !user.isAnonymous && (user.email || "").toLowerCase() === ADMIN_EMAIL;
  $("adminControls").style.display = isAdmin ? "block" : "none";
  $("loginForm").style.display = "none";
  syncMonth();
});
function toggleAdminView() {
  $("loginForm").style.display = $("loginForm").style.display === "block" ? "none" : "block";
}
function render() {
  $("memberTable").innerHTML = members.map((name, index) => {
    const id = index + 1, paid = payments[id]?.status === true, active = !!activations[id];
    return `<tr><td><b>${name}</b></td>
      <td class="${active ? "paid" : "not-paid"}">${active ? "مفعّل ✅" : "بانتظار التفعيل"}
      ${!active && monthKey ? `<div><input type="text" id="in-${id}" class="code-input" aria-label="كود تفعيل ${name}" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32"><button onclick="verify(${id})" class="btn-verify">تفعيل</button></div>` : ""}</td>
      <td class="${paid ? "paid" : "not-paid"}">${paid ? "مدفوع ✅" : "غير مدفوع"}
      ${isAdmin ? `<button onclick="setPayment(${id},${!paid})" class="btn-verify">${paid ? "إلغاء التأكيد" : "تأكيد ٤٠٠ €"}</button>` : ""}</td></tr>`;
  }).join("");
  $("payoutTable").innerHTML = members.map((name, index) => {
    const id = index + 1, done = received[id] === true;
    return `<tr><td>${id}. ${name}</td><td class="${done ? "paid" : "not-paid"}">${done ? "استلم ✅" : "لم يستلم"}</td><td>${isAdmin ? `<button onclick="toggleRec(${id},${done})" class="btn-verify">تبديل</button>` : ""}</td></tr>`;
  }).join("");
  const count = members.filter((_, index) => payments[index + 1]?.status === true).length;
  const next = members.find((_, index) => received[index + 1] !== true);
  $("summary").textContent = "المؤكد دفعه: " + (count * 400) + " من ٤٬٠٠٠ يورو — التالي حسب القائمة: " + (next || "اكتملت الدورة");
}
async function verify(id) {
  const input = $("in-" + id);
  const code = MonthlyCodes.normalizeCode(input?.value || "");
  if (!/^[A-HJ-NP-Z2-9]{16}$/.test(code)) return showAlert("أدخل كود هذا الشهر كاملًا (١٦ حرفًا ورقمًا).");
  syncMonth();
  const key = monthKey;
  if (!key || !auth.currentUser) return showAlert("انتظر اكتمال الاتصال.");
  try {
    const codeHash = await MonthlyCodes.hashCode(key, id, code);
    await db.ref("monthly_activations/" + key + "/" + id).set({
      codeHash, activatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    showAlert("✅ تم تفعيل " + members[id - 1] + " لشهر " + key + ". التفعيل لا يُعد تأكيدًا للدفع.");
  } catch (error) {
    showAlert("لم يتم التفعيل. الكود غير صحيح، أو انتهت صلاحيته، أو استُخدم سابقًا. تحقق أيضًا من اتصالك.");
  }
}
async function setPayment(id, status) {
  if (!isAdmin) return;
  syncMonth();
  if (!confirm((status ? "تأكيد استلام ٤٠٠ يورو من " : "إلغاء تأكيد دفع ") + members[id - 1] + " لشهر " + monthKey + "؟")) return;
  try {
    await db.ref("payments/" + monthKey + "/" + id).set({
      status, amount: 400, date: new Date(serverNow()).toISOString(),
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    showAlert("تم تحديث سجل الدفع.");
  } catch (error) { fail(error); }
}
async function toggleRec(id, done) {
  if (!isAdmin || !confirm((done ? "إلغاء استلام " : "تأكيد تسليم ٤٬٠٠٠ يورو إلى ") + members[id - 1] + "؟")) return;
  try { await db.ref("received_totals/" + id).set(!done); } catch (error) { fail(error); }
}
function clearCodes() { codesRequest++; $("issuedCodes").replaceChildren(); }
async function issueCodes() {
  if (!isAdmin || !timeReady) return;
  clearCodes();
  const request = codesRequest, key = $("codeMonth").value;
  const current = MonthlyCodes.monthKey(serverNow());
  const currentWindow = MonthlyCodes.monthWindow(current);
  const next = MonthlyCodes.monthKey(currentWindow.expiresAt);
  if (key !== current && key !== next) return showAlert("اختر الشهر الحالي أو الشهر القادم.");
  const button = $("issueCodes"); button.disabled = true;
  try {
    const window = MonthlyCodes.monthWindow(key), batch = { ...window, members: {} };
    for (let id = 1; id <= members.length; id++) {
      const code = MonthlyCodes.generateCode();
      batch.members[id] = { code, hash: await MonthlyCodes.hashCode(key, id, code) };
    }
    const ref = db.ref("activation_codes/" + key);
    // Concurrent admins reuse the winning batch. Existing monthly codes are immutable.
    const result = await ref.transaction(existing => existing ? undefined : batch, undefined, false);
    if (!isAdmin || request !== codesRequest) return;
    const issued = result.snapshot.val();
    for (let id = 1; id <= members.length; id++) {
      const code = issued.members[id].code;
      const line = document.createElement("div"); line.className = "issued-code";
      const label = document.createElement("span");
      label.textContent = members[id - 1] + " — " + MonthlyCodes.formatCode(code);
      const copy = document.createElement("button"); copy.textContent = "نسخ الرسالة";
      copy.onclick = async () => {
        const message = "مرحبًا " + members[id - 1] + "، كود تفعيل الجمعية لشهر " + key + ": " + MonthlyCodes.formatCode(code) + "\nhttps://samenstorten.vercel.app\nصالح لهذا الشهر فقط، وينتهي عند بداية الشهر التالي بتوقيت UTC. التفعيل لا يُثبت دفع القسط.";
        try { await navigator.clipboard.writeText(message); showAlert("تم نسخ الرسالة، ويمكنك إرسالها للمستفيد."); }
        catch { showAlert(message); }
      };
      line.append(label, copy); $("issuedCodes").append(line);
    }
  } catch (error) { fail(error); }
  finally { button.disabled = false; }
}
async function loginAdmin() {
  try {
    const credential = await auth.signInWithEmailAndPassword($("email").value.trim(), $("pass").value);
    $("pass").value = "";
    if ((credential.user.email || "").toLowerCase() !== ADMIN_EMAIL) showAlert("هذا الحساب ليس حساب المسؤول.");
  } catch (error) { showAlert("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور."); }
}
async function logoutAdmin() {
  clearCodes();
  try { await auth.signOut(); } catch (error) { fail(error); }
}
