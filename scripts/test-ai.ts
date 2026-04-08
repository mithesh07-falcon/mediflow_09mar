import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
    const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    console.log("Checking models via direct REST...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.error("REST FAILED:", e.message);
    }
}

main();
