'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIPillDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
    language: z.string().describe('The language name to output the instruction in (e.g., Hindi, English, Tamil)'),
    prescriptions: z.string().describe('JSON string of the patient\'s active prescriptions (medications they are prescribed) to cross-reference against.'),
});

const AIPillDetectionOutputSchema = z.object({
    name: z.string().describe('The name of the detected pill (e.g. Dolo 650, Amlodipine). Match it to the prescriptions if possible.'),
    instruction: z.string().describe('A simple, reassuring 1-2 sentence instruction aimed at an elderly person. It must include timing and reason based strictly on their prescription data if found. It MUST be translated entirely into the requested language.'),
});

export type AIPillDetectionInput = z.infer<typeof AIPillDetectionInputSchema>;
export type AIPillDetectionOutput = z.infer<typeof AIPillDetectionOutputSchema>;

export async function detectPill(input: AIPillDetectionInput): Promise<AIPillDetectionOutput> {
    const result = await ai.generate({
        prompt: [
            { text: `Examine this image of a pill/medication. The user is an elderly patient. Here are their active prescriptions:\n\n${input.prescriptions}\n\n1. Identify the pill.\n2. Cross-reference it with their prescriptions to determine when they should take it and why.\n3. Write a reassuring instruction to the patient.\n4. IMPORTANT: Write the instruction COMPLETELY in the language: ${input.language}.` },
            { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
        ],
        output: { schema: AIPillDetectionOutputSchema },
    });
    return result.output!;
}
