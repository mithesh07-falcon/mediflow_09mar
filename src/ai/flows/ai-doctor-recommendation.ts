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

const SPECIALISTS = [
  "ENT",
  "Gastroenterology",
  "Neurology",
  "Cardiology",
  "Ophthalmology",
  "Orthopedics",
  "Dermatology",
  "Pediatrics",
  "General Medicine",
] as const;

type Specialist = typeof SPECIALISTS[number];

const SPECIALIST_ALIASES: Record<Specialist, string[]> = {
  "ENT": ["ent", "ear nose throat", "otolaryngology"],
  "Gastroenterology": ["gastro", "gastroenterology", "stomach", "digestive"],
  "Neurology": ["neurology", "neuro", "brain", "nerves"],
  "Cardiology": ["cardiology", "cardio", "heart"],
  "Ophthalmology": ["ophthalmology", "eye", "vision"],
  "Orthopedics": ["orthopedics", "orthopedic", "ortho", "bones", "joints"],
  "Dermatology": ["dermatology", "derma", "skin"],
  "Pediatrics": ["pediatrics", "pediatric", "child", "baby"],
  "General Medicine": ["general", "general medicine", "general physician", "physician"],
};

const EMERGENCY_TERMS = [
  "chest pain",
  "severe chest pain",
  "difficulty breathing",
  "shortness of breath",
  "fainting",
  "unconscious",
  "slurred speech",
  "one side weakness",
  "seizure",
  "severe bleeding",
];

const RULES: Record<Specialist, { strong: string[]; moderate: string[]; reason: string; next: string; action: string; defaultSymptoms: string[] }> = {
  "Cardiology": {
    strong: ["chest pain", "heart pain", "palpitation", "shortness of breath", "breathless"],
    moderate: ["heart", "chest", "dil", "seena", "blood pressure", "cardio"],
    reason: "Symptoms suggest a cardiovascular concern that should be reviewed by a heart specialist.",
    next: "Consult a Cardiologist as soon as possible.",
    action: "Rest, avoid exertion, and seek urgent help if pain worsens.",
    defaultSymptoms: ["Chest discomfort"],
  },
  "ENT": {
    strong: ["ear pain", "sore throat", "blocked nose", "hearing loss"],
    moderate: ["ear", "nose", "throat", "kaan", "naak", "gala", "sinus"],
    reason: "Your symptoms match an ear, nose, or throat condition.",
    next: "Book an appointment with an ENT specialist.",
    action: "Hydrate well and avoid very cold foods until evaluation.",
    defaultSymptoms: ["Ear/Nose/Throat discomfort"],
  },
  "Gastroenterology": {
    strong: ["stomach pain", "abdominal pain", "vomiting", "severe acidity", "bloating"],
    moderate: ["stomach", "gastric", "digestion", "pait", "acid", "ulcer", "constipation", "diarrhea"],
    reason: "Symptoms are consistent with a digestive or stomach-related issue.",
    next: "Consult a Gastroenterologist.",
    action: "Drink water and avoid spicy or oily food until consultation.",
    defaultSymptoms: ["Abdominal discomfort"],
  },
  "Neurology": {
    strong: ["seizure", "one side weakness", "severe headache", "blackout"],
    moderate: ["headache", "brain", "numb", "migraine", "sar", "dizzy", "nerve"],
    reason: "Symptoms indicate a possible neurological concern.",
    next: "Consult a Neurologist.",
    action: "Rest in a calm place and seek urgent care for sudden worsening.",
    defaultSymptoms: ["Neurological symptoms"],
  },
  "Ophthalmology": {
    strong: ["blurred vision", "eye pain", "vision loss"],
    moderate: ["eye", "vision", "sight", "blur", "aankh", "ophthal"],
    reason: "Symptoms point to an eye or vision-related issue.",
    next: "Consult an Ophthalmologist.",
    action: "Reduce screen exposure and avoid rubbing your eyes.",
    defaultSymptoms: ["Eye discomfort"],
  },
  "Orthopedics": {
    strong: ["joint pain", "knee pain", "back pain", "shoulder pain", "fracture"],
    moderate: ["bone", "joint", "muscle", "back", "haddi", "knee", "leg", "shoulder", "ortho"],
    reason: "Symptoms suggest a bone, joint, or musculoskeletal condition.",
    next: "Consult an Orthopedic specialist.",
    action: "Rest the affected area and avoid heavy movement.",
    defaultSymptoms: ["Musculoskeletal pain"],
  },
  "Dermatology": {
    strong: ["skin rash", "severe itching", "allergic rash"],
    moderate: ["skin", "rash", "itch", "acne", "chamdi", "khujli"],
    reason: "Your symptoms indicate a skin-related condition.",
    next: "Consult a Dermatologist.",
    action: "Avoid scratching and keep the area clean and dry.",
    defaultSymptoms: ["Skin irritation"],
  },
  "Pediatrics": {
    strong: ["child has", "baby has"],
    moderate: ["kid", "child", "baby", "pediatric"],
    reason: "Symptoms appear to be for a child and should be handled by a pediatric specialist.",
    next: "Consult a Pediatrician.",
    action: "Monitor temperature and hydration closely.",
    defaultSymptoms: ["Pediatric symptoms"],
  },
  "General Medicine": {
    strong: ["high fever", "persistent fever"],
    moderate: ["fever", "cold", "cough", "flu", "weakness", "infection", "bukhaar", "sardi"],
    reason: "Symptoms require initial triage by a General Physician.",
    next: "Consult a General Physician.",
    action: "Rest, hydrate, and monitor symptoms.",
    defaultSymptoms: ["General symptoms"],
  },
};

