import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { sendToAI } from './agent.js';

dotenv.config();

const app = express();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required to parse Twilio's form-encoded payloads

// Root route
app.get('/', (req, res) => {
    res.send('Telecaller AI server is running ✅');
});

// Add GET /call (for browser)
app.get('/call', (req, res) => {
    res.send('Use POST method to interact with AI');
});

// POST route (AI text endpoint for testing)
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

// 📞 NEW: Twilio Webhook for incoming voice calls
app.post('/voice', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;

    try {
        // Trigger initial greeting from the AI
        const reply = await sendToAI("The customer has connected. Greet them and ask what they would like to order.", callSid);
        
        // Ask Twilio to speak the AI's greeting, then gather the customer's speech
        const gather = twiml.gather({
            input: 'speech',
            action: '/voice/respond',
            speechTimeout: 'auto',
            timeout: 5
        });
        gather.say(reply);
        
        // If the gather times out and no speech is detected, say this message
        twiml.say('We didn\'t hear anything. Please call back when you are ready.');
    } catch (error) {
        console.error('Error in /voice:', error);
        twiml.say('Sorry, our restaurant AI is offline.');
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
});

// 🗣️ NEW: Twilio Webhook to process the customer's speech
app.post('/voice/respond', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult;

    try {
        if (speechResult) {
            // Send the customer's speech to the AI
            const reply = await sendToAI(speechResult, callSid);

            // Respond back to the customer using Gather so we can continue the conversation
            const gather = twiml.gather({
                input: 'speech',
                action: '/voice/respond',
                speechTimeout: 'auto',
                timeout: 5
            });
            gather.say(reply);
        } else {
            // Failsafe if speech gathering failed but the route was called
            twiml.say('I didn\'t catch that. Could you please repeat your order?');
            twiml.redirect('/voice/respond'); // Can't cleanly loop without complex states, but this handles most errors
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