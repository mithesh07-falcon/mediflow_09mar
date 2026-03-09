import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const APPOINTMENTS_DB_PATH = path.join(process.cwd(), "data", "appointments.json");

function getAuthenticatedUser(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    try {
        const token = authHeader.split(" ")[1];
        const decodedString = Buffer.from(token, "base64").toString("utf-8");
        const user = JSON.parse(decodedString);
        if (!user || (!user.email && !user.id) || !user.role) return null;
        return user;
    } catch (err) {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const user = getAuthenticatedUser(request);
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized. Only medical practitioners can finalize consultations." }, { status: 403 });
        }

        const body = await request.json();
        const { appointmentId, prescriptionId } = body;

        if (!appointmentId) {
            return NextResponse.json({ error: "Missing clinical consultation ID." }, { status: 400 });
        }

        const fileContent = await fs.readFile(APPOINTMENTS_DB_PATH, "utf-8");
        let appointments = JSON.parse(fileContent);

        // Security check: Ensure doctors only finalize their OWN assigned appointments
        const appointmentIndex = appointments.findIndex((a: any) => String(a.id) === String(appointmentId));

        if (appointmentIndex === -1) {
            return NextResponse.json({ error: "Consultation record not found." }, { status: 404 });
        }

        const appt = appointments[appointmentIndex];
        if (appt.doctorEmail?.toLowerCase() !== user.email?.toLowerCase()) {
            return NextResponse.json({ error: "Security Breach: Practitioner mismatch detected." }, { status: 403 });
        }

        // Finalize state preservation
        appointments[appointmentIndex] = {
            ...appt,
            status: "Completed",
            prescriptionId: prescriptionId || `RX-AUTO-${Date.now()}`,
            completedAt: new Date().toISOString()
        };

        await fs.writeFile(APPOINTMENTS_DB_PATH, JSON.stringify(appointments, null, 2));

        return NextResponse.json({ success: true, message: "Clinical cycle finalized and archived." });
    } catch (err) {
        console.error("Critical finalize failure:", err);
        return NextResponse.json({ error: "Failed to finalize clinical documentation." }, { status: 500 });
    }
}
