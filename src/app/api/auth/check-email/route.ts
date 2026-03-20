
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

    // --- CROSS-INSTANCE CLOUD SYNC ---
    let cloudPatients = [];
    let cloudStaff = [];
    try {
        const pRes = await fetch("https://rentry.co/mediflow-patients-777/raw", { cache: 'no-store' });
        if (pRes.ok) cloudPatients = JSON.parse(await pRes.text() || "[]");
        
        const sRes = await fetch("https://rentry.co/mediflow-staff-777/raw", { cache: 'no-store' });
        if (sRes.ok) cloudStaff = JSON.parse(await sRes.text() || "[]");
    } catch (e) {}

    // 1. Check Patients
    let patients = [];
    if (fs.existsSync(PATIENTS_FILE)) {
        try {
            patients = JSON.parse(fs.readFileSync(PATIENTS_FILE, "utf-8"));
        } catch (e) {
            console.error("Error reading patients file", e);
        }
    }
    
    // Merge registries for check
    const allPatients = [...patients];
    cloudPatients.forEach((cp: any) => {
        if (!allPatients.find(lp => lp.email.toLowerCase() === cp.email.toLowerCase())) allPatients.push(cp);
    });

    const inPatients = allPatients.find((p: any) => p.email.toLowerCase() === email);
    
    const staff = getSafeRegistry();
    const allStaff = [...staff];
    cloudStaff.forEach((cs: any) => {
        if (!allStaff.find(ls => ls.email.toLowerCase() === cs.email.toLowerCase())) allStaff.push(cs);
    });

    const inStaff = allStaff.find((s: any) => s.email.toLowerCase() === email);

    const exists = !!inPatients || !!inStaff;
    const data = inStaff ? { name: inStaff.name, role: inStaff.role } : (inPatients ? { name: `${inPatients.firstName} ${inPatients.lastName}`, role: 'patient' } : null);

    return NextResponse.json({ exists, data });
}
