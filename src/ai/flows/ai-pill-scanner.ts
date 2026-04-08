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
    try {
        const result = await ai.generate({
            prompt: [
                { text: `You are a medical assistant for an elderly person. Examine this image of a pill/medication.
                
                USER DATA (Active Prescriptions):
                ${input.prescriptions}

                INSTRUCTIONS:
                1. **IDENTIFICATION**: Look for text on the backside (label/strip) of the tablet. If visible, identify the medicine name and what it is used for.
                2. **ACCURACY CHECK**: Cross-reference the medicine name with the user's active prescriptions above. 
                3. **PRESCRIPTION VERIFICATION**:
                   - Does the name match exactly?
                   - Is it the right time of day to take it (referencing 'Morning', 'Afternoon', 'Night' in prescription notes)?
                   - Confirm the dosage (e.g., 500mg, 1 tablet).
                4. **RESPONSE**: 
                   - Tell the user exactly what the medicine is.
                   - Tell them if it matches their doctor's prescription.
                   - Tell them exactly WHEN the doctor said to take it and WHAT it is for.
                5. **LANGUAGE**: Provide the entire instruction in ${input.language}. Keep it extremely simple, bold, and reassuring for a senior citizen.` },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
            ],
            output: { schema: AIPillDetectionOutputSchema },
        });
        return result.output!;
    } catch (e) {
        console.warn("Pill Scanner AI failed (Quota or Network).", e);
        return {
            name: "Unknown / Needs Check",
            instruction: input.language === "Hindi" 
                ? "माफ़ करें, अभी हम दवाई पहचान नहीं पा रहे हैं। कृपया दवाई के पैकेट पर नाम ध्यान से देखें या डॉक्टर से पूछें।"
                : "I'm sorry, I cannot recognize the medicine right now. Please carefully check the name on the packet or ask your doctor before taking it."
        };
    }
}
