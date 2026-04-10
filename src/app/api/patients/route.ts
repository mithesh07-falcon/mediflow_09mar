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
    guardianName?: string;
    guardianEmail?: string;
    guardianPhone?: string;
    guardianRelationship?: string;
    language?: string;
    user_type?: 'normal' | 'elderly';
}

// ── VERCEL HYBRID MEMORY POOL ───────────────────────────────────────────
// Ensures patient data survives serverless cold starts as long as instance is warm.
declare global {
    var __mediflow_patient_pool: PatientRecord[] | undefined;
}

// Path to the server-side JSON file that persists patient data
const DATA_FILE = path.join(process.cwd(), "data", "patients.json");

// Default seed patient
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
        user_type: 'normal',
    },
];

function ensureDataDir() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) { }
}

function readPatients(): PatientRecord[] {
    // Return memory-pool if already hydrated
    if (global.__mediflow_patient_pool) return global.__mediflow_patient_pool;

    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) {
        global.__mediflow_patient_pool = [...SEED_PATIENTS];
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PATIENTS, null, 2));
        } catch (err) {
            console.warn("[API:Patients] Read-only FS: Initializing memory pool with seeds.");
        }
        return global.__mediflow_patient_pool;
    }

    try {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        global.__mediflow_patient_pool = JSON.parse(raw);
    } catch {
        global.__mediflow_patient_pool = [...SEED_PATIENTS];
    }
    return global.__mediflow_patient_pool!;
}

