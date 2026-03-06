import { config } from 'dotenv';
config({ path: '.env.local' });
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY;
console.log("Loaded API Key starting with:", apiKey ? apiKey.substring(0, 5) + "..." : "NULL");

const ai = genkit({
    plugins: [googleAI({ apiKey: apiKey as string })],
});

async function test() {
    try {
        console.log("\n--- Testing Generation with gemini-1.5-flash ---");
        const { text } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: 'Say the word SUCCESS'
        });
        console.log("Response:", text);
        console.log("\n✅ Test passed!");
    } catch (e) {
        console.error("\n❌ Error generating content:");
        console.error(e);
    }
}

test();
