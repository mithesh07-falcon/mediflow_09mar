'use server';
/**
 * @fileOverview An AI agent that recommends specialist doctors based on patient symptoms.
 *
 * - aiDoctorRecommendation - A function that handles the AI doctor recommendation process.
 * - AIDoctorRecommendationInput - The input type for the aiDoctorRecommendation function.
 * - AIDoctorRecommendationOutput - The return type for the aiDoctorRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDoctorRecommendationInputSchema = z.object({
  symptoms: z.string().describe('A detailed description of the patient\'s symptoms.'),
});
export type AIDoctorRecommendationInput = z.infer<typeof AIDoctorRecommendationInputSchema>;

const AIDoctorRecommendationOutputSchema = z.object({
  recommendedSpecialist: z.string().describe('The name of the recommended specialist doctor.'),
  reason: z.string().describe('A brief explanation for the recommendation.'),
});
export type AIDoctorRecommendationOutput = z.infer<typeof AIDoctorRecommendationOutputSchema>;

export async function aiDoctorRecommendation(input: AIDoctorRecommendationInput): Promise<AIDoctorRecommendationOutput> {
  return aiDoctorRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDoctorRecommendationPrompt',
  input: {schema: AIDoctorRecommendationInputSchema},
  output: {schema: AIDoctorRecommendationOutputSchema},
  prompt: `You are a helpful medical assistant. Based on the patient's symptoms, recommend the most appropriate specialist doctor.
Explain the reason for your recommendation briefly.

Symptoms: {{{symptoms}}}`,
});

const aiDoctorRecommendationFlow = ai.defineFlow(
  {
    name: 'aiDoctorRecommendationFlow',
    inputSchema: AIDoctorRecommendationInputSchema,
    outputSchema: AIDoctorRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
