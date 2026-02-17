const https = require("https");

module.exports = (req, res) => {
  // إعداد CORS للسماح لأي موقع
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // التعامل مع OPTIONS (Preflight)
  if (req.method === "OPTIONS") return res.status(200).end();

  // إذا لم يكن POST
  if (req.method !== "POST") return res.status(200).send("Server is ready");

  // البيانات المرسلة من الطلب أو القيم الافتراضية
  const {
    title = "إشعار جديد 🔔",
    message = "تنبيه من Spaarkring",
    image,   // رابط الصورة الكبيرة (اختياري)
    icon,    // رابط الأيقونة (اختياري)
    url,     // رابط عند الضغط على الإشعار (اختياري)
    buttons  // مصفوفة أزرار [{id,text,url}] (اختياري)
  } = req.body || {};

  const notification = {
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"], // إرسال لكل المشتركين
    headings: { ar: title, en: title },
    contents: { ar: message, en: message }
  };

  if (image) notification.big_picture = image;
  if (icon) {
    notification.small_icon = icon;
    notification.large_icon = icon;
  }
  if (url) notification.url = url;
  if (buttons && Array.isArray(buttons)) notification.buttons = buttons;

  const postData = JSON.stringify(notification);

  const options = {
    hostname: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(postData),
      "Authorization": "Basic os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22bs3bzghjlkq6zmkb7texyn6fnichix5prdjwlwev7jye2wia7yui"
    }
  };

  const request = https.request(options, (response) => {
    let responseBody = "";
    response.on("data", (chunk) => (responseBody += chunk));
    response.on("end", () => {
      res.status(response.statusCode).send(responseBody);
    });
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));

  request.write(postData);
  request.end();
};
