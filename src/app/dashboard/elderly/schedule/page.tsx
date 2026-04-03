"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, Pill, Calendar, Video, MapPin, Sun, Sunrise, Moon, User, Heart, Bone, Eye, Thermometer, Smile, Ear, Activity, Brain, Sparkles, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  photoUrl: string;
  pillPhotoUrl: string; // Real pill appearance
  timeLabel: string; // Morning, Afternoon, Night
  timeIcon: any;
  takenToday: boolean;
}

interface Appointment {
  id: number;
  doctor: string;
  specialist: string;
  date: string;
  time: string;
  type: string;
  symptoms: string;
}

export default function ElderSchedulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (!user.isElderly) {
      router.push("/dashboard/patient");
      return;
    }

    // Load Medications
    const savedMeds = JSON.parse(localStorage.getItem("mediflow_elderly_meds") || "[]");
    const initialMeds: Medication[] = [
      {
        id: "m1",
        name: "BP Medicine",
        dosage: "5mg",
        instructions: "Take after breakfast with water",
        photoUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
        pillPhotoUrl: "https://images.unsplash.com/photo-1550572017-ed200f54dd0a?w=200&h=200&fit=crop",
        timeLabel: "Morning",
        timeIcon: Sunrise,
        takenToday: false
      },
      {
        id: "m2",
        name: "Sugar Control",
        dosage: "500mg",
        instructions: "Take during lunch",
        photoUrl: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=400&h=300&fit=crop",
        pillPhotoUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=200&h=200&fit=crop",
        timeLabel: "Afternoon",
        timeIcon: Sun,
        takenToday: false
      },
      {
        id: "m3",
        name: "Heart Care",
        dosage: "10mg",
        instructions: "Take before sleeping",
        photoUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e55916?w=400&h=300&fit=crop",
        pillPhotoUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=200&h=200&fit=crop",
        timeLabel: "Night",
        timeIcon: Moon,
        takenToday: false
      }
    ];
    setMeds(savedMeds.length > 0 ? savedMeds : initialMeds);

    // Load Appointments
    const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
    setAppointments(savedAppts.filter((a: any) => a.patientEmail === user.email));
  }, [router]);

  const toggleMed = (id: string) => {
    const updated = meds.map(m => m.id === id ? { ...m, takenToday: !m.takenToday } : m);
    setMeds(updated);
    localStorage.setItem("mediflow_elderly_meds", JSON.stringify(updated));
    if (!meds.find(m => m.id === id)?.takenToday) {
        toast({ title: "GREAT JOB!", description: "You took your medicine." });
    }
  };

  const getSymptomIcon = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('heart') || s.includes('cardio')) return Heart;
    if (s.includes('bone') || s.includes('ortho')) return Bone;
    if (s.includes('eye') || s.includes('opthal')) return Eye;
    if (s.includes('dent')) return Smile;
    if (s.includes('neuro')) return Brain;
    if (s.includes('skin') || s.includes('derma')) return Sparkles;
    return Stethoscope;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-black p-8 pb-32 space-y-16">
      <header className="flex items-center justify-between">
        <Button
          className="h-28 px-12 text-4xl font-black bg-black text-white rounded-3xl border-8 border-black flex items-center gap-6 shadow-xl active:scale-90"
          onClick={() => router.push('/dashboard/elderly')}
        >
          <ArrowLeft className="h-14 w-14" /> GO BACK
        </Button>
        <h1 className="text-8xl font-black uppercase tracking-tighter">My Schedule</h1>
      </header>

      {/* SECTION 1: DOCTOR APPOINTMENTS */}
      <section className="space-y-10">
        <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center border-8 border-black shadow-lg">
                <Calendar className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-6xl font-black uppercase">Doctor Meetings</h2>
        </div>

        {appointments.length === 0 ? (
            <div className="p-20 border-8 border-dashed border-slate-300 rounded-[4rem] text-center">
                <p className="text-4xl font-black text-slate-400 uppercase">No meetings soon</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-10">
                {appointments.map((appt) => {
                    const SpecIcon = getSymptomIcon(appt.specialist);
                    return (
                        <div key={appt.id} className="bg-white border-[12px] border-black rounded-[5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                            <div className="md:w-1/3 bg-slate-100 flex flex-col items-center justify-center p-12 border-b-[12px] md:border-b-0 md:border-r-[12px] border-black">
                                <div className="h-56 w-56 bg-white rounded-full border-[10px] border-black flex items-center justify-center shadow-xl mb-6 overflow-hidden">
                                    <User className="h-32 w-32 text-slate-300" />
                                </div>
                                <h3 className="text-5xl font-black uppercase text-center mb-2">{appt.doctor}</h3>
                                <div className="flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full">
                                    <SpecIcon className="h-8 w-8" />
                                    <span className="text-2xl font-black uppercase">{appt.specialist}</span>
                                </div>
                            </div>
                            <div className="flex-1 p-12 flex flex-col justify-between space-y-10">
                                <div>
                                    <p className="text-3xl font-black text-slate-400 uppercase tracking-widest mb-2">When to meet:</p>
                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="text-7xl font-black text-blue-600 uppercase italic underline decoration-blue-200 underline-offset-8">{appt.date}</div>
                                        <div className="text-7xl font-black text-black bg-yellow-400 px-8 py-2 rounded-2xl border-4 border-black border-b-[10px]">{appt.time}</div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-6">
                                    <Button className="flex-1 h-32 text-5xl font-black bg-green-600 hover:bg-green-700 text-white border-[10px] border-green-950 rounded-[2.5rem] shadow-[0_15px_0px_0px_rgba(5,46,22,1)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-6">
                                        <Video className="h-14 w-14" /> JOIN CALL
                                    </Button>
                                    <Button variant="outline" className="flex-1 h-32 text-5xl font-black border-[10px] border-black rounded-[2.5rem] shadow-[0_15px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-6">
                                        <MapPin className="h-14 w-14" /> GO THERE
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </section>

      {/* SECTION 2: DAILY MEDICINES */}
      <section className="space-y-10">
        <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-orange-500 rounded-full flex items-center justify-center border-8 border-black shadow-lg">
                <Pill className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-6xl font-black uppercase">My Daily Pills</h2>
        </div>

        <div className="space-y-20">
            {['Morning', 'Afternoon', 'Night'].map((time) => {
                const timeIcon = time === 'Morning' ? Sunrise : time === 'Afternoon' ? Sun : Moon;
                const timeColor = time === 'Morning' ? 'bg-orange-100 text-orange-600' : time === 'Afternoon' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-900 text-white';
                const medsForTime = meds.filter(m => m.timeLabel === time);

                return (
                    <div key={time} className="space-y-8">
                        <div className={cn("inline-flex items-center gap-6 px-10 py-4 rounded-full border-8 border-black shadow-lg", timeColor)}>
                            {/* @ts-ignore */}
                            <timeIcon className="h-12 w-12" />
                            <span className="text-5xl font-black uppercase">{time}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {medsForTime.map((med) => (
                                <div key={med.id} className={cn(
                                    "p-10 border-[10px] border-black rounded-[4rem] flex items-center gap-10 transition-all",
                                    med.takenToday ? "bg-slate-100 opacity-60 line-through grayscale" : "bg-white shadow-2xl hover:scale-[1.02]"
                                )}>
                                    <div className="h-44 w-44 rounded-[2rem] border-8 border-black overflow-hidden bg-slate-50 shrink-0">
                                        <img src={med.pillPhotoUrl} className="w-full h-full object-cover" />
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-6xl font-black uppercase">{med.name}</h3>
                                        <p className="text-3xl font-bold text-slate-500 uppercase">{med.instructions}</p>
                                        <span className="inline-block px-4 py-1 bg-black text-white text-2xl font-black rounded-lg uppercase">{med.dosage}</span>
                                    </div>

                                    <button 
                                        onClick={() => toggleMed(med.id)}
                                        className={cn(
                                            "h-32 w-32 rounded-[2rem] border-[10px] border-black flex items-center justify-center transition-all shadow-xl",
                                            med.takenToday ? "bg-green-500 border-green-800" : "bg-white hover:bg-slate-50"
                                        )}
                                    >
                                        {med.takenToday && <CheckCircle2 className="h-16 w-16 text-white" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </section>
    </div>
  );
}
