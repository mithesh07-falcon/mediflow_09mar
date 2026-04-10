'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIBodyPartDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
    voiceTranscript: z.string().optional().describe('The user\'s verbal description of symptoms (could be in Hindi, Telugu, Tamil).'),
    staffList: z.string().optional().describe('JSON string of available medical staff and their specialties.'),
});

const AIBodyPartDetectionOutputSchema = z.object({
    // --- Compatibility Fields (Keep for existing UI) ---
    symptomId: z.enum(["heart", "bones", "eyes", "fever", "dental", "ent", "stomach", "neuro", "skin"]).describe('The closest matching symptom ID based on the body part detected.'),
    specialistType: z.string().describe('The name of the medical specialty (e.g. Cardiologist).'),
    predictedDoctorName: z.string().describe('The name of the specific doctor suggested from the staff list.'),
    reason: z.string().describe('A simple 1-sentence reason for the detection aimed at an elderly person.'),
    detectedSymptoms: z.array(z.string()).describe('A list of specific symptoms detected.'),

    // --- New Requested AI Assistant Fields ---
    final_body_part: z.string(),
    pain_type: z.string(),
    severity: z.string(),
    duration: z.string(),
    onset: z.string(),
    triggers: z.string().nullable(),
    additional_symptoms: z.array(z.string()),
    risk_level: z.enum(["low", "medium", "high"]),
    emergency: z.boolean(),
    recommended_doctor: z.string(),
    confidence: z.number(),
    message: z.string(),
    next_step: z.string(),
    mismatch: z.boolean().describe('True if the visual pointing does not match the verbal description.'),
    warning: z.string().default("This is not a medical diagnosis. Please consult a doctor.")
});

export type AIBodyPartDetectionInput = z.infer<typeof AIBodyPartDetectionInputSchema>;
export type AIBodyPartDetectionOutput = z.infer<typeof AIBodyPartDetectionOutputSchema>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HARD-CODED SPECIALTY MAP — used both as the fallback AND to validate AI output
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BODY_PART_MAP: Record<string, {
    symptomId: "heart" | "bones" | "eyes" | "fever" | "dental" | "ent" | "stomach" | "neuro" | "skin";
    specialistType: string;
    specKey: string;         // matches specialization field in staff DB
    reason: string;
    detectedSymptoms: string[];
}> = {
    heart: {
        symptomId: "heart",
        specialistType: "Cardiologist",
        specKey: "Cardiology",
        reason: "We noticed you may be experiencing chest or heart-related discomfort. A heart specialist will take care of you.",
        detectedSymptoms: ["Chest discomfort", "Potential palpitations"],
    },
    bones: {
        symptomId: "bones",
        specialistType: "Orthopedic Surgeon",
        specKey: "Orthopedics",
        reason: "It looks like you have some bone, joint, or muscle pain. An orthopedic specialist can help.",
        detectedSymptoms: ["Joint pain", "Muscle stiffness"],
    },
    eyes: {
        symptomId: "eyes",
        specialistType: "Ophthalmologist",
        specKey: "Ophthalmology",
        reason: "We see you may have an eye-related concern. An eye specialist will check your vision.",
        detectedSymptoms: ["Eye irritation", "Possible vision fuzziness"],
    },
    dental: {
        symptomId: "dental",
        specialistType: "Dentist",
        specKey: "Dentistry",
        reason: "It seems like you have a dental concern. A dentist will help with your teeth and mouth.",
        detectedSymptoms: ["Toothache", "Gum discomfort"],
    },
    ent: {
        symptomId: "ent",
        specialistType: "ENT Specialist",
        specKey: "ENT",
        reason: "You may have an ear, nose, or throat issue. An ENT specialist will examine you.",
        detectedSymptoms: ["Throat irritation", "Ear discomfort"],
    },
    stomach: {
        symptomId: "stomach",
        specialistType: "Gastroenterologist",
        specKey: "Gastroenterology",
        reason: "You seem to have a stomach or digestive issue. A gastro specialist can help you feel better.",
        detectedSymptoms: ["Abdominal pain", "Digestive distress"],
    },
    neuro: {
        symptomId: "neuro",
        specialistType: "Neurologist",
        specKey: "Neurology",
        reason: "We noticed a potential head or brain-related concern. A neurologist will examine you carefully.",
        detectedSymptoms: ["Headache", "Dizziness reported"],
    },
    skin: {
        symptomId: "skin",
        specialistType: "Dermatologist",
        specKey: "Dermatology",
        reason: "You may have a skin condition or rash. A skin specialist will take a look.",
        detectedSymptoms: ["Skin rash", "Redness or irritation"],
    },
    fever: {
        symptomId: "fever",
        specialistType: "General Physician",
        specKey: "General",
        reason: "You seem to have a general illness like fever. A physician will check your overall health.",
        detectedSymptoms: ["Fever symptoms", "Fatigue"],
    },
};

