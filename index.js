// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
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

// Root route
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
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await sendToAI(message);
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
        const reply = await sendToAI(
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
            const reply = await sendToAI(speechResult, callSid);

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
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});