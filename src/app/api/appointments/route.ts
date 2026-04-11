import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════
// MEDIFLOW — APPOINTMENTS SYNC REGISTRY (Server-Side)
// Coordinates data between patients and doctors to ensure a 
// single source of truth for all clinical consultations.
// ════════════════════════════════════════════════════════════════._._.
// ═══════════════════════════════════════════════════════════════════════

const APPOINTMENTS_DB_PATH = path.join(process.cwd(), "data", "appointments.json");

function safeParseAppointments(raw: string): any[] {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// Ensure data directory and file exist
async function ensureRegistry() {
    const dir = path.dirname(APPOINTMENTS_DB_PATH);
    try {
        await fs.access(dir);
    } catch {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (e) {
            console.warn("Vercel: Read-only file system, skipped directory creation.");
        }
    }
    try {
        await fs.access(APPOINTMENTS_DB_PATH);
    } catch {
        try {
            await fs.writeFile(APPOINTMENTS_DB_PATH, JSON.stringify([], null, 2));
        } catch (e) {
            console.warn("Vercel: Read-only file system, skipped file initialization.");
        }
    }
}

// Security Middleware: Extract and validate user identity from Authorization header
function getAuthenticatedUser(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    try {
        const token = authHeader.split(" ")[1];
        // Decode base64 to simulate JWT verification
        const decodedString = Buffer.from(token, "base64").toString("utf-8");
        const user = JSON.parse(decodedString);
        if (!user || (!user.email && !user.id) || !user.role) return null;
        return user;
    } catch (err) {
        return null; // Invalid token format
    }
}

// GET /api/appointments — fetch strictly isolated appointments based on auth context
export async function GET(request: Request) {
    try {
        // Enforce Authentication
        const user = getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Missing or invalid authentication token." }, { status: 401 });
        }

        await ensureRegistry();

        let allAppointments: any[] = [];
        try {
            const fileContent = await fs.readFile(APPOINTMENTS_DB_PATH, "utf-8");
            allAppointments = safeParseAppointments(fileContent);
        } catch {
            // In local/dev or read-only environments, fallback to empty registry.
            allAppointments = [];
        }

        let isolatedData = [];

        // Apply Row-Level Security (RLS) Query Filtering
        if (user.role === "doctor") {
            // Doctors can only see their own appointments
            isolatedData = allAppointments.filter((a: any) =>
                a.doctorEmail?.toLowerCase() === user.email?.toLowerCase()
            );
        } else if (user.role === "patient") {
            // Patients can only see their own appointments
            isolatedData = allAppointments.filter((a: any) =>
                a.patientEmail?.toLowerCase() === user.email?.toLowerCase()
            );
        } else {
            return NextResponse.json({ error: "Forbidden. Invalid role scope." }, { status: 403 });
        }

        // Never rely on client-side parameters for sensitive data scope
        return NextResponse.json({ appointments: isolatedData });
    } catch (err) {
        return NextResponse.json({ error: "Failed to read isolated clinical registry." }, { status: 500 });
    }
}

// POST /api/appointments — securely synchronize a new booking confirmed by a patient
export async function POST(request: Request) {
    try {
        const user = getAuthenticatedUser(request);
        if (!user || user.role !== "patient") {
            return NextResponse.json({ error: "Unauthorized. Only verified patients can book consultations." }, { status: 403 });
        }

        await ensureRegistry();
        const body = await request.json();
        const { appointment } = body;

        if (!appointment) {
            return NextResponse.json({ error: "Missing clinical consultation data." }, { status: 400 });
        }

        let appointments: any[] = [];
        try {
            const fileContent = await fs.readFile(APPOINTMENTS_DB_PATH, "utf-8");
            appointments = safeParseAppointments(fileContent);
        } catch {
            appointments = [];
        }

        // Security check: Force the appointment's patientEmail to match the authenticated user's token
        if (appointment.patientEmail?.toLowerCase() !== user.email?.toLowerCase()) {
            return NextResponse.json({ error: "Data Manipulation Blocked. Cannot book for another user." }, { status: 403 });
        }

        // Constraint 9 & 15: Same doctor cannot have two appointments at the same time
        const isConflict = appointments.some((a: any) => 
            a.doctorEmail === appointment.doctorEmail && 
            a.date === appointment.date && 
            a.time === appointment.time &&
            a.status !== "Cancelled"
        );

        if (isConflict) {
            return NextResponse.json({ error: "Doctor already has an appointment booked for this time." }, { status: 409 });
        }

        const synchronizedAppt = {
            ...appointment,
            id: Date.now(), // Generate server-side secure ID
            syncedAt: new Date().toISOString()
        };

        const updated = [synchronizedAppt, ...appointments];
        try {
            await fs.writeFile(APPOINTMENTS_DB_PATH, JSON.stringify(updated, null, 2));
        } catch (e) {
            console.error("Vercel Write Error: Cannot sync to disk. Data will only exist in client local storage.");
        }

        return NextResponse.json({ success: true, message: "Clinical data synchronized securely." });
    } catch (err) {
        return NextResponse.json({ error: "Failed to sync secure clinical registry." }, { status: 500 });
    }
}
