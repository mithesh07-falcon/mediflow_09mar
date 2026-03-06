import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: apiKey ? [
    // Reverting to the default behavior which uses v1beta. 
    // This resolves the 'Unknown name "responseMimeType"' error found in v1.
    googleAI({ apiKey })
  ] : [],
  // Using the most standard model identifier for Gemini 2.5 Flash.
  model: 'googleai/gemini-2.5-flash',
});