type SymptomKey = keyof typeof BODY_PART_MAP;

const TRANSCRIPT_RULES: Record<SymptomKey, { strong: string[]; moderate: string[] }> = {
    heart: {
        strong: ["chest pain", "heart pain", "palpitation", "shortness of breath", "breathing problem", "angina"],
        moderate: ["heart", "chest", "dil", "seena", "bp high", "blood pressure"],
    },
    bones: {
        strong: ["joint pain", "knee pain", "back pain", "shoulder pain", "fracture", "swelling in joint"],
        moderate: ["bone", "joint", "haddi", "knee", "back", "shoulder", "muscle", "arthritis", "ortho"],
    },
    eyes: {
        strong: ["blurred vision", "eye pain", "cannot see", "vision loss"],
        moderate: ["eye", "vision", "aankh", "nazar", "sight", "blur"],
    },
    fever: {
        strong: ["high fever", "viral fever", "high temperature"],
        moderate: ["fever", "cold", "cough", "flu", "bukhaar", "sardi", "weakness", "infection"],
    },
    dental: {
        strong: ["tooth pain", "toothache", "gum bleeding", "jaw pain"],
        moderate: ["tooth", "teeth", "gum", "daant", "jaw", "oral"],
    },
    ent: {
        strong: ["ear pain", "sore throat", "blocked nose", "hearing loss"],
        moderate: ["ear", "nose", "throat", "kaan", "naak", "gala", "sinus", "ent"],
    },
    stomach: {
        strong: ["stomach pain", "abdominal pain", "severe acidity", "vomiting", "loose motion"],
        moderate: ["stomach", "belly", "pait", "digestion", "gas", "acid", "constipation", "diarrhea", "ulcer"],
    },
    neuro: {
        strong: ["severe headache", "one side weakness", "seizure", "cannot speak", "blackout"],
        moderate: ["headache", "brain", "head", "sar", "chakkar", "dizzy", "migraine", "numb", "nerve"],
    },
    skin: {
        strong: ["skin rash", "severe itching", "skin allergy", "red patches"],
        moderate: ["skin", "rash", "itch", "chamdi", "khujli", "allergy", "pimple", "boil"],
    },
};

const EMERGENCY_HINTS = [
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "fainting",
    "unconscious",
    "seizure",
    "slurred speech",
    "severe bleeding",
    "one side weakness",
];

const SPECIALTY_ALIASES: Record<string, string[]> = {
    Cardiology: ["cardiology", "cardiologist", "heart"],
    Orthopedics: ["orthopedics", "orthopedic", "bone", "joint", "ortho"],
    Ophthalmology: ["ophthalmology", "ophthalmologist", "eye"],
    Dentistry: ["dentistry", "dentist", "dental"],
    ENT: ["ent", "ear nose throat"],
    Gastroenterology: ["gastroenterology", "gastro", "stomach", "digestive"],
    Neurology: ["neurology", "neurologist", "brain", "nerve"],
    Dermatology: ["dermatology", "dermatologist", "skin"],
    General: ["general", "general medicine", "general physician", "physician"],
};

function inferBodyPartFromTranscript(transcript: string): { id: SymptomKey; score: number } | null {
    if (!transcript.trim()) return null;

    let best: { id: SymptomKey; score: number } | null = null;
    let secondBest = 0;

    for (const [id, rules] of Object.entries(TRANSCRIPT_RULES) as [SymptomKey, { strong: string[]; moderate: string[] }][]) {
        let score = 0;
        rules.strong.forEach((keyword) => {
            if (transcript.includes(keyword)) score += 3;
        });
        rules.moderate.forEach((keyword) => {
            if (transcript.includes(keyword)) score += 1;
        });

        if (!best || score > best.score) {
            secondBest = best?.score || 0;
            best = { id, score };
        } else if (score > secondBest) {
            secondBest = score;
        }
    }

    // Reject low-signal or near-tie outcomes to avoid false overrides.
    if (!best || best.score < 2 || best.score - secondBest <= 1) return null;
    return best;
}

