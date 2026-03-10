'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIBodyPartDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
    staffList: z.string().optional().describe('JSON string of available medical staff and their specialties.'),
});

const AIBodyPartDetectionOutputSchema = z.object({
    symptomId: z.enum(["heart", "bones", "eyes", "fever", "dental", "ent", "stomach", "neuro", "skin"]).describe('The closest matching symptom ID based on the body part detected.'),
    specialistType: z.string().describe('The name of the medical specialty (e.g. Cardiologist).'),
    predictedDoctorName: z.string().describe('The name of the specific doctor suggested from the staff list.'),
    reason: z.string().describe('A simple 1-sentence reason for the detection aimed at an elderly person.'),
});

export type AIBodyPartDetectionInput = z.infer<typeof AIBodyPartDetectionInputSchema>;
export type AIBodyPartDetectionOutput = z.infer<typeof AIBodyPartDetectionOutputSchema>;

export async function detectBodyPart(input: AIBodyPartDetectionInput): Promise<AIBodyPartDetectionOutput> {
    const result = await ai.generate({
        prompt: [
            {
                text: `Examine this image. An elderly patient is pointing to a body part they need medical help with.
            What body part is it? Match it to one of these symptom categories:
            - 'heart' (pointing to chest/heart area)
            - 'bones' (pointing to joints, back, leg, knee, arm, hand, bones)
            - 'eyes' (pointing to eyes)
            - 'fever' (general wellness, forehead, no specific part pointing)
            - 'dental' (pointing to mouth/teeth)
            - 'ent' (pointing to ears, nose, or throat)
            - 'stomach' (pointing to belly/stomach area)
            - 'neuro' (pointing to head/brain area for headaches/dizziness)
            - 'skin' (pointing to skin rashes/marks anywhere on body)

            AVAILABLE CLINICAL STAFF:
            ${input.staffList || "No specific staff list provided. Suggest a general specialty."}

            TASK:
            1. Identify the symptomId.
            2. Match it to a 'specialistType'.
            3. If a staff list is provided, find the best named doctor for that specialty.
            4. Provide a simple, comforting reason for an elderly person.
            ` },
            { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
        ],
        output: { schema: AIBodyPartDetectionOutputSchema },
    });
    return result.output!;
}
