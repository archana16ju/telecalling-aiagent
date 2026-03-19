// api/call.js
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        // Parse JSON manually if needed
        let body = req.body;

        // Vercel sometimes sends string if Content-Type not handled
        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        const { message } = body;

        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        // Simple AI simulation
        let aiReply = "I am sorry, could you repeat that?";

        if (message.toLowerCase().includes("pizza")) {
            aiReply = "Great! What size pizza would you like?";
        } else if (message.toLowerCase().includes("order")) {
            aiReply = "Sure, I can help you with your order. What would you like?";
        }

        res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}