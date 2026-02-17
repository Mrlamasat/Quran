const https = require("https");

module.exports = (req, res) => {
  // إعداد CORS للسماح لأي موقع
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // التعامل مع OPTIONS (Preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // إذا لم يكن POST
  if (req.method !== "POST") {
    return res.status(200).send("Server is ready");
  }

  // نص الرسالة من الطلب أو افتراضي
  const messageText =
    req.body && req.body.message
      ? req.body.message
      : "تنبيه من Spaarkring";

  // بيانات OneSignal
  const postData = JSON.stringify({
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"], // إرسال للجميع
    contents: { ar: messageText, en: messageText },
  });

  const options = {
    hostname: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(postData),
      "Authorization":
        "Basic os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22bs3bzghjlkq6zmkb7texyn6fnichix5prdjwlwev7jye2wia7yui"
    },
  };

  const request = https.request(options, (response) => {
    let responseBody = "";

    response.on("data", (chunk) => {
      responseBody += chunk;
    });

    response.on("end", () => {
      // إرجاع الرد الكامل من OneSignal
      res.status(response.statusCode).send(responseBody);
    });
  });

  request.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  request.write(postData);
  request.end();
};
