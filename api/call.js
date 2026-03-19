import { sendToAI } from '../agent.js';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        let { message, sessionId } = req.body;

        if (typeof req.body === "string") {
            const body = JSON.parse(req.body);
            message = body.message;
            sessionId = body.sessionId;
        }

        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        // Use real AI
        const aiReply = await sendToAI(message, sessionId || 'api-default');

        res.status(200).json({ reply: aiReply });

    } catch (err) {

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}