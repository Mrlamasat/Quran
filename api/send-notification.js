const https = require("https");

module.exports = async (req, res) => {
  // إعدادات CORS للسماح للموقع بالاتصال
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).send("API is active");

  const messageText = req.body && req.body.message ? req.body.message : "تنبيه من Spaarkring";

  // تجهيز البيانات
  const data = JSON.stringify({
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"],
    contents: { ar: messageText, en: messageText },
    headings: { ar: "تنبيه الجمعية", en: "Spaarkring Alert" }
  });

  // إعدادات الطلب - لاحظ تنسيق Authorization المحدث
  const options = {
    hostname: "onesignal.com",
    path: "/api/v1/notifications",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": "Basic Os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22kb3h6ycqmph2yyzw2uooxfi3k3uvccboabgo34a3pghyolftacda"
    }
  };

  const request = https.request(options, (response) => {
    let body = "";
    response.on("data", (chunk) => body += chunk);
    response.on("end", () => {
      // إرسال رد الموقع النهائي
      res.status(response.statusCode).json({
        success: response.statusCode === 200,
        os_status: response.statusCode,
        details: body
      });
    });
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));
  request.write(data);
  request.end();
};
