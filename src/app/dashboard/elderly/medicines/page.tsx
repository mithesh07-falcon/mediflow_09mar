
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  duration: string;
  takenCount: number;
  totalCount: number;
  photoUrl: string;
  timeLabel: string;
  takenToday: boolean;
}

export default function ElderlyMedicinesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [meds, setMeds] = useState<Medication[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (!user.isElderly) {
      router.push("/dashboard/patient/meds");
      return;
    }

    const savedMeds = JSON.parse(localStorage.getItem("mediflow_elderly_meds") || "[]");
    if (savedMeds.length === 0) {
      const initialMeds: Medication[] = [
        {
          id: "1",
          name: "BP Medicine (Amlodipine)",
          dosage: "5mg",
          duration: "30 days",
          takenCount: 12,
          totalCount: 30,
          photoUrl: "https://picsum.photos/seed/pills1/400/300",
          timeLabel: "08:00 AM",
          takenToday: false
        },
        {
          id: "2",
          name: "Sugar Control (Metformin)",
          dosage: "500mg",
          duration: "15 days",
          takenCount: 4,
          totalCount: 15,
          photoUrl: "https://picsum.photos/seed/pills2/400/300",
          timeLabel: "01:00 PM",
          takenToday: false
        },
        {
          id: "3",
          name: "Heart Care (Atorvastatin)",
          dosage: "10mg",
          duration: "60 days",
          takenCount: 45,
          totalCount: 60,
          photoUrl: "https://picsum.photos/seed/pills3/400/300",
          timeLabel: "08:00 PM",
          takenToday: false
        }
      ];
      setMeds(initialMeds);
      localStorage.setItem("mediflow_elderly_meds", JSON.stringify(initialMeds));
    } else {
      setMeds(savedMeds);
    }
  }, [router]);

  const toggleMed = (id: string) => {
    const updated = meds.map(m => {
      if (m.id === id) {
        const alreadyTaken = m.takenToday;
        if (alreadyTaken) return m; // Allow marking as taken but not undoing for simplicity/safety

        const newCount = m.takenCount + 1;

        if (newCount === m.totalCount) {
          toast({
            title: "COURSE COMPLETED! 🎉",
            description: `Great job! You have finished your course of ${m.name}.`,
          });
        }

        return {
          ...m,
          takenToday: true,
          takenCount: Math.min(newCount, m.totalCount)
        };
      }
      return m;
    });

    setMeds(updated);
    localStorage.setItem("mediflow_elderly_meds", JSON.stringify(updated));

    // Guardian Syncing: Update status for guardian view
    localStorage.setItem("mediflow_guardian_medication_alert", JSON.stringify({
      patient: "Senior User",
      medId: id,
      timestamp: new Date().toISOString()
    }));
  };

  return (
    <div className="min-h-screen bg-white text-black p-10 space-y-16 touch-manipulation">
      <Button
        className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8 shadow-2xl transition-all active:scale-90"
        onClick={() => router.push('/dashboard/elderly')}
      >
        <ArrowLeft className="h-20 w-20" />
        GO HOME
      </Button>

      <div className="flex justify-between items-end">
        <h1 className="text-9xl font-black uppercase tracking-tighter underline decoration-[20px] decoration-black/10 underline-offset-8">My Pills</h1>
        <div className="h-40 w-40 bg-black text-white rounded-full flex items-center justify-center border-[10px] border-black shadow-xl">
          <Pill className="h-20 w-20" />
        </div>
      </div>

      <div className="space-y-14">
        {meds.map((med) => (
          <div key={med.id} className={`p-14 rounded-[5rem] border-[15px] border-black flex flex-col gap-12 transition-all ${med.takenToday ? 'bg-slate-100 opacity-60' : 'bg-white shadow-2xl'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-14">
                <div className="h-60 w-60 rounded-[4rem] border-[10px] border-black overflow-hidden relative shadow-inner">
                  <img src={med.photoUrl} alt={med.name} className="object-cover w-full h-full" />
                </div>
                <div className="space-y-4">
                  <p className="text-5xl font-black uppercase text-primary flex items-center gap-4">
                    <Clock className="h-10 w-10" /> {med.timeLabel}
                  </p>
                  <h3 className="text-8xl font-black uppercase tracking-tight">{med.name}</h3>
                  <div className="flex items-center gap-8 pt-4">
                    <span className="text-4xl font-black bg-black text-white px-8 py-4 rounded-3xl uppercase">{med.dosage}</span>
                    <span className="text-4xl font-black bg-slate-200 px-8 py-4 rounded-3xl uppercase">{med.duration}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-center gap-6 pr-8">
                <p className="text-4xl font-black uppercase tracking-widest text-slate-400">Course Progress</p>
                <div className="h-52 w-52 bg-white text-black border-[15px] border-black rounded-full flex flex-col items-center justify-center shadow-xl">
                  <h4 className="text-7xl font-black">{med.takenCount}</h4>
                  <div className="h-2 w-20 bg-black/10 my-1 rounded-full" />
                  <h5 className="text-4xl font-black opacity-30">{med.totalCount}</h5>
                </div>
              </div>
            </div>

            <Button
              className={`h-48 text-7xl font-black rounded-[4rem] border-[15px] w-full flex items-center justify-center gap-10 transition-all ${med.takenToday
                ? 'bg-green-600 border-green-800 text-white cursor-default'
                : 'bg-black border-black text-white shadow-2xl active:scale-95'
                }`}
              onClick={() => toggleMed(med.id)}
              disabled={med.takenToday}
            >
              {med.takenToday ? <CheckCircle2 className="h-28 w-28" /> : <Pill className="h-28 w-28" />}
              {med.takenToday ? "TAKEN" : "TAKE NOW"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
