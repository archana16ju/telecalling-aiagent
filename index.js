// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import fetch from 'node-fetch'; // Required if using Node.js <18
import { sendToAI } from './agent.js';

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

// Helper to send message with memory
async function sendMessage(message, sessionId = 'default') {
    if (!message) return;

    if (!conversationMemory[sessionId]) {
        conversationMemory[sessionId] = [];
    }

    // Add user message
    conversationMemory[sessionId].push({ role: 'user', text: message });
    console.log(`You (${sessionId}): ${message}`);

    try {
        // Call AI (your own endpoint or external AI)
        const reply = await sendToAI(message, sessionId);

        conversationMemory[sessionId].push({ role: 'agent', text: reply });
        console.log(`Agent (${sessionId}): ${reply}`);

        return reply;
    } catch (err) {
        console.error('Error communicating with AI:', err.message);
        return 'Error communicating with AI.';
    }
}

// =====================
// Routes
// =====================

// Root
app.get('/', (req, res) => {
    res.send('Telecaller AI server is running ✅');
});

// GET /call for browser testing
app.get('/call', (req, res) => {
    res.send('Use POST method to interact with AI');
});

// POST /call: test AI without phone
app.post('/call', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await sendMessage(message, sessionId || 'default');
        res.json({ reply });
    } catch (error) {
        console.error('Error in /call:', error.message);
        res.status(500).json({ error: 'AI request failed' });
    }
});

// Twilio webhook: incoming call
app.post('/voice', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;

    try {
        const reply = await sendMessage(
            "The customer has connected. Greet them and ask what they would like to order.",
            callSid
        );

        const gather = twiml.gather({
            input: 'speech',
            action: '/voice/respond',
            speechTimeout: 'auto',
            timeout: 5
        });
        gather.say(reply);

        // Fallback if no speech detected
        twiml.say('We didn\'t hear anything. Please call back when you are ready.');
    } catch (error) {
        console.error('Error in /voice:', error);
        twiml.say('Sorry, our restaurant AI is offline.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
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
            twiml.say('I didn\'t catch that. Could you please repeat your order?');
            twiml.redirect('/voice/respond');
        }
    } catch (error) {
        console.error('Error in /voice/respond:', error);
        twiml.say('Sorry, we encountered a technical issue. Ending call.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});