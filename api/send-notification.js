const https = require("https");

module.exports = async function handler(req, res) {
  // السماح فقط بـ POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // CORS لضمان قبول الطلب من موقعك
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // البيانات الأساسية لـ OneSignal
    const notification = {
      app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
      contents: { "ar": message, "en": message },
      headings: { "ar": "تنبيه Spaarkring", "en": "Spaarkring Alert" },
      included_segments: ["All"],
    };

    const postData = JSON.stringify(notification);

    const options = {
      hostname: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "Authorization": "Basic Os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22kb3h6ycqmph2yyzw2uooxfi3k3uvccboabgo34a3pghyolftacda",
      },
    };

    const request = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        return res.status(response.statusCode).json({
          success: response.statusCode === 200,
          info: data
        });
      });
    });

    request.on("error", (error) => {
      return res.status(500).json({ error: "Failed" });
    });

    request.write(postData);
    request.end();

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
};
