const https = require("https");

module.exports = async function handler(req, res) {
  // السماح فقط بـ POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // CORS Protection
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // 🔐 التحقق من المفتاح السري
    const clientSecret = req.headers["authorization"];
    if (!clientSecret || clientSecret !== `Bearer ${process.env.API_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      message,
      title,
      image,
      icon,
      url,
      player_ids,
      buttons
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const notification = {
      app_id: process.env.ONESIGNAL_APP_ID,
      contents: { en: message },
      headings: { en: title || "إشعار جديد" },
      included_segments: ["All"],
    };

    // إرسال لمستخدم محدد
    if (player_ids && Array.isArray(player_ids)) {
      delete notification.included_segments;
      notification.include_player_ids = player_ids;
    }

    // صورة كبيرة
    if (image) {
      notification.big_picture = image;
      notification.chrome_big_picture = image;
    }

    // أيقونة
    if (icon) {
      notification.small_icon = icon;
      notification.large_icon = icon;
    }

    // رابط عند الضغط
    if (url) {
      notification.url = url;
    }

    // أزرار
    if (buttons && Array.isArray(buttons)) {
      notification.buttons = buttons;
    }

    const postData = JSON.stringify(notification);

    const options = {
      hostname: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Authorization: `Basic ${process.env.ONESIGNAL_REST_KEY}`,
      },
    };

    const request = https.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }

        return res.status(response.statusCode).json({
          success: response.statusCode === 200,
          onesignal_response: parsed,
        });
      });
    });

    request.on("error", (error) => {
      console.error("OneSignal Error:", error);
      return res.status(500).json({ error: "Notification Failed" });
    });

    request.write(postData);
    request.end();
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
};
