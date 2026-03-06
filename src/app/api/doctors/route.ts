
import { NextResponse } from "next/server";
import { getSafeRegistry } from "@/lib/mock-db";

// GET /api/doctors — returns all doctors (public info only, no passwords)
export async function GET() {
    const currentStaff = getSafeRegistry();
    const publicDoctors = currentStaff
        .filter(s => s.role === 'doctor')
        .map(({ passwordHash, passwordPlain, ...doc }) => doc);
    return NextResponse.json({ doctors: publicDoctors });
}

// POST /api/doctors — authenticate a doctor (login)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required." },
                { status: 400 }
            );
        }

        // Logic check against shared Staff Registry (Core + Dynamic Admin-added)
        const currentStaff = getSafeRegistry();
        const doctor = currentStaff.find(
            (s) => s.role === 'doctor' &&
                s.email.toLowerCase() === email.toLowerCase() &&
                (s.passwordPlain === password || s.passwordHash === password)
        );

        if (!doctor) {
            return NextResponse.json(
                { error: "Invalid credentials. Doctor accounts are pre-registered by the hospital. Contact admin for access." },
                { status: 401 }
            );
        }

        // Return doctor info without password fields
        const { passwordHash: _, passwordPlain: __, ...safeDoctor } = doctor;
        return NextResponse.json({
            success: true,
            doctor: safeDoctor,
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 }
        );
    }
}