function normalizeSpec(spec: string): string {
    const normalized = (spec || "").toLowerCase().trim();
    for (const [canonical, aliases] of Object.entries(SPECIALTY_ALIASES)) {
        if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
            return canonical;
        }
    }
    return spec;
}

/**
 * Find the best doctor name from the staff list for a given specialty key.
 */
function findDoctorForSpec(specKey: string, staffJson?: string): string {
    const defaultDoctors: Record<string, string> = {
        "Cardiology": "Dr. Brown",
        "Orthopedics": "Dr. White",
        "Ophthalmology": "Dr. Anderson",
        "Dentistry": "Dr. Wilson",
        "ENT": "Dr. Lee",
        "Gastroenterology": "Dr. Jones",
        "Neurology": "Dr. Smith",
        "Dermatology": "Dr. Miller",
        "General": "Dr. Taylor",
    };

    if (staffJson) {
        try {
            const staffList: { name: string; spec?: string; specialization?: string }[] = JSON.parse(staffJson);
            const target = normalizeSpec(specKey);

            const match = staffList.find((s) => {
                const rawSpec = s.spec || s.specialization || "";
                return normalizeSpec(rawSpec) === target;
            });

            if (match) return match.name;

            const looseMatch = staffList.find((s) => {
                const rawSpec = (s.spec || s.specialization || "").toLowerCase();
                return rawSpec.includes(target.toLowerCase());
            });
            if (looseMatch) return looseMatch.name;
        } catch { /* ignore parse errors */ }
    }

    const normalized = normalizeSpec(specKey);
    return defaultDoctors[normalized] || "Dr. Taylor";
}

