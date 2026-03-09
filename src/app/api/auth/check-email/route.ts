
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
    const emailInPatients = patients.some((p: any) => p.email.toLowerCase() === email);

    // 2. Check Staff (Doctors/Pharmacists)
    const staff = getSafeRegistry();
    const emailInStaff = staff.some((s: any) => s.email.toLowerCase() === email);

    const exists = emailInPatients || emailInStaff;

    return NextResponse.json({ exists });
}
