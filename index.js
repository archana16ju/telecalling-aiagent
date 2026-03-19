// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { sendToAI } from './agent.js'; // your AI function

dotenv.config();

// Twilio setup
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const VoiceResponse = twilio.twiml.VoiceResponse;

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

// Twilio webhook: incoming call
app.post('/voice', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;

    try {
        const reply = await sendMessage(
            'Hello! Welcome to our AI Telecaller. How can I help you today?',
            callSid
        );

        const gather = twiml.gather({
            input: 'speech',
            action: '/voice/respond',
            speechTimeout: 'auto',
            timeout: 5
        });
        gather.say(reply);

        // fallback if no input
        twiml.redirect('/voice/respond');
    } catch (err) {
        console.error('/voice Error:', err.message);
        twiml.say('Sorry, the AI is currently offline.');
    }

    res.type('text/xml').send(twiml.toString());
});

// Twilio webhook: process customer's speech
app.post('/voice/respond', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult;

    try {
        if (speechResult) {
            const reply = await sendMessage(speechResult, callSid);

            const gather = twiml.gather({
                input: 'speech',
                action: '/voice/respond',
                speechTimeout: 'auto',
                timeout: 5
            });
            gather.say(reply);
        } else {
            twiml.say('I did not catch that. Please repeat your request.');
            twiml.redirect('/voice/respond');
        }
    } catch (err) {
        console.error('/voice/respond Error:', err.message);
        twiml.say('Sorry, there was a technical error. Ending the call.');
    }

    res.type('text/xml').send(twiml.toString());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});