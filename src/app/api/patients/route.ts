import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════
// MEDIFLOW — PATIENT REGISTRY (Server-Side Persistent Storage)
// Patient data is saved to a JSON file on the server so it persists
// across browser refreshes and localStorage clears.
// ═══════════════════════════════════════════════════════════════════════

export interface PatientRecord {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: string;
    password: string;
    registeredAt: string;
}

// Path to the server-side JSON file that persists patient data
const DATA_FILE = path.join(process.cwd(), "data", "patients.json");

// Default seed patient (always available)
const SEED_PATIENTS: PatientRecord[] = [
    {
        id: 1,
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@example.com",
        phone: "+919876543210",
        age: "32",
        password: "Password123!",
        registeredAt: "2024-01-01T00:00:00.000Z",
    },
];

// ── Helpers ──────────────────────────────────────────────────────────

function ensureDataDir() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function readPatients(): PatientRecord[] {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) {
        // First run — seed with default patients
        fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PATIENTS, null, 2));
        return [...SEED_PATIENTS];
    }
    try {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
    } catch {
        return [...SEED_PATIENTS];
    }
}

function writePatients(patients: PatientRecord[]) {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(patients, null, 2));
}

// ── GET /api/patients — List all patients (no passwords) ─────────

export async function GET() {
    const patients = readPatients();
    const safe = patients.map(({ password, ...p }) => p);
    return NextResponse.json({ patients: safe });
}

// ── POST /api/patients — Register a new patient OR login ─────────

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        // ─── LOGIN ───
        if (action === "login") {
            const { email, password } = body;
            console.log(`[API:Patients:Login] Attempting login for: ${email}`);

            if (!email || !password) {
                return NextResponse.json(
                    { error: "Email and password are required." },
                    { status: 400 }
                );
            }

            const patients = readPatients();
            const patient = patients.find(
                (p) =>
                    p.email.toLowerCase() === email.toLowerCase() && p.password === password
            );

            if (!patient) {
                console.warn(`[API:Patients:Login] Failed login for: ${email}`);
                return NextResponse.json(
                    { error: "Invalid email or password. Please check your credentials." },
                    { status: 401 }
                );
            }

            console.log(`[API:Patients:Login] Success for: ${email}`);
            const { password: _, ...safePatient } = patient;
            return NextResponse.json({ success: true, patient: safePatient });
        }

        // ─── REGISTER ───
        if (action === "register") {
            const { firstName, lastName, email, phone, age, password } = body;
            console.log(`[API:Patients:Register] Attempting registration for: ${email}`);

            if (!firstName || !lastName || !email || !phone || !password) {
                return NextResponse.json(
                    { error: "All fields are required." },
                    { status: 400 }
                );
            }

            const emailLower = email.toLowerCase();

            // Fix phone prefix bug: Only prepend +91 if it's missing
            let phoneClean = phone.replace(/\s/g, "");
            if (!phoneClean.startsWith("+")) {
                phoneClean = "+91" + (phoneClean.startsWith("91") && phoneClean.length === 12 ? phoneClean.slice(2) : phoneClean);
            }
            // Ensure exactly 10 digits after +91 or similar
            if (!phoneClean.startsWith("+91") || phoneClean.length < 13) {
                console.warn(`[API:Patients:Register] Invalid phone: ${phoneClean}`);
                return NextResponse.json(
                    {
                        error:
                            "Patient phone numbers must follow the Indian clinical format starting with +91 followed by 10 digits.",
                    },
                    { status: 400 }
                );
            }

            const patients = readPatients();

            // Check phone uniqueness
            if (patients.some((p) => p.phone.replace(/\s/g, "") === phoneClean)) {
                console.warn(`[API:Patients:Register] Phone conflict: ${phoneClean}`);
                return NextResponse.json(
                    { error: "This phone number is already registered within the MediFlow network." },
                    { status: 409 }
                );
            }

            // Check email uniqueness
            if (patients.some((p) => p.email.toLowerCase() === emailLower)) {
                console.warn(`[API:Patients:Register] Email conflict: ${emailLower}`);
                return NextResponse.json(
                    { error: "This email address is already associated with a clinical account." },
                    { status: 409 }
                );
            }

            const newPatient: PatientRecord = {
                id: Date.now(),
                firstName,
                lastName,
                email: emailLower,
                phone: phoneClean,
                age,
                password,
                registeredAt: new Date().toISOString(),
            };

            patients.push(newPatient);
            writePatients(patients);
            console.log(`[API:Patients:Register] Successfully registered: ${emailLower}`);

            const { password: _, ...safePatient } = newPatient;
            return NextResponse.json({ success: true, patient: safePatient });
        }

        return NextResponse.json({ error: "Invalid action. Use 'login' or 'register'." }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
}