export async function detectBodyPart(input: AIBodyPartDetectionInput): Promise<AIBodyPartDetectionOutput> {
    const transcript = (input.voiceTranscript || "").toLowerCase();
    const transcriptInference = inferBodyPartFromTranscript(transcript);
    const hasEmergencyHint = EMERGENCY_HINTS.some((keyword) => transcript.includes(keyword));

    try {
        const result = await ai.generate({
            prompt: [
                {
                    text: `You are an AI medical assistant designed specifically for elderly users. 
Your job is NOT to diagnose diseases. 
Your task is to understand user symptoms, combine it with the detected body part from the image, and provide a structured elderly-friendly response.

ELDER CONSIDERATIONS:
- Users may describe symptoms vaguely.
- Do not assume missing details.
- If unclear, use "unknown".
- Use very simple English, short sentences, and a calm tone.

STEP 1: EXTRACT STRUCTURED SYMPTOMS:
- body_part (prefer image if conflict)
- pain_type (sharp, dull, burning, pressure, unknown)
- severity (mild, moderate, severe, unknown)
- duration (minutes, hours, days, long-term, unknown)
- onset (sudden, gradual, unknown)
- triggers (or null)
- additional_symptoms (list)
- risk_flags (chest pain, breathing difficulty, dizziness, bleeding, confusion, weakness)

STEP 2: DETERMINE RISK LEVEL:
- HIGH → chest pain, breathing difficulty, fainting, severe symptoms
- MEDIUM → persistent or moderate symptoms
- LOW → mild/general symptoms

STEP 3: CROSS-VALIDATION (STRICT MATCH):
Compare the body part pointed at in the image with the body part described in the voice transcript.
- If the user points to their eye but says "my stomach hurts", set "mismatch": true.
- If the user points to their chest but says "I have ear pain", set "mismatch": true.
- If they match or the user doesn't specify a body part verbally, set "mismatch": false.
- If mismatch is true, your "message" should gently ask the user to clarify or try again because the pointing and description don't match.
- If mismatch is true, DO NOT stop the scan yet, but tell the user to point clearly.

STEP 4: SUGGEST DOCTOR (ONLY IF NO MISMATCH):
- heart, chest pain → Cardiologist
- stomach, stomach pain, digestion → Gastroenterologist
- bones, joints, leg pain, shoulder pain → Orthopedic
- head, headache, brain, nerves → Neurologist
- skin, rash, itching → Dermatologist
- eyes, vision, eye pain → Ophthalmologist
- dental, tooth, gum → Dentist
- ent, ear pain, nose, throat → ENT Specialist
- fever, cold, cough, general weakness → General Physician
- CLEAR EMERGENCY (chest pain, breathing) or unclear → General Physician or Emergency

STEP 4: DOCTOR MATCHING (INTERNAL):
Pick the BEST doctor name from the "Available Doctors" list whose specialty matches your determined specialty.
- Available Doctors: ${input.staffList || "Dr. Brown (Cardiology), Dr. Patel (Dermatology), Dr. Singh (Orthopedics), Dr. Reddy (Neurology), Dr. White (Orthopedics), Dr. Anderson (Ophthalmology), Dr. Wilson (Dentistry), Dr. Lee (ENT), Dr. Jones (Gastroenterology), Dr. Taylor (General)"}

MAPPING FOR SYSTEM COMPATIBILITY:
- symptomId: Map the determined body part/specialty to one of: ["heart", "bones", "eyes", "fever", "dental", "ent", "stomach", "neuro", "skin"]
- specialistType: The determined doctor type
- predictedDoctorName: The doctor's full name from the list
- reason: The "message" field you generate
- detectedSymptoms: The "additional_symptoms" list

INPUT:
User text: "${input.voiceTranscript || "No description provided."}"

(The user has pointed their finger in the image to show where it hurts.)`
                },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
            ],
            output: { schema: AIBodyPartDetectionOutputSchema },
        });

        const output = result.output!;

        const aiSymptom = (output.symptomId || "fever") as SymptomKey;
        const aiConfidence = Number.isFinite(output.confidence) ? output.confidence : 0.5;
        const aiLooksGeneric = aiSymptom === "fever" || /general/i.test(output.specialistType || "");

        let finalSymptom: SymptomKey = aiSymptom;
        if (transcriptInference) {
            const shouldOverrideWithRules = aiLooksGeneric || aiConfidence < 0.7 || transcriptInference.id !== aiSymptom;
            if (shouldOverrideWithRules && transcriptInference.score >= 3) {
                finalSymptom = transcriptInference.id;
            }
        }

        const mapped = BODY_PART_MAP[finalSymptom];
        output.symptomId = mapped.symptomId;
        output.specialistType = mapped.specialistType;
        output.recommended_doctor = mapped.specialistType;
        output.predictedDoctorName = findDoctorForSpec(mapped.specKey, input.staffList);
        output.confidence = Math.max(0, Math.min(1, Number(output.confidence || 0.6)));

        if (hasEmergencyHint) {
            output.risk_level = "high";
            output.emergency = true;
            if (!output.next_step?.trim()) {
                output.next_step = "Seek emergency care immediately.";
            }
        }

        if (!output.reason?.trim()) output.reason = mapped.reason;
        if (!output.message?.trim()) output.message = mapped.reason;
        if (!Array.isArray(output.detectedSymptoms) || output.detectedSymptoms.length === 0) {
            output.detectedSymptoms = mapped.detectedSymptoms;
        }

        return output;

    } catch (err: any) {
        console.error("CRITICAL: AI body part detection failed.", {
            message: err?.message,
            stack: err?.stack,
            error: err
        });
        const fallbackId: SymptomKey = transcriptInference?.id || "fever";
        const entry = BODY_PART_MAP[fallbackId];
        const fallbackEmergency = hasEmergencyHint;
        
        return {
            symptomId: entry.symptomId,
            specialistType: entry.specialistType,
            predictedDoctorName: findDoctorForSpec(entry.specKey, input.staffList),
            reason: entry.reason + " (AI unavailable)",
            detectedSymptoms: ["Manual detection"],
            final_body_part: fallbackId,
            pain_type: "unknown",
            severity: "unknown",
            duration: "unknown",
            onset: "unknown",
            triggers: null,
            additional_symptoms: [],
            risk_level: fallbackEmergency ? "high" : "low",
            emergency: fallbackEmergency,
            recommended_doctor: entry.specialistType,
            confidence: 0.5,
            message: entry.reason,
            next_step: fallbackEmergency ? "Seek emergency care immediately." : "Please consult a general physician.",
            mismatch: false,
            warning: "This is not a medical diagnosis. Please consult a doctor."
        };
    }
}

