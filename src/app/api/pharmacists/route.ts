
import { NextResponse } from "next/server";
import { getSafeRegistry } from "@/lib/mock-db";

// GET /api/pharmacists — returns all authorized pharmacists (partial info)
export async function GET() {
    const currentStaff = getSafeRegistry();
    const publicPharmacists = currentStaff
        .filter(s => s.role === 'pharmacist')
        .map(({ passwordHash, passwordPlain, ...p }) => p);
    return NextResponse.json({ pharmacists: publicPharmacists });
}

// POST /api/pharmacists — authenticate a pharmacist (login)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and credentials are required." },
                { status: 400 }
            );
        }

        // Logic check against shared Staff Registry
        const currentStaff = getSafeRegistry();
        const pharmacist = currentStaff.find(
            (p) => p.role === 'pharmacist' &&
                p.email.toLowerCase() === email.toLowerCase() &&
                (p.passwordPlain === password || p.passwordHash === password)
        );

        if (!pharmacist) {
            return NextResponse.json(
                { error: "Invalid credentials. Staff access requires a @mediflow.com address or pre-registration." },
                { status: 401 }
            );
        }

        // DOMAIN GUARD (Allow pre-seeded or @mediflow.com ONLY)
        if (!email.toLowerCase().endsWith('@mediflow.com')) {
            return NextResponse.json(
                { error: "Access Denied. Only authorized staff accounts can access this portal." },
                { status: 403 }
            );
        }

        const { passwordHash: _, passwordPlain: __, ...safePharmacist } = pharmacist;
        return NextResponse.json({
            success: true,
            pharmacist: safePharmacist,
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Invalid request format." },
            { status: 400 }
        );
    }
}
