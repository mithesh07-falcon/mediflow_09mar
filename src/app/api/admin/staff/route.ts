import { NextResponse } from "next/server";
import { getSafeRegistry, addStaff } from "@/lib/mock-db";
import fs from "fs";
import path from "path";

const mockHash = (pass: string) => `[SECURE_HASH]_${Buffer.from(pass).toString('base64')}`;

// GET /api/doctors — returns all doctors (public info only, no passwords)
export async function GET() {
    const currentStaff = getSafeRegistry();
    const publicStaff = currentStaff.map(({ passwordHash, passwordPlain, ...staff }) => staff);
    return NextResponse.json({ staff: publicStaff });
}

export async function POST(request: Request) {
    try {
        const { name, email, password, role, specialization, license, phone } = await request.json();

        const cleanPhone = phone ? phone.replace(/\s/g, '') : '';
        if (!name || !email || !password || !cleanPhone || cleanPhone.length !== 13 || !['6', '7', '8', '9'].includes(cleanPhone[3])) {
            return NextResponse.json({ error: "Missing required fields or invalid phone format (must be 10 digits starting with 6, 7, 8, or 9)." }, { status: 400 });
        }

        // CONSTRAINT 12: Email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.toLowerCase())) {
            return NextResponse.json({ error: "Invalid email format. Use format like example@gmail.com." }, { status: 400 });
        }

        // CONSTRAINT 11: Password strength
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
            return NextResponse.json({ error: "Password must have at least 8 characters with uppercase, lowercase, number, and special character." }, { status: 400 });
        }

        // CONSTRAINT 7: Name validation
        if (/[^a-zA-Z\s.]/.test(name)) {
            return NextResponse.json({ error: "Name must contain only letters, spaces, and periods." }, { status: 400 });
        }

        // Check local staff registry
        const emailLower = email.toLowerCase();
        const staff = getSafeRegistry();
        const existsInStaff = staff.some(s => s.email.toLowerCase() === emailLower);

        // Check patients registry
        let existsInPatients = false;
        try {
            const patientsPath = path.join(process.cwd(), "data", "patients.json");
            if (fs.existsSync(patientsPath)) {
                const patients = JSON.parse(fs.readFileSync(patientsPath, "utf-8"));
                existsInPatients = patients.some((p: any) => p.email.toLowerCase() === emailLower);
            }
        } catch (e) { }

        if (existsInStaff || existsInPatients) {
            return NextResponse.json({ error: "This email is already registered. Please use a different email." }, { status: 409 });
        }

        const newStaff = {
            id: Date.now(),
            name,
            email,
            phone,
            passwordHash: mockHash(password),
            passwordPlain: password, // Store plain key for mock login verification
            role,
            specialization: specialization || (role === 'doctor' ? "General" : null),
            license: license || null,
            isVerified: true,
            isAuthorized: true,
            pharmacyId: role === 'pharmacist' ? "PH-GLOBAL-NEW" : null
        };

        addStaff(newStaff);

        return NextResponse.json({
            success: true,
            staff: { name: newStaff.name, email: newStaff.email, role: newStaff.role },
            credentials: { email: newStaff.email, password: password }
        });
    } catch (err) {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
}
