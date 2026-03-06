
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Droplet,
    Activity,
    Thermometer,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Reading {
    id: string;
    type: "blood_sugar" | "blood_pressure";
    value: string;
    timestamp: string;
    status: "normal" | "abnormal";
}

export default function ElderlyHealthTrackingPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<Reading[]>([
        { id: "1", type: "blood_sugar", value: "115 mg/dL", timestamp: "Today 08:30 AM", status: "normal" },
        { id: "2", type: "blood_pressure", value: "135/85 mmHg", timestamp: "Yesterday 07:00 PM", status: "normal" },
        { id: "3", type: "blood_sugar", value: "185 mg/dL", timestamp: "Mar 05, 09:00 PM", status: "abnormal" },
    ]);

    const [newValue, setNewValue] = useState("");
    const [newType, setNewType] = useState<"blood_sugar" | "blood_pressure">("blood_sugar");

    const addReading = () => {
        if (!newValue.trim()) return;

        // Simple mock logic for normalization ranges
        let status: "normal" | "abnormal" = "normal";
        if (newType === "blood_sugar") {
            const val = parseInt(newValue);
            if (val > 140 || val < 70) status = "abnormal";
        }

        const newReading: Reading = {
            id: Date.now().toString(),
            type: newType,
            value: `${newValue} ${newType === 'blood_sugar' ? 'mg/dL' : 'mmHg'}`,
            timestamp: "Just now",
            status: status
        };

        setReadings([newReading, ...readings]);
        setNewValue("");
    };

    return (
        <div className="min-h-screen bg-white text-black p-10 space-y-16">
            <Button
                className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8"
                onClick={() => router.push('/dashboard/elderly')}
            >
                <ArrowLeft className="h-16 w-16" />
                GO HOME
            </Button>

            <h1 className="text-8xl font-black uppercase underline decoration-[12px]">Health Tracking</h1>

            {/* Quick Add Section */}
            <div className="p-16 border-[12px] border-black rounded-[5rem] bg-slate-50 space-y-12">
                <h2 className="text-6xl font-black uppercase underline">New Reading</h2>

                <div className="grid grid-cols-2 gap-10">
                    <Button
                        className={`h-40 text-5xl font-black rounded-[3rem] border-[10px] ${newType === 'blood_sugar' ? 'bg-black text-white border-black' : 'bg-white text-black border-zinc-200'}`}
                        onClick={() => setNewType("blood_sugar")}
                    >
                        <Droplet className="h-16 w-16 mr-6" /> Blood Sugar
                    </Button>
                    <Button
                        className={`h-40 text-5xl font-black rounded-[3rem] border-[10px] ${newType === 'blood_pressure' ? 'bg-black text-white border-black' : 'bg-white text-black border-zinc-200'}`}
                        onClick={() => setNewType("blood_pressure")}
                    >
                        <Activity className="h-16 w-16 mr-6" /> Blood Pressure
                    </Button>
                </div>

                <div className="space-y-6">
                    <Label className="text-4xl font-black uppercase underline">Enter Numbers</Label>
                    <Input
                        className="h-40 text-7xl font-black border-[10px] border-black rounded-[3rem] bg-white text-center"
                        placeholder="000"
                        type="number"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                    />
                </div>

                <Button
                    className="w-full h-40 text-7xl font-black bg-black text-white border-[12px] border-black rounded-[3rem] flex items-center justify-center gap-8"
                    onClick={addReading}
                >
                    <Plus className="h-24 w-24" />
                    SAVE NOW
                </Button>
            </div>

            {/* History section */}
            <div className="space-y-10 pt-16 border-t-[12px] border-black">
                <h2 className="text-7xl font-black uppercase">Recent Records</h2>
                {readings.map((r) => (
                    <div key={r.id} className="p-12 border-[12px] border-black rounded-[4rem] flex justify-between items-center">
                        <div className="flex items-center gap-12">
                            <div className={`h-32 w-32 rounded-3xl flex items-center justify-center ${r.type === 'blood_sugar' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                {r.type === 'blood_sugar' ? <Droplet className="h-20 w-20" /> : <Activity className="h-20 w-20" />}
                            </div>
                            <div className="space-y-2">
                                <p className="text-4xl font-bold opacity-60 uppercase">{r.timestamp}</p>
                                <h3 className="text-7xl font-black uppercase">{r.value}</h3>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            {r.status === 'normal' ? (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-24 w-24 text-green-600" />
                                    <span className="text-4xl font-black text-green-700">GOOD</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-24 w-24 text-red-600 animate-pulse" />
                                    <span className="text-4xl font-black text-red-700">HIGH</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
