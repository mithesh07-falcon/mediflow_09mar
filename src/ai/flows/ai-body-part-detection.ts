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
                text: `Examine this image. An elderly patient is pointing to a body part.
            STRICT SPECIALTY MAPPING:
            - If pointing to HAND, LEG, BACK, KNEE, ARMS, or any JOINTS: YOU MUST USE 'bones' (Orthopedics). Dr. White should be suggested.
            - If pointing to EYES: YOU MUST USE 'eyes' (Ophthalmology). 
            - If pointing to MOUTH/TEETH: YOU MUST USE 'dental' (Dentistry). Dr. Wilson should be suggested.
            - If pointing to CHEST: YOU MUST USE 'heart' (Cardiology).
            - If pointing to EARS/NOSE/THROAT: YOU MUST USE 'ent'.
            - If pointing to BELLY: YOU MUST USE 'stomach' (Gastroenterology).
            - If pointing to HEAD: YOU MUST USE 'neuro' (Neurology).
            - If pointing to SKIN RASH: YOU MUST USE 'skin' (Dermatology). Dr. Miller should be suggested.
            - ONLY if they look generally unwell or point to forehead for fever: USE 'fever' (General). Dr. Taylor should be suggested.

            STRICT RULE: NEVER suggest "General Physician" or "General" if a specific body part is identified. Match the doctor exactly from this list if possible:
            ${input.staffList || "Dr. White (Orthopedics), Dr. Miller (Dermatology), Dr. Wilson (Dentistry), Dr. Taylor (General)"}

            TASK:
            1. Identified the specific body part.
            2. Force the mapping to the correct 'symptomId'.
            3. Find the matching doctor name from the list.
            4. Provide a simple, comforting reason.
            ` },
            { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
        ],
        output: { schema: AIBodyPartDetectionOutputSchema },
    });
    return result.output!;
}
