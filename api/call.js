export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Replace this with your AI logic
        const reply = `You said: ${message}`;

        return res.status(200).json({ reply });
    } else {
        res.status(405).json({ error: "Method not allowed. Use POST." });
    }
}