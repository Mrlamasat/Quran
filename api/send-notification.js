"use strict";
const DATABASE_URL = "https://jamia-app-5bd27-default-rtdb.europe-west1.firebasedatabase.app";
const APP_ID = "564eb270-ccb3-428f-b9f8-f162d56321c4";
const MEMBERS = ["محسن","سليم","أبو محمد","مشتاق","رضوان","عبدالرحمن","علي","أبو هتان","أبو خالد","حمزة"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({code:"method_not_allowed"}); }
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || "")?.[1];
  if (!token) return res.status(401).json({code:"authentication_required"});
  const eventId = req.body?.eventId;
  if (typeof eventId !== "string" || !UUID.test(eventId)) return res.status(400).json({code:"invalid_event"});
  try {
    // Firebase validates this ID token and restricts this path to the existing
    // administrator. No client-supplied title, name, amount, URL or audience.
    const eventResponse = await fetch(DATABASE_URL + "/payout_events/" + eventId + ".json?auth=" + encodeURIComponent(token), {signal:AbortSignal.timeout(8000)});
    if (!eventResponse.ok) return res.status(eventResponse.status === 401 || eventResponse.status === 403 ? 403 : 502).json({code:"event_access_denied"});
    const event = await eventResponse.json();
    if (!event || event.delivered !== true || !Number.isInteger(event.memberId) || event.memberId < 1 || event.memberId > 10 || !Number.isFinite(event.createdAt)) {
      return res.status(400).json({code:"invalid_event"});
    }
    if (Date.now() - event.createdAt > 86400000 || event.createdAt > Date.now() + 60000) return res.status(400).json({code:"event_expired"});
    const key = process.env.ONESIGNAL_REST_API_KEY;
    if (!key) return res.status(503).json({code:"notifications_not_configured"});
    const response = await fetch("https://api.onesignal.com/notifications", {
      method:"POST", signal:AbortSignal.timeout(10000),
      headers:{"Content-Type":"application/json",Authorization:"Key " + key},
      body:JSON.stringify({
        app_id:APP_ID, target_channel:"push", included_segments:["Subscribed Users"],
        headings:{en:"تسليم الجمعية",ar:"تسليم الجمعية"},
        contents:{en:"تم تسليم الجمعية إلى " + MEMBERS[event.memberId - 1] + " ✅", ar:"تم تسليم الجمعية إلى " + MEMBERS[event.memberId - 1] + " ✅"},
        url:"https://samenstorten.vercel.app/",
        // Retries of this saved event cannot broadcast duplicate notifications.
        idempotency_key:eventId
      })
    });
    const result = await response.json();
    if (!response.ok) return res.status(502).json({code:"notification_provider_failed"});
    return res.status(200).json({sent:!!result.id});
  } catch (error) { return res.status(502).json({code:"notification_failed"}); }
};
