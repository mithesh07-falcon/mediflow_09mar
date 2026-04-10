import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CERTIFICATES_DB_PATH = path.join(process.cwd(), "data", "medical-certificates.json");
const APPOINTMENTS_DB_PATH = path.join(process.cwd(), "data", "appointments.json");

async function ensureRegistry() {
    const dir = path.dirname(CERTIFICATES_DB_PATH);
    try {
        await fs.access(dir);
    } catch {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch {
            console.warn("Vercel: Read-only file system, skipped directory creation.");
        }
    }

    try {
        await fs.access(CERTIFICATES_DB_PATH);
    } catch {
        try {
            await fs.writeFile(CERTIFICATES_DB_PATH, JSON.stringify([], null, 2));
        } catch {
            console.warn("Vercel: Read-only file system, skipped file initialization.");
        }
    }
}

function getAuthenticatedUser(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.split(" ")[1];
        const decodedString = Buffer.from(token, "base64").toString("utf-8");
        const user = JSON.parse(decodedString);
        if (!user || !user.role || !user.email) return null;
        return user;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const user = getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Missing or invalid authentication token." }, { status: 401 });
        }

        await ensureRegistry();
        const fileContent = await fs.readFile(CERTIFICATES_DB_PATH, "utf-8");
        const certificates = JSON.parse(fileContent);
        const validIssuedCertificates = certificates.filter((c: any) => {
            const doctorIssued = c?.issuedByRole === "doctor" || (!c?.issuedByRole && !!c?.doctorEmail);
            return c?.status === "Issued" && !!c?.doctorEmail && !!c?.issuedAt && doctorIssued;
        });

        let isolated: any[] = [];
        if (user.role === "doctor") {
            isolated = validIssuedCertificates.filter((c: any) => c.doctorEmail?.toLowerCase() === user.email.toLowerCase());
        } else if (user.role === "patient") {
            isolated = validIssuedCertificates.filter((c: any) => c.patientEmail?.toLowerCase() === user.email.toLowerCase());
        } else {
            return NextResponse.json({ error: "Forbidden. Invalid role scope." }, { status: 403 });
        }

        return NextResponse.json({ certificates: isolated });
    } catch {
        return NextResponse.json({ error: "Failed to load medical certificates." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = getAuthenticatedUser(request);
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized. Only doctors can issue medical certificates." }, { status: 403 });
        }

        await ensureRegistry();
        const body = await request.json();
        const { certificate } = body;

        if (!certificate) {
            return NextResponse.json({ error: "Missing certificate payload." }, { status: 400 });
        }

        const {
            appointmentId,
            patientName,
            patientEmail,
            diagnosis,
            restFrom,
            restUntil,
            remarks,
            certifyText,
            issuedOn,
        } = certificate;

        if (!appointmentId || !diagnosis || !restFrom || !restUntil || !certifyText) {
            return NextResponse.json({ error: "Required fields missing in certificate form." }, { status: 400 });
        }

        let appointment: any = null;
        try {
            const apptRaw = await fs.readFile(APPOINTMENTS_DB_PATH, "utf-8");
            const appointments = JSON.parse(apptRaw);
            appointment = appointments.find((a: any) => String(a.id) === String(appointmentId));

            if (!appointment) {
                return NextResponse.json({ error: "Referenced appointment not found." }, { status: 404 });
            }

            if (appointment.doctorEmail?.toLowerCase() !== user.email.toLowerCase()) {
                return NextResponse.json({ error: "Security check failed: doctor does not own this appointment." }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: "Unable to validate appointment reference for certificate issuance." }, { status: 500 });
        }

        const fileContent = await fs.readFile(CERTIFICATES_DB_PATH, "utf-8");
        const certificates = JSON.parse(fileContent);

        const newCertificate = {
            id: `MC-${Date.now()}`,
            appointmentId,
            patientName: appointment.patient || patientName,
            patientEmail: appointment.patientEmail || patientEmail,
            diagnosis,
            restFrom,
            restUntil,
            remarks: remarks || "",
            certifyText,
            issuedOn: issuedOn || new Date().toLocaleDateString(),
            issuedAt: new Date().toISOString(),
            doctorEmail: user.email,
            doctorName: user.firstName || user.name || "Doctor",
            doctorSpecialization: user.specialization || "General",
            status: "Issued",
            issuedByRole: "doctor",
        };

        const updated = [newCertificate, ...certificates];
        try {
            await fs.writeFile(CERTIFICATES_DB_PATH, JSON.stringify(updated, null, 2));
        } catch {
            console.warn("Vercel: Certificate write skipped due to read-only file system.");
        }

        return NextResponse.json({ success: true, certificate: newCertificate });
    } catch {
        return NextResponse.json({ error: "Failed to issue medical certificate." }, { status: 500 });
    }
}