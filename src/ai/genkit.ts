import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

console.log("[AI:Init] Initializing Genkit with Google AI...");
const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
    console.error("[AI:Error] NO GOOGLE API KEY FOUND in environment variables!");
} else {
    console.log("[AI:Success] Google API Key identified.");
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
  model: 'googleai/gemini-1.5-flash',
});
