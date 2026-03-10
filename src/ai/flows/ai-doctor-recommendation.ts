'use server';
/**
 * @fileOverview An AI agent that recommends specialist doctors based on patient symptoms.
 *
 * - aiDoctorRecommendation - A function that handles the AI doctor recommendation process.
 * - AIDoctorRecommendationInput - The input type for the aiDoctorRecommendation function.
 * - AIDoctorRecommendationOutput - The return type for the aiDoctorRecommendation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  try {
    return await aiDoctorRecommendationFlow(input);
  } catch (err) {
    console.warn("[AI:Fallback] Genkit flow failed, engaging Clinical Rule Engine fallback.");

    const s = input.symptoms.toLowerCase();

    // ── Clinical Rule Engine (Fallback) ──────────────────────────────────
    if (s.includes('heart') || s.includes('chest') || s.includes('palpitation') || s.includes('breathless')) {
      return { recommendedSpecialist: "Cardiology", reason: "Symptoms suggest potential cardiovascular involvement. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('throat') || s.includes('ear') || s.includes('nose') || s.includes('tonsil') || s.includes('sinus')) {
      return { recommendedSpecialist: "ENT", reason: "Keywords related to Ear, Nose, or Throat detected. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('stomach') || s.includes('gastric') || s.includes('acidity') || s.includes('digestion') || s.includes('belly')) {
      return { recommendedSpecialist: "Gastroenterology", reason: "Gastrointestinal symptoms identified. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('headache') || s.includes('brain') || s.includes('numb') || s.includes('seizure') || s.includes('migraine')) {
      return { recommendedSpecialist: "Neurology", reason: "Neurological indicators detected. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('eye') || s.includes('vision') || s.includes('sight') || s.includes('blur')) {
      return { recommendedSpecialist: "Ophthalmology", reason: "Ophthalmic symptoms identified. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('bone') || s.includes('joint') || s.includes('muscle') || s.includes('back') || s.includes('fracture')) {
      return { recommendedSpecialist: "Orthopedics", reason: "Orthopedic or musculoskeletal keywords found. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('kid') || s.includes('child') || s.includes('baby') || s.includes('pediatric')) {
      return { recommendedSpecialist: "Pediatrics", reason: "Pediatric age group or symptoms detected. Evaluated via Clinical Rule Engine (Backup)." };
    }
    if (s.includes('skin') || s.includes('rash') || s.includes('itch') || s.includes('acne')) {
      return { recommendedSpecialist: "Dermatology", reason: "Dermatological symptoms detected. Evaluated via Clinical Rule Engine (Backup)." };
    }

    // Final fallback
    return {
      recommendedSpecialist: "General Medicine",
      reason: "General health indicators detected. Starting with a General Physician is recommended for initial triage. (Fallback active)"
    };
  }
}

const prompt = ai.definePrompt({
  name: 'aiDoctorRecommendationPrompt',
  input: { schema: AIDoctorRecommendationInputSchema },
  output: { schema: AIDoctorRecommendationOutputSchema },
  prompt: `You are a clinical triage assistant for MediFlow Hospital. 
Analyze the patient symptoms and recommend the MOST appropriate medical specialist.

Available specialists (use EXACTLY these names):
- ENT (Ear, Nose & Throat specialist — for throat pain, sore throat, tonsil issues, ear pain, ear blockage, hearing loss, nasal congestion, sinusitis, voice hoarseness, neck swelling)
- Gastroenterology (for stomach pain, abdominal cramps, heartburn, acidity, gastric issues, nausea, vomiting, diarrhea, constipation, bloating, liver issues)
- Neurology (for headache, migraine, dizziness, vertigo, numbness, tingling, tremors, seizures, memory loss, nerve pain)
- Cardiology (for chest pain, heart palpitations, breathlessness, high blood pressure, irregular heartbeat, swollen legs)
- Ophthalmology (for eye pain, blurred vision, redness in eyes, watering eyes, eye irritation)
- Orthopedics (for joint pain, back pain, knee pain, fracture, muscle pain, bone pain, arthritis, spine issues)
- Dermatology (for skin rash, acne, eczema, itching, skin allergy, hair loss, fungal infection)
- Pediatrics (for issues specific to children under 14 years)
- General Medicine (for fever, cold, flu, cough, body ache, fatigue, weakness, general illness)

Critical Matching Rules (MUST follow exactly):
1. Throat pain, sore throat, throat irritation, tonsil swelling → ALWAYS recommend ENT
2. Ear pain, ear blockage, hearing issues, ear discharge → ALWAYS recommend ENT  
3. Stomach pain, abdominal pain, gastric trouble, indigestion → ALWAYS recommend Gastroenterology
4. Chest pain, heart palpitations → ALWAYS recommend Cardiology
5. Severe headache, dizziness, vertigo → ALWAYS recommend Neurology
6. Eye-related issues → ALWAYS recommend Ophthalmology
7. Joint/bone/muscle pain → ALWAYS recommend Orthopedics
8. Skin-related issues → ALWAYS recommend Dermatology
9. Fever, cough, cold (without other specific organ symptoms) → ALWAYS recommend General Medicine
10. Be very concise in your reason (1-2 sentences max).

Patient Symptoms: {{{symptoms}}}`,
});

const aiDoctorRecommendationFlow = ai.defineFlow(
  {
    name: 'aiDoctorRecommendationFlow',
    inputSchema: AIDoctorRecommendationInputSchema,
    outputSchema: AIDoctorRecommendationOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
