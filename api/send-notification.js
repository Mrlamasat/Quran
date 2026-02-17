export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    const appId = process.env.ONESIGNAL_APP_ID;
    const restKey = process.env.ONESIGNAL_REST_KEY;

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${restKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                included_segments: ["All"],
                contents: { "en": message, "ar": message },
                headings: { "en": "تنبيه من Spaarkring", "ar": "تنبيه من Spaarkring" }
            }),
        });

        const data = await response.json();
        
        if (data.errors) {
            console.error("OneSignal Error:", data.errors);
            return res.status(400).json({ success: false, errors: data.errors });
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
