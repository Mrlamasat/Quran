const https = require("https");

module.exports = (req, res) => {
  // إعدادات للسماح للموقع بالاتصال بالـ API
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") return res.status(200).send("Server is running");

  const data = JSON.stringify({
    app_id: "564eb270-ccb3-428f-b9f8-f162d56321c4",
    included_segments: ["All"],
    contents: { ar: req.body.message || "تنبيه جديد", en: req.body.message || "New Alert" }
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
    response.on("data", () => {});
    response.on("end", () => res.status(200).json({ sent: true }));
  });

  request.on("error", (e) => res.status(500).json({ error: e.message }));
  request.write(data);
  request.end();
};
