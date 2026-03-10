import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SLOTS_DB_PATH = path.join(process.cwd(), "data", "slots.json");

async function ensureRegistry() {
    const dir = path.dirname(SLOTS_DB_PATH);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    try {
        await fs.access(SLOTS_DB_PATH);
    } catch {
        await fs.writeFile(SLOTS_DB_PATH, JSON.stringify([], null, 2));
    }
}

async function readSlots() {
    await ensureRegistry();
    const content = await fs.readFile(SLOTS_DB_PATH, "utf-8");
    return JSON.parse(content || "[]");
}

async function writeSlots(slots: any[]) {
    await fs.writeFile(SLOTS_DB_PATH, JSON.stringify(slots, null, 2));
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const docEmail = searchParams.get("docEmail");
        const date = searchParams.get("date");
        const status = searchParams.get("status"); // 'pending', 'approved'

        const allSlots = await readSlots();
        let filtered = allSlots;

        if (docEmail) filtered = filtered.filter((s: any) => s.docEmail.toLowerCase() === docEmail.toLowerCase());
        if (date) filtered = filtered.filter((s: any) => s.date === date);
        if (status) filtered = filtered.filter((s: any) => s.status === status);

        return NextResponse.json({ slots: filtered });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch slots." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, docEmail, date, slot, id, status, slots } = body;
        const allSlots = await readSlots();

        if (action === "request_slots") {
            // Doctors request multiple slots at once
            const newRequests = slots.map((s: string) => ({
                id: Date.now() + Math.random(),
                docEmail,
                date,
                slot: s,
                status: "pending",
                createdAt: new Date().toISOString()
            }));
            await writeSlots([...allSlots, ...newRequests]);
            return NextResponse.json({ success: true, message: "Slots sent for Admin approval." });
        }

        if (action === "approve") {
            const updated = allSlots.map((s: any) =>
                s.id === id ? { ...s, status: "approved" } : s
            );
            await writeSlots(updated);
            return NextResponse.json({ success: true });
        }

        if (action === "reject") {
            const updated = allSlots.filter((s: any) => s.id !== id);
            await writeSlots(updated);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: "Failed to process slot action." }, { status: 500 });
    }
}
