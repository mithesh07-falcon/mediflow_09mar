
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSafeRegistry } from "@/lib/mock-db";

const PATIENTS_FILE = path.join(process.cwd(), "data", "patients.json");

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase();

    if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Check Patients
    let patients = [];
    if (fs.existsSync(PATIENTS_FILE)) {
        try {
            patients = JSON.parse(fs.readFileSync(PATIENTS_FILE, "utf-8"));
        } catch (e) {
            console.error("Error reading patients file", e);
        }
    }
    const inPatients = patients.find((p: any) => p.email.toLowerCase() === email);
    const staff = getSafeRegistry();
    const inStaff = staff.find((s: any) => s.email.toLowerCase() === email);

    const exists = !!inPatients || !!inStaff;
    const data = inStaff ? { name: inStaff.name, role: inStaff.role } : (inPatients ? { name: `${inPatients.firstName} ${inPatients.lastName}`, role: 'patient' } : null);

    return NextResponse.json({ exists, data });
}
