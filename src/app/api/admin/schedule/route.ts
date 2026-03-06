import { NextResponse } from "next/server";

// Simple persistent schedule storage in memory (shared with standard booking)
let masterSchedules = {
    "dr.smith.neuro@mediflow.com_2024-03-07": ["09:00 AM", "09:30 AM", "10:00 AM"],
    "dr.jones.gastro@mediflow.com_2024-03-07": ["11:00 AM", "11:30 AM", "12:00 PM"]
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const docEmail = searchParams.get("docEmail");
    const date = searchParams.get("date");

    if (!docEmail || !date) {
        return NextResponse.json({ schedules: masterSchedules });
    }

    const key = `${docEmail}_${date}`;
    return NextResponse.json({ slots: masterSchedules[key] || [] });
}

export async function POST(request: Request) {
    const { docEmail, date, slots, action, slotToEdit, newSlot } = await request.json();
    const key = `${docEmail}_${date}`;

    if (action === "update_all") {
        masterSchedules[key] = slots;
    } else if (action === "edit_slot") {
        masterSchedules[key] = masterSchedules[key].map(s => s === slotToEdit ? newSlot : s);
    } else if (action === "delete_slot") {
        masterSchedules[key] = masterSchedules[key].filter(s => s !== slotToEdit);
    } else if (action === "add_slot") {
        if (!masterSchedules[key]) masterSchedules[key] = [];
        if (!masterSchedules[key].includes(newSlot)) masterSchedules[key].push(newSlot);
    }

    return NextResponse.json({ success: true, slots: masterSchedules[key] });
}
