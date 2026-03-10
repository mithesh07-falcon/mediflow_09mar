'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIBodyPartDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
});

const AIBodyPartDetectionOutputSchema = z.object({
    symptomId: z.enum(["heart", "bones", "eyes", "fever", "dental", "ent", "stomach", "neuro", "skin"]).describe('The closest matching symptom ID based on the body part detected.'),
    reason: z.string().describe('A simple 1-sentence reason for the detection aimed at an elderly person.'),
});

export type AIBodyPartDetectionInput = z.infer<typeof AIBodyPartDetectionInputSchema>;
export type AIBodyPartDetectionOutput = z.infer<typeof AIBodyPartDetectionOutputSchema>;

export async function detectBodyPart(input: AIBodyPartDetectionInput): Promise<AIBodyPartDetectionOutput> {
    const result = await ai.generate({
        prompt: [
            { text: "Examine this image. An elderly patient is pointing to a body part they need medical help with. What body part is it? Match it to one of these symptom categories:\n- 'heart' (pointing to chest/heart area)\n- 'bones' (pointing to joints, back, leg, knee, arm, hand, bones)\n- 'eyes' (pointing to eyes)\n- 'fever' (general wellness, forehead, no specific part pointing)\n- 'dental' (pointing to mouth/teeth)\n- 'ent' (pointing to ears, nose, or throat)\n- 'stomach' (pointing to belly/stomach area)\n- 'neuro' (pointing to head/brain area for headaches/dizziness)\n- 'skin' (pointing to skin rashes/marks anywhere on body)\n\nFocus strictly on what they are pointing at or showing." },
            { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
        ],
        output: { schema: AIBodyPartDetectionOutputSchema },
    });
    return result.output!;
}
