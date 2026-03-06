import { NextResponse } from "next/server";
import { getSafeRegistry, addStaff } from "@/lib/mock-db";

const mockHash = (pass: string) => `[SECURE_HASH]_${Buffer.from(pass).toString('base64')}`;

// GET /api/doctors — returns all doctors (public info only, no passwords)
export async function GET() {
    const currentStaff = getSafeRegistry();
    const publicStaff = currentStaff.map(({ passwordHash, passwordPlain, ...staff }) => staff);
    return NextResponse.json({ staff: publicStaff });
}

export async function POST(request: Request) {
    try {
        const { name, email, password, role, specialization, license } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const newStaff = {
            id: Date.now(),
            name,
            email,
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
