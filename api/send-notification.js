export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { message } = req.body;
    
    // وضعنا المفاتيح يدوياً لتجاوز مشكلة Vercel نهائياً
    const APP_ID = "564eb270-ccb3-428f-b9f8-f162d56321c4";
    const REST_KEY = "Os_v2_app_kzhle4gmwnbi7opy6frnkyzbyrqitvovpu2ugku5pdtd33igz22kb3h6ycqmph2yyzw2uooxfi3k3uvccboabgo34a3pghyolftacda";

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${REST_KEY}`
            },
            body: JSON.stringify({
                app_id: APP_ID,
                included_segments: ["All"],
                contents: { "ar": message, "en": message },
                headings: { "ar": "تنبيه Spaarkring", "en": "Spaarkring Notification" }
            }),
        });

        const data = await response.json();

        if (data.errors) {
            return res.status(400).json({ success: false, errors: data.errors });
        }

        return res.status(200).json({ success: true, data });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
