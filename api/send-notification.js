const https = require("https");

module.exports = (req, res) => {

  // CORS كامل
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // معالجة طلب OPTIONS (Preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // إذا لم يكن POST
  if (req.method !== "POST") {
    return res.status(200).send("Server is ready");
  }

  const messageText =
    req.body && req.body.message
      ? req.body.message
      : "تنبيه من Spaarkring";

  const postData = JSON.stringify({
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"],
    contents: {
      ar: messageText,
      en: messageText,
    },
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
        "Basic Os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22kb3h6ycqmph2yyzw2uooxfi3k3uvccboabgo34a3pghyolftacda",
    },
  };

  const request = https.request(options, (response) => {
    let responseBody = "";

    response.on("data", (chunk) => {
      responseBody += chunk;
    });

    response.on("end", () => {
      try {
        const parsed = JSON.parse(responseBody);
        res.status(response.statusCode).json({
          success: response.statusCode === 200,
          onesignal: parsed,
        });
      } catch {
        res.status(response.statusCode).json({
          success: false,
          raw: responseBody,
        });
      }
    });
  });

  request.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  request.write(postData);
  request.end();
};