function writePatients(patients: PatientRecord[]) {
    global.__mediflow_patient_pool = patients;
    try {
        ensureDataDir();
        fs.writeFileSync(DATA_FILE, JSON.stringify(patients, null, 2));
    } catch (err) {
        console.warn("[API:Patients] Write failed (Read-only OS). Data exists in instance memory.");
    }
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

        // ─── VERIFY GUARDIAN ───
        if (action === "verify-guardian") {
            const { email } = body;
            console.log(`[API:Patients:VerifyGuardian] Checking: ${email}`);

            if (!email) {
                return NextResponse.json({ error: "Email is required." }, { status: 400 });
            }

            const patients = readPatients();
            const guardian = patients.find(p => p.email.toLowerCase() === email.toLowerCase());

            if (!guardian) {
                // Check if it exists in staff registry to provide a better error message if they are staff but not patient
                const staffPath = path.join(process.cwd(), 'src', 'lib', 'staff-db.json');
                let isStaff = false;
                if (fs.existsSync(staffPath)) {
                    const staff = JSON.parse(fs.readFileSync(staffPath, 'utf8') || "[]");
                    isStaff = staff.some((s: any) => s.email.toLowerCase() === email.toLowerCase());
                }

                if (isStaff) {
                    return NextResponse.json({
                        error: "This email belongs to a staff member. Guardians must have a registered Patient account."
                    }, { status: 403 });
                }

                return NextResponse.json({
                    error: "Guardian not found. Please ensure they are registered as a patient in MediFlow."
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                guardian: {
                    name: `${guardian.firstName} ${guardian.lastName}`,
                    phone: guardian.phone
                }
            });
        }

        // ─── REGISTER ───
        if (action === "register") {
            const {
                firstName,
                lastName,
                email,
                phone,
                age,
                password,
                guardianName,
                guardianPhone,
                guardianRelationship,
                language,
                user_type
            } = body;
            console.log(`[API:Patients:Register] Attempting registration for: ${email}`);

            if (!firstName || !lastName || !email || !phone || !password) {
                return NextResponse.json(
                    { error: "All fields are required." },
                    { status: 400 }
                );
            }

            const emailLower = email.toLowerCase();

            // CONSTRAINT 12: Email format validation
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(emailLower)) {
                return NextResponse.json({ error: "Invalid email format. Please use a valid format like example@gmail.com." }, { status: 400 });
            }

            // CONSTRAINT 11: Password strength
            if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                return NextResponse.json({ error: "Password must contain at least 8 characters with one uppercase, one lowercase, one number, and one special character." }, { status: 400 });
            }

            // CONSTRAINT 4: Age validation
            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum < 0 || ageNum > 100) {
                return NextResponse.json({ error: "Age must be between 0 and 100." }, { status: 400 });
            }

            // CONSTRAINT 7: Name validation
            if (/[^a-zA-Z\s]/.test(firstName) || /[^a-zA-Z\s]/.test(lastName)) {
                return NextResponse.json({ error: "Name must contain only letters and spaces." }, { status: 400 });
            }

            // Fix phone prefix bug: Only prepend +91 if it's missing
            let phoneClean = phone.replace(/\s/g, "");
            if (!phoneClean.startsWith("+")) {
                phoneClean = "+91" + (phoneClean.startsWith("91") && phoneClean.length === 12 ? phoneClean.slice(2) : phoneClean);
            }
            // Ensure exactly 10 digits after +91 or similar
            if (!phoneClean.startsWith("+91") || phoneClean.length < 13 || !['6', '7', '8', '9'].includes(phoneClean[3])) {
                console.warn(`[API:Patients:Register] Invalid phone: ${phoneClean}`);
                return NextResponse.json(
                    {
                        error:
                            "Patient phone numbers must follow the Indian clinical format starting with +91 followed by 10 digits. The first digit of the number must be 6, 7, 8, or 9.",
                    },
                    { status: 400 }
                );
            }

            let staffRegistry = [];
            try {
                const staffPath = path.join(process.cwd(), 'src', 'lib', 'staff-db.json');
                if (fs.existsSync(staffPath)) {
                    staffRegistry = JSON.parse(fs.readFileSync(staffPath, 'utf8') || "[]");
                }
            } catch(e) {}

            // --- CROSS-INSTANCE CLOUD SYNC ---
            // On Vercel, the local file system is ephemeral and doesn't share data between functions.
            // We pull from the shared cloud registry (rentry.co) to ensure uniqueness.
            let cloudPatients = [];
            try {
                const cloudRes = await fetch("https://rentry.co/mediflow-patients-777/raw", { cache: 'no-store' });
                if (cloudRes.ok) {
                    const text = await cloudRes.text();
                    cloudPatients = JSON.parse(text || "[]");
                }
            } catch (e) {
                console.warn("[API:Patients] Cloud pull failed during registration. Falling back to local check.");
            }

            const localPatients = readPatients();
            // Merge to get the full picture
            const allPatients = [...localPatients];
            cloudPatients.forEach((cp: any) => {
                if (!allPatients.find(lp => lp.email.toLowerCase() === cp.email.toLowerCase())) {
                    allPatients.push(cp);
                }
            });

            // Check phone uniqueness
            if (allPatients.some((p) => p.phone.replace(/\s/g, "") === phoneClean)) {
                console.warn(`[API:Patients:Register] Phone conflict: ${phoneClean}`);
                return NextResponse.json(
                    { error: "This phone number is already registered within the MediFlow network." },
                    { status: 409 }
                );
            }

            // Check email uniqueness (Cross-role check)
            const emailInPatients = allPatients.some((p) => p.email.toLowerCase() === emailLower);
            const emailInStaff = staffRegistry.some((s: any) => s.email.toLowerCase() === emailLower);

            if (emailInPatients || emailInStaff) {
                console.warn(`[API:Patients:Register] Email conflict: ${emailLower}`);
                return NextResponse.json(
                    { error: "This email is already used. Please use a different email address." },
                    { status: 409 }
                );
            }

            const userType = user_type || (parseInt(age) >= 60 ? 'elderly' : 'normal');

            const newPatient: PatientRecord = {
                id: Date.now(),
                firstName,
                lastName,
                email: emailLower,
                phone: phoneClean,
                age,
                password,
                registeredAt: new Date().toISOString(),
                guardianName,
                guardianPhone,
                guardianRelationship,
                language: language || "English",
                user_type: userType
            };

            localPatients.push(newPatient);
            writePatients(localPatients);
            console.log(`[API:Patients:Register] Successfully registered: ${emailLower}`);

            const { password: _, ...safePatient } = newPatient;
            return NextResponse.json({ success: true, patient: safePatient });
        }

        return NextResponse.json({ error: "Invalid action. Use 'login' or 'register'." }, { status: 400 });
    } catch (err: any) {
        console.error("[API:Patients] Fatal Error:", err);

        // Improve error message to help the USER troubleshoot
        let errorMessage = "An unexpected error occurred.";
        if (err instanceof SyntaxError) {
            errorMessage = "Invalid JSON request body.";
        } else if (err.code === 'EROFS') {
            errorMessage = "Server error: File system is read-only (common on Vercel/Hosting). Registration failed to persist.";
        } else if (err.message) {
            errorMessage = err.message;
        }

        return NextResponse.json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
        }, { status: 500 }); // Changed to 500 for server-side errors
    }
}

