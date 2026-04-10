import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

console.log("[AI:Init] Initializing Genkit with Google AI...");
const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
const model = process.env.MEDIFLOW_AI_MODEL || process.env.GENKIT_MODEL || 'googleai/gemini-1.5-flash';
if (!apiKey) {
    console.error("[AI:Error] NO GOOGLE API KEY FOUND in environment variables!");
} else {
    console.log("[AI:Success] Google API Key identified.");
}
console.log(`[AI:Init] Active model: ${model}`);

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
  model,
});
