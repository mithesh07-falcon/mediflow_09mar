
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEDICINES_FILE = path.join(process.cwd(), "data", "medicines.json");

// Seed data based on the mockData.ts
const INITIAL_MEDICINES = [
    { id: "M1", name: "Paracetamol 650mg", category: "Body Pain", stock: 500, price: 30, manufacturer: "GSK", dosage: "1 tab twice daily" },
    { id: "M2", name: "Ibuprofen 400mg", category: "Body Pain", stock: 300, price: 45, manufacturer: "Abbott", dosage: "1 tab as needed" },
    { id: "M3", name: "Diclofenac Gel", category: "Body Pain", stock: 150, price: 85, manufacturer: "Cipla", dosage: "Apply 3 times daily" },
    { id: "M4", name: "Naproxen 500mg", category: "Body Pain", stock: 200, price: 120, manufacturer: "Sun Pharma", dosage: "1 tab daily" },
    { id: "M5", name: "Tramadol 50mg", category: "Body Pain", stock: 100, price: 210, manufacturer: "Ranbaxy", dosage: "1 tab for acute pain" },
    { id: "M6", name: "Omeprazole 20mg", category: "Gastric", stock: 400, price: 180, manufacturer: "Dr. Reddy's", dosage: "1 cap before breakfast" },
    { id: "M7", name: "Pantoprazole 40mg", category: "Gastric", stock: 350, price: 220, manufacturer: "Torrent", dosage: "1 tab before food" },
    { id: "M8", name: "Ranitidine 150mg", category: "Gastric", stock: 450, price: 65, manufacturer: "Astra", dosage: "1 tab at night" },
    { id: "M9", name: "Digene Gel", category: "Gastric", stock: 200, price: 110, manufacturer: "Abbott", dosage: "10ml after meals" },
    { id: "M10", name: "Domperidone 10mg", category: "Gastric", stock: 300, price: 55, manufacturer: "Janssen", dosage: "1 tab 30 mins before food" }
];

function readMeds() {
    if (!fs.existsSync(MEDICINES_FILE)) {
        const dir = path.dirname(MEDICINES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MEDICINES_FILE, JSON.stringify(INITIAL_MEDICINES, null, 2));
        return INITIAL_MEDICINES;
    }
    const raw = fs.readFileSync(MEDICINES_FILE, "utf-8");
    return JSON.parse(raw);
}

function writeMeds(meds: any[]) {
    fs.writeFileSync(MEDICINES_FILE, JSON.stringify(meds, null, 2));
}

export async function GET() {
    const meds = readMeds();
    return NextResponse.json({ medicines: meds });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, id, price, stock } = body;

        const meds = readMeds();

        if (action === "updatePrice") {
            const index = meds.findIndex((m: any) => m.id === id);
            if (index !== -1) {
                meds[index].price = Number(price);
                writeMeds(meds);
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
        }

        if (action === "updateStock") {
            const index = meds.findIndex((m: any) => m.id === id);
            if (index !== -1) {
                meds[index].stock = Number(stock);
                writeMeds(meds);
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}
