"use strict";
let pushClient = null;
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function (OneSignal) {
  try {
    await OneSignal.init({
      appId: "564eb270-ccb3-428f-b9f8-f162d56321c4",
      serviceWorkerPath: "OneSignalSDKWorker.js",
      notifyButton: { enable: false },
      promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false }] } }
    });
    pushClient = OneSignal;
    OneSignal.User.PushSubscription.addEventListener("change", updatePushStatus);
    updatePushStatus();
  } catch (error) {
    document.getElementById("notificationStatus").textContent = "إشعارات الهاتف غير متاحة في هذا المتصفح حاليًا.";
  }
});
function updatePushStatus() {
  const subscribed = pushClient?.User.PushSubscription.optedIn;
  document.getElementById("enableNotifications").hidden = !!subscribed;
  document.getElementById("notificationStatus").textContent = subscribed ? "إشعارات التسليم مفعّلة على هذا الهاتف." : "";
}
async function enableNotifications() {
  const status = document.getElementById("notificationStatus");
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches && !navigator.standalone) {
    status.textContent = "على iPhone: أضف الموقع إلى الشاشة الرئيسية من قائمة المشاركة، ثم افتحه من هناك وفعّل الإشعارات.";
    return;
  }
  if (!pushClient) { status.textContent = "خدمة الإشعارات لم تتصل بعد. حاول مجددًا بعد قليل."; return; }
  try {
    if (Notification.permission === "denied") {
      status.textContent = "الإشعارات محظورة. اسمح بها من إعدادات الموقع في المتصفح ثم حاول مجددًا.";
      return;
    }
    await pushClient.User.PushSubscription.optIn();
    updatePushStatus();
  } catch (error) { status.textContent = "تعذر تفعيل الإشعارات. تحقق من إعدادات المتصفح."; }
}
