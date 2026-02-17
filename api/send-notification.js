const https = require("https");

module.exports = (req, res) => {
  // إعدادات الوصول للسماح لموقعك بالاتصال
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // إذا كان الطلب ليس POST (مثل فحص السيرفر)
  if (req.method !== "POST") {
    return res.status(200).send("Server is ready");
  }

  // تجهيز نص الرسالة من الطلب
  const messageText = req.body && req.body.message ? req.body.message : "تنبيه من Spaarkring";

  // بيانات OneSignal (المفاتيح محفورة لضمان العمل)
  const data = JSON.stringify({
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"],
    contents: { ar: messageText, en: messageText }
  });

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
    let responseBody = "";
    response.on("data", (chunk) => { responseBody += chunk; });
    response.on("end", () => {
      // إرجاع النتيجة للموقع
      res.status(200).json({ success: true, status: response.statusCode });
    });
  });

  request.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  request.write(data);
  request.end();
};
