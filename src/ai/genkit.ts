import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn("CRITICAL: AI API Key is missing. Clinical synchronization will fail.");
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey || 'MISSING_KEY' })
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
