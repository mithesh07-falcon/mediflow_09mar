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

        if (!name || !email || !password || !phone) {
            return NextResponse.json({ error: "Missing required fields (Name, Email, Password, Phone)." }, { status: 400 });
        }

        const emailLower = email.toLowerCase();

        // Check local staff registry
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
