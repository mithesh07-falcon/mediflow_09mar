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
  risk_level: z.enum(["low", "medium", "high"]),
  emergency: z.boolean(),
  detectedSymptoms: z.array(z.string()),
  next_step: z.string(),
  suggestedAction: z.string().describe('A clear action for the patient to take.'),
});
export type AIDoctorRecommendationOutput = z.infer<typeof AIDoctorRecommendationOutputSchema>;

export async function aiDoctorRecommendation(input: AIDoctorRecommendationInput): Promise<AIDoctorRecommendationOutput> {
  try {
    return await aiDoctorRecommendationFlow(input);
  } catch (err) {
    console.warn("[AI:Fallback] Genkit flow failed, engaging Clinical Rule Engine fallback.");

    const s = input.symptoms.toLowerCase();

    // ── Clinical Rule Engine (Fallback) ──────────────────────────────────
    if (s.includes('heart') || s.includes('chest') || s.includes('palpitation') || s.includes('breathless') || s.includes('dil')) {
      return { 
        recommendedSpecialist: "Cardiology", 
        reason: "Potential cardiovascular concern (Backup logic).",
        risk_level: "high",
        emergency: s.includes('chest pain'),
        detectedSymptoms: ["Chest discomfort"],
        next_step: "Schedule an appointment with a Cardiologist.",
        suggestedAction: "Monitor your heart rate and seek immediate help if pain persists."
      };
    }
    if (s.includes('throat') || s.includes('ear') || s.includes('nose') || s.includes('tonsil') || s.includes('sinus') || s.includes('kaan') || s.includes('naak') || s.includes('gala')) {
      return { 
        recommendedSpecialist: "ENT", 
        reason: "ENT related symptoms detected (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["Ear/Nose/Throat discomfort"],
        next_step: "Book an appointment with an ENT specialist.",
        suggestedAction: "Avoid cold items and rest your throat."
      };
    }
    // Cardiology / Heart related (Added many keywords for heart and chest pain)
    if (s.includes('heart') || s.includes('chest') || s.includes('dil') || s.includes('seena') || s.includes('palpitation') || s.includes('beats') || s.includes('high blood pressure') || s.includes('breathing') || s.includes('cardio')) {
      return { 
        recommendedSpecialist: "Cardiology", 
        reason: "Cardiac or chest discomfort detected (Backup logic). Urgent attention may be needed.",
        risk_level: "high",
        emergency: s.includes('chest') || s.includes('breathing'),
        detectedSymptoms: ["Chest/Heart related concern"],
        next_step: "Call emergency or consult a Cardiologist immediately.",
        suggestedAction: "Sit down, rest, and keep breathing steady."
      };
    }

    // Gastroenterology / Stomach related (Added acidic, vomiting, etc.)
    if (s.includes('stomach') || s.includes('gastric') || s.includes('acidity') || s.includes('digestion') || s.includes('pait') || s.includes('vomit') || s.includes('ulcer') || s.includes('abdominal')) {
      return { 
        recommendedSpecialist: "Gastroenterology", 
        reason: "Gastrointestinal symptoms identified (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["Abdominal discomfort"],
        next_step: "Consult a Gastroenterologist.",
        suggestedAction: "Drink water and avoid spicy food."
      };
    }

    // Neurology / Headache related (Added nerve, numb, dizzy)
    if (s.includes('headache') || s.includes('brain') || s.includes('numb') || s.includes('seizure') || s.includes('migraine') || s.includes('sar') || s.includes('dizzy') || s.includes('nerve')) {
      return { 
        recommendedSpecialist: "Neurology", 
        reason: "Neurological or nerve-related concern identified (Backup logic).",
        risk_level: "high",
        emergency: s.includes('seizure') || s.includes('numb'),
        detectedSymptoms: ["Neurological symptoms"],
        next_step: "Consult a Neurologist.",
        suggestedAction: "Avoid bright lights and rest."
      };
    }

    // Ophthalmology / Eye related
    if (s.includes('eye') || s.includes('vision') || s.includes('sight') || s.includes('blur') || s.includes('aankh') || s.includes('ophthal')) {
      return { 
        recommendedSpecialist: "Ophthalmology", 
        reason: "Visual symptoms identified (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["Eye discomfort"],
        next_step: "See an eye specialist.",
        suggestedAction: "Rest your eyes."
      };
    }

    // Orthopedics / Bone & Joint related (Added leg pain, joint pains, back, shoulder)
    if (s.includes('bone') || s.includes('joint') || s.includes('muscle') || s.includes('back') || s.includes('haddi') || s.includes('knee') || s.includes('leg') || s.includes('hand') || s.includes('shoulder')) {
      return { 
        recommendedSpecialist: "Orthopedics", 
        reason: "Bone, joint, or musculoskeletal concern identified (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["Musculoskeletal pain"],
        next_step: "Consult an Orthopedic doctor.",
        suggestedAction: "Apply support to the painful area."
      };
    }

    // ENT / Ear, Nose, Throat related (Added ear pain, deaf, throat)
    if (s.includes('ear') || s.includes('nose') || s.includes('throat') || s.includes('kaan') || s.includes('naak') || s.includes('gala') || s.includes('sinus')) {
      return { 
          recommendedSpecialist: "ENT", 
          reason: "Ear, nose, or throat symptoms identified (Backup logic).",
          risk_level: "medium",
          emergency: false,
          detectedSymptoms: ["ENT concern"],
          next_step: "Visit an ENT specialist.",
          suggestedAction: "Avoid cold items."
      };
    }
    if (s.includes('kid') || s.includes('child') || s.includes('baby') || s.includes('pediatric')) {
      return { 
        recommendedSpecialist: "Pediatrics", 
        reason: "Pediatric age group detected (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["Pediatric symptoms"],
        next_step: "Visit a Pediatrician.",
        suggestedAction: "Ensure the child is comfortable and monitor temperature."
      };
    }
    if (s.includes('skin') || s.includes('rash') || s.includes('itch') || s.includes('acne') || s.includes('chamdi') || s.includes('khujli')) {
      return { 
        recommendedSpecialist: "Dermatology", 
        reason: "Dermatological symptoms detected (Backup logic).",
        risk_level: "low",
        emergency: false,
        detectedSymptoms: ["Skin related symptoms"],
        next_step: "Book a consultation with a Dermatologist.",
        suggestedAction: "Avoid scratching and apply soothing lotion."
      };
    }
    if (s.includes('fever') || s.includes('cold') || s.includes('bukhaar') || s.includes('sardi') || s.includes('cough') || s.includes('flu')) {
      return { 
        recommendedSpecialist: "General Medicine", 
        reason: "Symptoms of general illness/infection (Backup logic).",
        risk_level: "medium",
        emergency: false,
        detectedSymptoms: ["General symptoms"],
        next_step: "Visit a General Physician.",
        suggestedAction: "Take rest and monitor your symptoms."
      };
    }

    // Final fallback
    return {
      recommendedSpecialist: "General Medicine",
      reason: "General health concerns. Please start with a General Physician for initial triage. (Backup active)",
      risk_level: "low",
      emergency: false,
      detectedSymptoms: [],
      next_step: "Consult a General Physician.",
      suggestedAction: "Monitor your health and consult a professional if symptoms worsen."
    };
  }
}

const prompt = ai.definePrompt({
  name: 'aiDoctorRecommendationPrompt',
  input: { schema: AIDoctorRecommendationInputSchema },
  output: { schema: AIDoctorRecommendationOutputSchema },
  prompt: `You are a clinical triage assistant for MediFlow Hospital. 
Analyze the symptoms provided and perform a structured assessment.

Available specialists:
- ENT (Ear, Nose & Throat)
- Gastroenterology (Stomach, Digestion)
- Neurology (Headache, Brain, Nerves)
- Cardiology (Heart, Chest Pain, BP)
- Ophthalmology (Eyes, Vision)
- Orthopedics (Joints, Bones, Pain)
- Dermatology (Skin, Rashes)
- Pediatrics (Children under 14)
- General Medicine (General Illness)

ASSESSMENT STEPS:
1. Identify all core symptoms.
2. Determine Risk Level:
   - HIGH: Chest pain, severe difficulty breathing, sudden slurring, fainting, or intense pain.
   - MEDIUM: Persistent pain, rising fever, or chronic discomfort.
   - LOW: Mild cold, temporary headache, or minor aches.
3. Identify if it is an EMERGENCY.
4. Recommend the best specialist from the list.

Patient Symptoms: {{{symptoms}}}
`,
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
