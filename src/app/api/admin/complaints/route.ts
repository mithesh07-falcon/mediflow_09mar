import { NextResponse } from "next/server";

// Mock Database for Complaints
let complaints = [
    { id: 1, from: "Patient: Rahul Verma", type: "patient", message: "Long wait time at the clinic.", status: "unresolved", date: "2024-03-05", note: "" },
    { id: 2, from: "Doctor: Dr. Smith", type: "doctor", message: "Patient #552 missed their medication schedule.", status: "resolved", date: "2024-03-04", note: "Handled via phone call." },
    { id: 3, from: "Pharmacist: Swathi", type: "pharmacist", message: "Shortage of Paracetamol in central stock.", status: "unresolved", date: "2024-03-06", note: "" },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    let filtered = [...complaints];
    if (type && type !== "all") filtered = filtered.filter(c => c.type === type);
    if (status && status !== "all") filtered = filtered.filter(c => c.status === status);

    return NextResponse.json({ complaints: filtered });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { id, status, note } = body;

    complaints = complaints.map(c =>
        c.id === id ? { ...c, status, note: note || c.note } : c
    );

    return NextResponse.json({ success: true, message: "Complaint updated." });
}