function normalizeSpecialist(raw: string): Specialist {
  const value = (raw || "").toLowerCase().trim();
  for (const specialist of SPECIALISTS) {
    if (value === specialist.toLowerCase()) return specialist;
    const aliases = SPECIALIST_ALIASES[specialist];
    if (aliases.some((alias) => value === alias || value.includes(alias))) return specialist;
  }
  return "General Medicine";
}

function buildRuleBasedRecommendation(symptoms: string): AIDoctorRecommendationOutput {
  const s = (symptoms || "").toLowerCase();
  const emergency = EMERGENCY_TERMS.some((term) => s.includes(term));

  let best: { specialist: Specialist; score: number; hits: string[] } = {
    specialist: "General Medicine",
    score: 0,
    hits: [],
  };
  let second = 0;

  for (const specialist of SPECIALISTS) {
    const rules = RULES[specialist];
    let score = 0;
    const hits: string[] = [];

    rules.strong.forEach((k) => {
      if (s.includes(k)) {
        score += 3;
        hits.push(k);
      }
    });
    rules.moderate.forEach((k) => {
      if (s.includes(k)) {
        score += 1;
        hits.push(k);
      }
    });

    if (score > best.score) {
      second = best.score;
      best = { specialist, score, hits };
    } else if (score > second) {
      second = score;
    }
  }

  // Avoid incorrect specialty when signal is weak or ambiguous.
  const ambiguous = best.score < 2 || best.score - second <= 1;
  const selected: Specialist = ambiguous ? "General Medicine" : best.specialist;
  const selectedRules = RULES[selected];
  const detected = best.hits.length ? best.hits.slice(0, 4) : selectedRules.defaultSymptoms;

  let risk: "low" | "medium" | "high" = "low";
  if (emergency) risk = "high";
  else if (best.score >= 4) risk = "medium";
  else if (selected === "General Medicine") risk = "low";
  else risk = "medium";

  return {
    recommendedSpecialist: selected,
    reason: selectedRules.reason,
    risk_level: risk,
    emergency,
    detectedSymptoms: detected,
    next_step: emergency ? "Seek emergency care immediately or call emergency services." : selectedRules.next,
    suggestedAction: emergency ? "Do not delay. Go to the nearest emergency department now." : selectedRules.action,
  };
}

function shouldPreferRuleOutput(aiOutput: AIDoctorRecommendationOutput, ruleOutput: AIDoctorRecommendationOutput): boolean {
  const aiSpecialist = normalizeSpecialist(aiOutput.recommendedSpecialist);
  const ruleSpecialist = normalizeSpecialist(ruleOutput.recommendedSpecialist);
  const aiIsGeneric = aiSpecialist === "General Medicine";
  const ruleIsSpecific = ruleSpecialist !== "General Medicine";
  const aiMissingCore = !aiOutput.reason?.trim() || !aiOutput.next_step?.trim() || !aiOutput.suggestedAction?.trim();
  const criticalConflict = ruleOutput.emergency && !aiOutput.emergency;
  const mismatchOnStrongSignals = ruleIsSpecific && aiSpecialist !== ruleSpecialist && ruleOutput.detectedSymptoms.length > 0;

  return aiMissingCore || criticalConflict || (aiIsGeneric && ruleIsSpecific) || mismatchOnStrongSignals;
}

export async function aiDoctorRecommendation(input: AIDoctorRecommendationInput): Promise<AIDoctorRecommendationOutput> {
  const ruleOutput = buildRuleBasedRecommendation(input.symptoms);

  try {
    const aiOutput = await aiDoctorRecommendationFlow(input);
    const normalizedAi: AIDoctorRecommendationOutput = {
      ...aiOutput,
      recommendedSpecialist: normalizeSpecialist(aiOutput.recommendedSpecialist),
    };

    if (shouldPreferRuleOutput(normalizedAi, ruleOutput)) {
      return {
        ...ruleOutput,
        reason: `${ruleOutput.reason} (rule-verified)`
      };
    }

    // Merge with rule safety defaults for stability.
    return {
      ...normalizedAi,
      emergency: normalizedAi.emergency || ruleOutput.emergency,
      risk_level: (normalizedAi.emergency || ruleOutput.emergency) ? "high" : normalizedAi.risk_level,
      detectedSymptoms: normalizedAi.detectedSymptoms?.length ? normalizedAi.detectedSymptoms : ruleOutput.detectedSymptoms,
      next_step: normalizedAi.next_step?.trim() ? normalizedAi.next_step : ruleOutput.next_step,
      suggestedAction: normalizedAi.suggestedAction?.trim() ? normalizedAi.suggestedAction : ruleOutput.suggestedAction,
      reason: normalizedAi.reason?.trim() ? normalizedAi.reason : ruleOutput.reason,
    };
  } catch (err) {
    console.warn("[AI:Fallback] Genkit flow failed, engaging Clinical Rule Engine fallback.");
    return {
      ...ruleOutput,
      reason: `${ruleOutput.reason} (backup active)`
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

IMPORTANT FORMAT RULES:
- recommendedSpecialist must be EXACTLY one from this list:
  ENT | Gastroenterology | Neurology | Cardiology | Ophthalmology | Orthopedics | Dermatology | Pediatrics | General Medicine
- Keep reason under 2 sentences.
- Keep suggestedAction concise and actionable.

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
