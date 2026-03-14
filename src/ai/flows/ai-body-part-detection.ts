'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIBodyPartDetectionInputSchema = z.object({
    imageBase64: z.string().describe('The base64 encoded image from the camera.'),
    voiceTranscript: z.string().optional().describe('The user\'s verbal description of symptoms (could be in Hindi, Telugu, Tamil).'),
    staffList: z.string().optional().describe('JSON string of available medical staff and their specialties.'),
});

const AIBodyPartDetectionOutputSchema = z.object({
    symptomId: z.enum(["heart", "bones", "eyes", "fever", "dental", "ent", "stomach", "neuro", "skin"]).describe('The closest matching symptom ID based on the body part detected.'),
    specialistType: z.string().describe('The name of the medical specialty (e.g. Cardiologist).'),
    predictedDoctorName: z.string().describe('The name of the specific doctor suggested from the staff list.'),
    reason: z.string().describe('A simple 1-sentence reason for the detection aimed at an elderly person.'),
    detectedSymptoms: z.array(z.string()).describe('A list of specific symptoms detected from the image or voice transcript (e.g. ["Redness", "Swelling", "Pain reported"]).'),
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
    try {
        const result = await ai.generate({
            prompt: [
                {
                    text: `You are an AI medical triage assistant for MediFlow Hospital.
An elderly patient has provided a voice note and an image. Your goal is to identify 
the medical concern, extract the explicit symptoms visually from the image or verbally from the voice transcript, and suggest the most relevant specialist.

STRICT MULTIMODAL RULES:
1. **VOICE IS PRIORITY**: The voice transcript is the most accurate source of symptoms. If the patient says "my eyes hurt" but shows a generic photo, map to "eyes".
2. **REGIONAL LANGUAGES**: The patient may speak in Hindi, Telugu, Tamil, Kannada, Bengali, or Marathi. Understand these regional terms (e.g., "dil" = heart, "pait" = stomach, "aankh" = eyes, "daant" = dental).
3. **IMAGE AS CONTEXT**: Use the image to extract visual symptoms like "Redness", "Swelling", "Bruising" or to confirm the body part if the voice is unclear.
4. **DOCTOR SELECTION**: Pick the BEST doctor name from the "Available Doctors" list whose specialty matches your determined specialty.
5. **DETECTED SYMPTOMS**: Provide a clear array of 2-3 specific symptoms you detected (e.g. ["Red swollen knee", "Reported pain"] or ["Rash on arm"]).

═══════════════ SYMPTOM ID MAPPING (MANDATORY) ════════════════
  "heart"   → Chest, Heart, Palpitations, "dil", "seena" → Specialist: Cardiology
  "bones"   → Joints, Knee, Back, Broken bone, "haddi", "dard" → Specialist: Orthopedics
  "eyes"    → Vision, Redness, Blur, "aankh", "nazar" → Specialist: Ophthalmology
  "dental"  → Mouth, Teeth, Jaw, "daant", "munh" → Specialist: Dentistry
  "ent"     → Ear, Nose, Throat, Hearing, "kaan", "naak", "gala" → Specialist: ENT
  "stomach" → Digestion, Acid, Pain in belly, "pait", "gas" → Specialist: Gastroenterology
  "neuro"   → Headache, Dizziness, Brain, "sar dard", "chakkar" → Specialist: Neurology
  "skin"    → Rash, Itching, Scars, "khujli", "chamdi" → Specialist: Dermatology
  "fever"   → Generic unwell, No specific area, Common cold → Specialist: General
════════════════════════════════════════════════════════════════

Available doctors (Select one whose specialty matches):
${input.staffList || "Dr. Brown (Cardiology), Dr. White (Orthopedics), Dr. Anderson (Ophthalmology), Dr. Wilson (Dentistry), Dr. Lee (ENT), Dr. Jones (Gastroenterology), Dr. Smith (Neurology), Dr. Miller (Dermatology), Dr. Taylor (General)"}

PATIENT VOICE NOTE: "${input.voiceTranscript || "No voice note provided."}"

Respond with:
- symptomId: one of the enum values
- specialistType: the specialty name
- predictedDoctorName: the matching doctor's FULL NAME from the list
- reason: A gentle, comforting 1-sentence explanation in the same language the patient spoke.
- detectedSymptoms: An array of strings describing the symptoms found.`
                },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
            ],
            output: { schema: AIBodyPartDetectionOutputSchema },
        });

        const output = result.output!;
        const transcript = (input.voiceTranscript || "").toLowerCase();

        // ── ROBUST KEYWORD OVERRIDE (Failsafe for AI) ─────────────────────────
        const overrides: Record<string, string[]> = {
            heart: ["heart", "chest", "dil", "seena", "beats"],
            bones: ["bone", "joint", "haddi", "knee", "back", "ghutna", "kamar"],
            eyes: ["eye", "vision", "aankh", "nazar", "chashma"],
            dental: ["tooth", "teeth", "gum", "daant", "munh"],
            ent: ["ear", "nose", "throat", "kaan", "naak", "gala"],
            stomach: ["stomach", "belly", "pait", "gas", "digestion"],
            neuro: ["headache", "brain", "sar", "head", "chakkar"],
            skin: ["skin", "rash", "itch", "chamdi", "khujli"]
        };

        for (const [id, keys] of Object.entries(overrides)) {
            if (keys.some(k => transcript.includes(k.toLowerCase()))) {
                if (output.symptomId === "fever" || output.symptomId !== id) {
                    console.log(`[AI:Override] Transcript "${transcript}" triggered ${id} override.`);
                    const entry = BODY_PART_MAP[id as keyof typeof BODY_PART_MAP];
                    return {
                        symptomId: entry.symptomId,
                        specialistType: entry.specialistType,
                        predictedDoctorName: findDoctorForSpec(entry.specKey, input.staffList),
                        reason: output.reason || entry.reason,
                        detectedSymptoms: output.detectedSymptoms?.length > 0 ? output.detectedSymptoms : entry.detectedSymptoms,
                    };
                }
            }
        }

        if (!input.staffList?.includes(output.predictedDoctorName)) {
            const specKey = BODY_PART_MAP[output.symptomId].specKey;
            output.predictedDoctorName = findDoctorForSpec(specKey, input.staffList);
        }

        return output;

    } catch (err) {
        console.warn("[AI:Fallback] Body part detection AI failed.", err);

        const nonFeverKeys = Object.keys(BODY_PART_MAP).filter(k => k !== "fever");
        const randomKey = nonFeverKeys[Math.floor(Math.random() * nonFeverKeys.length)];
        const fallback = BODY_PART_MAP[randomKey];

        return {
            symptomId: fallback.symptomId,
            specialistType: fallback.specialistType,
            predictedDoctorName: findDoctorForSpec(fallback.specKey, input.staffList),
            reason: fallback.reason + " (AI was unavailable; please verify manually.)",
            detectedSymptoms: fallback.detectedSymptoms,
        };
    }
}
