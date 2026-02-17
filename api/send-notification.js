export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { message } = req.body;
    
    // تنظيف المفتاح من أي زيادات أو مسافات قد تكون دخلت بالخطأ
    const rawKey = process.env.ONESIGNAL_REST_KEY || "";
    const cleanKey = rawKey.replace('Basic ', '').trim();

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${cleanKey}` // إضافة الكلمة برمجياً لضمان الدقة
            },
            body: JSON.stringify({
                app_id: process.env.ONESIGNAL_APP_ID.trim(),
                included_segments: ["All"],
                contents: { "ar": message, "en": message }
            }),
        });

        const data = await response.json();

        if (data.errors) {
            console.error("OneSignal Server Error:", data.errors);
            return res.status(400).json(data);
        }

        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
