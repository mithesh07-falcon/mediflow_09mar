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
            const staffList: { name: string; spec: string }[] = JSON.parse(staffJson);
            const match = staffList.find(
                (s) => s.spec?.toLowerCase().trim() === specKey.toLowerCase().trim()
            );
            if (match) return match.name;
        } catch { /* ignore parse errors */ }
    }

    return defaultDoctors[specKey] || "Dr. Taylor";
}

export async function detectBodyPart(input: AIBodyPartDetectionInput): Promise<AIBodyPartDetectionOutput> {
    const transcript = (input.voiceTranscript || "").toLowerCase();
    
    // ── ROBUST KEYWORD OVERRIDE (Failsafe for AI quota/errors) ──────────────
    const overrides: Record<string, string[]> = {
        heart: ["heart", "chest", "chest pain", "dil", "seena", "beats", "palpitation", "high blood pressure", "heart pain", "cardio", "breathing"],
        bones: ["bone", "joint", "haddi", "knee", "back", "ghutna", "kamar", "muscle", "pain", "leg pain", "joint pains", "legs", "hands", "walking", "stiff", "arthritis", "fracture", "shoulder", "ortho"],
        eyes: ["eye", "vision", "aankh", "nazar", "chashma", "blur", "eye pain", "red eye", "sight", "ophthal", "blind", "seeing"],
        dental: ["tooth", "teeth", "gum", "daant", "munh", "jaw", "toothache", "dentist", "oral", "cavity"],
        ent: ["ear", "nose", "throat", "kaan", "naak", "gala", "hearing", "kan", "ear pain", "sinus", "nasal", "deaf", "sore throat"],
        stomach: ["stomach", "belly", "pait", "gas", "digestion", "acid", "stomach pain", "constipation", "diarrhea", "vomit", "ulcer", "gastric"],
        neuro: ["headache", "brain", "sar", "head", "chakkar", "dizzy", "migraine", "nerve", "numb", "seizure", "shaking", "memory"],
        skin: ["skin", "rash", "itch", "chamdi", "khujli", "scar", "allergy", "dermat", "pimple", "boil"],
        fever: ["fever", "cold", "bukhaar", "sardi", "cough", "flu", "tiredness", "weakness", "infection", "medicine", "feverish", "high temperature"]
    };

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

        // ── ROBUST KEYWORD OVERRIDE (Failsafe for AI) ─────────────────────────
        for (const [id, keys] of Object.entries(overrides)) {
            if (keys.some(k => transcript.includes(k.toLowerCase()))) {
                if (output.symptomId === "fever" || output.symptomId !== id) {
                    console.log(`[AI:Override] Transcript "${transcript}" triggered ${id} override.`);
                    const entry = BODY_PART_MAP[id as keyof typeof BODY_PART_MAP];
                    output.symptomId = entry.symptomId;
                    output.specialistType = entry.specialistType;
                    output.predictedDoctorName = findDoctorForSpec(entry.specKey, input.staffList);
                }
            }
        }

        if (!input.staffList?.includes(output.predictedDoctorName)) {
            const specKey = BODY_PART_MAP[output.symptomId].specKey;
            output.predictedDoctorName = findDoctorForSpec(specKey, input.staffList);
        }

        return output;

    } catch (err: any) {
        console.error("CRITICAL: AI body part detection failed.", {
            message: err?.message,
            stack: err?.stack,
            error: err
        });
        // Fallback logic remains similar but adapted to the new schema
        const fallbackId = transcript.includes("chest") ? "heart" : transcript.includes("stomach") ? "stomach" : "fever";
        const entry = BODY_PART_MAP[fallbackId as keyof typeof BODY_PART_MAP];
        
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
            risk_level: "low",
            emergency: false,
            recommended_doctor: entry.specialistType,
            confidence: 0.5,
            message: entry.reason,
            next_step: "Please consult a general physician.",
            mismatch: false,
            warning: "This is not a medical diagnosis. Please consult a doctor."
        };
    }
}

