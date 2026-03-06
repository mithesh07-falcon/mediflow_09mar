
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, Utensils, ClipboardCheck } from "lucide-react";

interface ChecklistItem {
    id: string;
    task: string;
    category: "medicine" | "food" | "activity";
    completed: boolean;
    time: string;
    details?: string;
}

export default function ElderlyChecklistPage() {
    const router = useRouter();
    const [items, setItems] = useState<ChecklistItem[]>([
        { id: "1", task: "Blood Pressure Medicine", category: "medicine", completed: true, time: "08:00 AM", details: "Take with water" },
        { id: "2", task: "Morning Walk", category: "activity", completed: false, time: "09:00 AM", details: "15 minutes in park" },
        { id: "3", task: "Breakfast (Oats & Fruit)", category: "food", completed: false, time: "09:30 AM", details: "Low sugar" },
        { id: "4", task: "Diabetes Medicine", category: "medicine", completed: false, time: "01:00 PM", details: "After lunch" },
    ]);

    const toggleItem = (id: string) => {
        setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
    };

    const completedCount = items.filter(i => i.completed).length;

    return (
        <div className="min-h-screen bg-white text-black p-10 space-y-16">
            <div className="flex justify-between items-center">
                <Button
                    className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8"
                    onClick={() => router.push('/dashboard/elderly')}
                >
                    <ArrowLeft className="h-16 w-16" />
                    GO BACK
                </Button>

                <div className="h-40 px-12 bg-black text-white rounded-[3rem] flex flex-col justify-center items-center">
                    <p className="text-2xl font-bold uppercase">Progress</p>
                    <h2 className="text-6xl font-black">{completedCount}/{items.length}</h2>
                </div>
            </div>

            <h1 className="text-8xl font-black uppercase underline decoration-[12px]">Daily Checklist</h1>

            <div className="space-y-10">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`p-12 rounded-[4rem] border-[12px] border-black transition-all ${item.completed ? 'bg-slate-50 opacity-60' : 'bg-white shadow-2xl'}`}
                        onClick={() => toggleItem(item.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-12">
                                <div className={`h-32 w-32 rounded-3xl flex items-center justify-center ${item.category === 'medicine' ? 'bg-blue-100 text-blue-800' :
                                        item.category === 'food' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {item.category === 'medicine' ? <Clock className="h-20 w-20" /> :
                                        item.category === 'food' ? <Utensils className="h-20 w-20" /> : <ClipboardCheck className="h-20 w-20" />}
                                </div>
                                <div>
                                    <p className="text-4xl font-black uppercase">{item.time} - {item.category}</p>
                                    <h3 className="text-6xl font-black uppercase">{item.task}</h3>
                                    {item.details && <p className="text-3xl font-bold opacity-60 mt-2">{item.details}</p>}
                                </div>
                            </div>

                            <div className="flex items-center">
                                {item.completed ? (
                                    <CheckCircle2 className="h-32 w-32 text-green-600" />
                                ) : (
                                    <div className="h-32 w-32 rounded-full border-[10px] border-black flex items-center justify-center">
                                        <Circle className="h-20 w-20 opacity-10" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
