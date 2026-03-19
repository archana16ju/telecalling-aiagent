import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: "You are a friendly, concise, and efficient restaurant order taker. Ask the customer what they want to order, confirm their choices, ask if they want anything else, and finalize the total order. Keep your responses short because they will be read over the phone using speech-to-text. Do not use asterisks or markdown formatting. Use plain conversational text.", 
});

const sessions = new Map(); 

export async function sendToAI(message, callSid = 'text-testing-default') {
    if (!GOOGLE_API_KEY) {
        console.error('API key not found');
        return 'AI request failed: Missing API Key';
    }

    try {
        if (!sessions.has(callSid)) {
            sessions.set(callSid, model.startChat());
        }

        const chat = sessions.get(callSid);
        const result = await chat.sendMessage(message);
        return result.response.text();
    } catch (error) {
        console.error('AI request failed:', error.message);
        return 'I am sorry, but I am having trouble processing that request right now. Could you repeat that?';
    }
}