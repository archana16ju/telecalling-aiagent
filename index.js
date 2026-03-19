import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendToAI } from './agent.js'; // your AI function

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Twilio

// =====================
// Conversation Memory
// =====================
const conversationMemory = {};

// Helper: send message to AI with memory
async function sendMessage(message, sessionId = 'default') {
    if (!message) return 'No message received.';

    if (!conversationMemory[sessionId]) {
        conversationMemory[sessionId] = [];
    }

    // Add user message
    conversationMemory[sessionId].push({ role: 'user', text: message });
    console.log(`User (${sessionId}): ${message}`);

    try {
        const reply = await sendToAI(message, sessionId);
        conversationMemory[sessionId].push({ role: 'agent', text: reply });
        console.log(`Agent (${sessionId}): ${reply}`);
        return reply;
    } catch (err) {
        console.error('AI Error:', err.message);
        return 'Sorry, AI is unavailable right now.';
    }
}

// =====================
// Routes
// =====================

// Root
app.get('/', (req, res) => {
    res.send('Telecaller AI server is running ✅');
});

// POST /call: test AI without phone
app.post('/call', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const reply = await sendMessage(message, sessionId || 'default');
        res.json({ reply });
    } catch (err) {
        console.error('/call Error:', err.message);
        res.status(500).json({ error: 'AI request failed' });
    }
});

// GET /voice: browser instructions
app.get('/voice', (req, res) => {
    res.send('This is a Twilio Webhook endpoint. It only accepts POST requests from Twilio.');
});

// Start server

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});