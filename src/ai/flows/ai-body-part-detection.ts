'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIBodyPartDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
});

const AIBodyPartDetectionOutputSchema = z.object({
    symptomId: z.enum(["heart", "bones", "eyes", "fever", "dental"]).describe('The closest matching symptom ID based on the body part detected. e.g. chest/heart -> heart, leg/arm/joint/neck -> bones, eye/head -> eyes, fever/general -> fever, mouth/teeth/face -> dental'),
    reason: z.string().describe('A simple 1-sentence reason for the detection aimed at an elderly person.'),
});

export type AIBodyPartDetectionInput = z.infer<typeof AIBodyPartDetectionInputSchema>;
export type AIBodyPartDetectionOutput = z.infer<typeof AIBodyPartDetectionOutputSchema>;

export async function detectBodyPart(input: AIBodyPartDetectionInput): Promise<AIBodyPartDetectionOutput> {
    const result = await ai.generate({
        prompt: [
            { text: "Examine this image. An elderly patient is pointing to a body part they need medical help with. What body part is it? Match it to one of these symptom categories: 'heart' (chest/heart), 'bones' (joints, back, leg, knee, arm, hand, bones), 'eyes' (head, eyes), 'fever' (general wellness, forehead, no specific part pointing), 'dental' (mouth, teeth, face). Focus strictly on what they are pointing at or showing." },
            { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
        ],
        output: { schema: AIBodyPartDetectionOutputSchema },
    });
    return result.output!;
}
