const https = require("https");

module.exports = async function handler(req, res) {
  // 1. إعدادات الوصول (CORS) لضمان عمل الموقع
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;

    // 2. بيانات OneSignal - وضعناها يدوياً لضمان العمل 100%
    const postData = JSON.stringify({
      app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
      included_segments: ["All"],
      contents: { "ar": message, "en": message },
      headings: { "ar": "Spaarkring", "en": "Spaarkring" }
    });

    const options = {
      hostname: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic Os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22kb3h6ycqmph2yyzw2uooxfi3k3uvccboabgo34a3pghyolftacda"
      }
    };

    // 3. إرسال الطلب باستخدام مكتبة https الأصلية
    const request = https.request(options, (response) => {
      let responseData = "";
      response.on("data", (chunk) => { responseData += chunk; });
      response.on("end", () => {
        return res.status(response.statusCode).json({
          success: response.statusCode === 200,
          onesignal: responseData
        });
      });
    });

    request.on("error", (error) => {
      return res.status(500).json({ error: error.message });
    });

    request.write(postData);
    request.end();

  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
