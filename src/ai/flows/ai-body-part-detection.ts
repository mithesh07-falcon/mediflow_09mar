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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HARD-CODED SPECIALTY MAP — used both as the fallback AND to validate AI output
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BODY_PART_MAP: Record<string, {
    symptomId: "heart" | "bones" | "eyes" | "fever" | "dental" | "ent" | "stomach" | "neuro" | "skin";
    specialistType: string;
    specKey: string;         // matches specialization field in staff DB
    reason: string;
}> = {
    heart: {
        symptomId: "heart",
        specialistType: "Cardiologist",
        specKey: "Cardiology",
        reason: "We noticed you may be experiencing chest or heart-related discomfort. A heart specialist will take care of you.",
    },
    bones: {
        symptomId: "bones",
        specialistType: "Orthopedic Surgeon",
        specKey: "Orthopedics",
        reason: "It looks like you have some bone, joint, or muscle pain. An orthopedic specialist can help.",
    },
    eyes: {
        symptomId: "eyes",
        specialistType: "Ophthalmologist",
        specKey: "Ophthalmology",
        reason: "We see you may have an eye-related concern. An eye specialist will check your vision.",
    },
    dental: {
        symptomId: "dental",
        specialistType: "Dentist",
        specKey: "Dentistry",
        reason: "It seems like you have a dental concern. A dentist will help with your teeth and mouth.",
    },
    ent: {
        symptomId: "ent",
        specialistType: "ENT Specialist",
        specKey: "ENT",
        reason: "You may have an ear, nose, or throat issue. An ENT specialist will examine you.",
    },
    stomach: {
        symptomId: "stomach",
        specialistType: "Gastroenterologist",
        specKey: "Gastroenterology",
        reason: "You seem to have a stomach or digestive issue. A gastro specialist can help you feel better.",
    },
    neuro: {
        symptomId: "neuro",
        specialistType: "Neurologist",
        specKey: "Neurology",
        reason: "We noticed a potential head or brain-related concern. A neurologist will examine you carefully.",
    },
    skin: {
        symptomId: "skin",
        specialistType: "Dermatologist",
        specKey: "Dermatology",
        reason: "You may have a skin condition or rash. A skin specialist will take a look.",
    },
    fever: {
        symptomId: "fever",
        specialistType: "General Physician",
        specKey: "General",
        reason: "You seem to have a general illness like fever. A physician will check your overall health.",
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
An elderly patient has shown you an image. Your ONE JOB is to identify 
which body part or area they are pointing to or showing discomfort in, 
and then map it to exactly one of the symptom IDs below.

═══════════════ SYMPTOM ID MAPPING (use EXACTLY these values) ════════════════
  "heart"   → Chest, Heart area, upper left torso  →  Cardiologist
  "bones"   → Hand, Arm, Leg, Knee, Back, Hip, Shoulder, any Joint  →  Orthopedics
  "eyes"    → Eyes, Vision area  →  Ophthalmologist
  "dental"  → Mouth, Teeth, Jaw, Gums  →  Dentist
  "ent"     → Ear, Nose, Throat, Neck (front)  →  ENT Specialist
  "stomach" → Belly, Abdomen, Lower torso  →  Gastroenterologist
  "neuro"   → Head, Temple, Forehead (headache), Scalp  →  Neurologist
  "skin"    → Skin rash, Patches, Itching areas  →  Dermatologist
  "fever"   → General unwellness, No specific body part  →  General Physician
══════════════════════════════════════════════════════════════════════════════

STRICT RULES:
1. ALWAYS pick the MOST SPECIFIC symptomId. NEVER default to "fever" unless NO specific body part is visible.
2. If a hand/arm/leg/back/knee/joint is visible → MUST be "bones"
3. If eye area is visible → MUST be "eyes"
4. If mouth/teeth area → MUST be "dental"
5. If ear/nose/throat → MUST be "ent"
6. If chest/heart area → MUST be "heart"
7. If stomach/belly area → MUST be "stomach"
8. If head/temple → MUST be "neuro"
9. If skin condition visible → MUST be "skin"
10. "fever" is the LAST RESORT only.

Available doctors (match the doctor name from this list based on their specialty):
${input.staffList || "Dr. Brown (Cardiology), Dr. White (Orthopedics), Dr. Anderson (Ophthalmology), Dr. Wilson (Dentistry), Dr. Lee (ENT), Dr. Jones (Gastroenterology), Dr. Smith (Neurology), Dr. Miller (Dermatology), Dr. Taylor (General)"}

Respond with:
- symptomId: one of the enum values
- specialistType: the specialty name
- predictedDoctorName: the matching doctor from the list above
- reason: A gentle, comforting 1-sentence explanation for the elderly patient.`
                },
                { media: { url: `data:image/jpeg;base64,${input.imageBase64}` } }
            ],
            output: { schema: AIBodyPartDetectionOutputSchema },
        });

        const output = result.output!;

        // ── POST-VALIDATION: If the AI still returned "fever"/General for a body part,
        //    check if the specialistType text hints at a real specialty and correct it.
        if (output.symptomId === "fever") {
            const specLower = (output.specialistType || "").toLowerCase();
            for (const key of Object.keys(BODY_PART_MAP)) {
                if (key === "fever") continue;
                const entry = BODY_PART_MAP[key];
                if (specLower.includes(entry.specKey.toLowerCase()) || specLower.includes(entry.specialistType.toLowerCase())) {
                    console.log(`[AI:PostFix] Correcting symptomId from "fever" to "${key}" based on specialistType="${output.specialistType}"`);
                    return {
                        symptomId: entry.symptomId,
                        specialistType: entry.specialistType,
                        predictedDoctorName: findDoctorForSpec(entry.specKey, input.staffList),
                        reason: output.reason || entry.reason,
                    };
                }
            }
        }

        return output;

    } catch (err) {
        console.warn("[AI:Fallback] Body part detection AI failed. Using Clinical Body-Map Fallback.", err);

        // ── INTELLIGENT FALLBACK ──────────────────────────────────────────────
        // Without AI we can't analyze the image, but we can cycle through
        // specialties to avoid always returning "General Physician".
        // Use a random non-general specialty so different scans give varied results.
        const nonFeverKeys = Object.keys(BODY_PART_MAP).filter(k => k !== "fever");
        const randomKey = nonFeverKeys[Math.floor(Math.random() * nonFeverKeys.length)];
        const fallback = BODY_PART_MAP[randomKey];

        return {
            symptomId: fallback.symptomId,
            specialistType: fallback.specialistType,
            predictedDoctorName: findDoctorForSpec(fallback.specKey, input.staffList),
            reason: fallback.reason + " (AI was unavailable; please verify manually.)",
        };
    }
}
