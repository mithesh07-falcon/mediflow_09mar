"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Video,
    Users,
    Stethoscope,
    Check,
    Heart,
    Bone,
    Eye,
    Thermometer,
    Smile,
    Ear,
    Activity,
    Brain,
    Sparkles,
    Wallet,
    MapPin,
    Loader2,
    QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ElderAppointmentSelector, AppointmentRequest } from "@/components/elderly/ElderAppointmentSelector";
import { detectBodyPart } from "@/ai/flows/ai-body-part-detection";

export default function BookAppointmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [doctorMatch, setDoctorMatch] = useState<AppointmentRequest | null>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [consultMode, setConsultMode] = useState<"clinic" | "video">("clinic");

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch("/api/admin/staff");
                const data = await res.json();
                if (data.staff) setStaff(data.staff);
            } catch (err) {
                console.error("Failed to fetch clinical staff", err);
            }
        };
        fetchStaff();

        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (!user.isElderly) router.push("/dashboard/patient");
    }, [router]);

    const getDoctorForSpecialist = (specialist: string, predictedName?: string) => {
        if (predictedName && staff.some(s => s.name === predictedName)) {
            return predictedName;
        }

        const specLower = specialist?.toLowerCase().trim();
        console.log(`[Lookup] Searching for: ${specialist}. Predicted: ${predictedName}`);

        const match = staff.find(s =>
            s.role === 'doctor' &&
            s.specialization?.toLowerCase().trim() === specLower
        );

        if (match) return match.name;

        // Second pass: partial match
        const partialMatch = staff.find(s =>
            s.role === 'doctor' &&
            s.specialization?.toLowerCase().includes(specLower || "")
        );
        if (partialMatch) return partialMatch.name;

        return staff.find(s => s.role === 'doctor')?.name || "DR. ROBERT (GENERAL)";
    };

    const getAppointmentTime = (timePref: string) => {
        if (timePref === "morning") return "Tomorrow at 10:30 AM";
        if (timePref === "afternoon") return "Tomorrow at 2:15 PM";
        return "Tomorrow at 6:00 PM";
    };

    const handleSearch = (req: AppointmentRequest) => {
        setLoading(true);
        // Simulate API search latency
        setTimeout(() => {
            setLoading(false);
            setDoctorMatch(req);
        }, 1500);
    };

    const handleBook = () => {
        setLoading(true);
        // Simulate API booking step
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            // Wait a few seconds, then take them back to dashboard
            setTimeout(() => router.push('/dashboard/elderly'), 4000);
        }, 1500);
    };

    const getSymptomIcon = (symptomId: string) => {
        const iconMap: Record<string, any> = {
            "heart": { icon: Heart, color: "text-red-500", bg: "bg-red-50" },
            "bones": { icon: Bone, color: "text-orange-500", bg: "bg-orange-50" },
            "eyes": { icon: Eye, color: "text-blue-500", bg: "bg-blue-50" },
            "fever": { icon: Thermometer, color: "text-green-500", bg: "bg-green-50" },
            "dental": { icon: Smile, color: "text-purple-500", bg: "bg-purple-50" },
            "ent": { icon: Ear, color: "text-yellow-500", bg: "bg-yellow-50" },
            "stomach": { icon: Activity, color: "text-amber-500", bg: "bg-amber-50" },
            "neuro": { icon: Brain, color: "text-indigo-500", bg: "bg-indigo-50" },
            "skin": { icon: Sparkles, color: "text-pink-500", bg: "bg-pink-50" },
        };
        return iconMap[symptomId] || { icon: Stethoscope, color: "text-slate-400", bg: "bg-slate-50" };
    };

    // SUCCESS SCREEN
    if (success) {
        const iconData = doctorMatch ? getSymptomIcon(doctorMatch.symptomId) : { icon: Stethoscope, color: "text-white", bg: "bg-green-500" };
        const Icon = iconData.icon;

        return (
            <div className="min-h-screen bg-green-50 text-black p-10 flex flex-col items-center justify-center space-y-12">
                <div className="relative group">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative h-56 w-56 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center border-[12px] border-green-800 shadow-2xl transform hover:scale-110 transition-transform">
                        <Icon className="h-28 w-28 text-white drop-shadow-lg" />
                    </div>
                </div>
                <div className="space-y-4 text-center">
                    <h1 className="text-8xl font-black text-green-900 uppercase leading-tight tracking-tighter">
                        Success!
                    </h1>
                    <p className="text-5xl font-black text-green-700 uppercase">Confirmed</p>
                </div>
                <div className="p-12 border-[10px] border-black rounded-[4rem] bg-white shadow-2xl max-w-4xl w-full text-center space-y-8">
                    <p className="text-4xl font-bold text-slate-700 leading-tight">
                        Your appointment with <span className="text-black font-black underline">{getDoctorForSpecialist(doctorMatch?.specialist || "", doctorMatch?.predictedDoctorName)}</span> ({doctorMatch?.specialist}) has been successfully booked for the <span className="text-green-600">{doctorMatch?.timePreferenceLabel}</span>.
                    </p>
                    <div className="pt-8 border-t-[6px] border-slate-100 flex items-center justify-center gap-4">
                        <div className="h-6 w-6 bg-green-500 rounded-full animate-ping" />
                        <p className="text-2xl font-black text-slate-400 uppercase tracking-widest">Redirecting you home...</p>
                    </div>
                </div>
            </div>
        );
    }

    // SEARCH RESULT SCREEN
    if (doctorMatch) {
        const doctorName = getDoctorForSpecialist(doctorMatch.specialist, doctorMatch.predictedDoctorName);
        const apptTime = getAppointmentTime(doctorMatch.timePreferenceCode);
        const iconData = getSymptomIcon(doctorMatch.symptomId);
        const SpecialistIcon = iconData.icon;
        const fee = consultMode === "video" ? 300 : 500;

        return (
            <div className="min-h-screen bg-white text-black p-10 space-y-16">
                <Button
                    className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8"
                    onClick={() => setDoctorMatch(null)}
                >
                    <ArrowLeft className="h-16 w-16" />
                    START OVER
                </Button>

                <h1 className="text-7xl font-black uppercase underline decoration-[12px] text-center">
                    We Found a Doctor!
                </h1>

                <div className="p-16 border-[12px] border-black rounded-[5rem] space-y-16 bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-10">
                        <SpecialistIcon className="h-64 w-64" />
                    </div>

                    {doctorMatch.reason && (
                        <div className="relative z-10 bg-primary/10 border-[6px] border-primary/20 rounded-[3rem] p-10 flex gap-8 items-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="h-24 w-24 bg-primary text-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
                                <Sparkles className="h-12 w-12" />
                            </div>
                            <p className="text-4xl font-black text-primary leading-tight lowercase first-letter:uppercase">
                                "{doctorMatch.reason}"
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col items-center text-center gap-10 relative z-10">
                        <div className={cn(
                            "h-72 w-72 rounded-[4rem] flex items-center justify-center border-[12px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-2 transition-transform",
                            iconData.bg
                        )}>
                            <SpecialistIcon className={cn("h-40 w-40 drop-shadow-md", iconData.color)} />
                        </div>
                        <div className="space-y-4">
                            <p className="text-3xl font-black text-slate-400 uppercase tracking-[0.2em]">Medical Specialist Found</p>
                            <h2 className="text-8xl font-black mb-4 uppercase tracking-tighter text-black">{doctorName}</h2>
                            <div className="inline-block px-8 py-3 bg-black text-white rounded-full text-3xl font-black uppercase">
                                {doctorMatch.specialist}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-[6px] border-slate-200 rounded-[3rem] p-10 flex flex-col gap-6 w-full max-w-4xl mx-auto">
                        <div className="flex items-center gap-8">
                            <Calendar className="h-16 w-16 text-primary" />
                            <p className="text-5xl font-black uppercase text-black">{apptTime}</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <Wallet className="h-16 w-16 text-primary" />
                            <p className="text-5xl font-black uppercase text-black">Fee: ₹{fee}</p>
                        </div>
                    </div>

                    <div className="space-y-8 pt-12 border-t-[8px] border-black/10 max-w-5xl mx-auto w-full">
                        <h3 className="text-4xl font-black text-center uppercase">1. Choose Appointment Type</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <Button
                                onClick={() => setConsultMode("clinic")}
                                variant={consultMode === "clinic" ? "default" : "outline"}
                                className={cn(
                                    "h-32 text-4xl font-black rounded-[2rem] border-[8px]",
                                    consultMode === "clinic" ? "bg-black text-white border-black" : "border-slate-300 text-slate-500"
                                )}
                            >
                                <MapPin className="mr-4 w-12 h-12" /> IN CLINIC
                            </Button>
                            <Button
                                onClick={() => setConsultMode("video")}
                                variant={consultMode === "video" ? "default" : "outline"}
                                className={cn(
                                    "h-32 text-4xl font-black rounded-[2rem] border-[8px]",
                                    consultMode === "video" ? "bg-black text-white border-black" : "border-slate-300 text-slate-500"
                                )}
                            >
                                <Video className="mr-4 w-12 h-12" /> VIDEO CALL
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-8 pt-12 border-t-[8px] border-black/10 max-w-5xl mx-auto w-full">
                        <h3 className="text-5xl font-black text-center uppercase text-green-700">2. Pay to Confirm</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Button
                                onClick={handleBook}
                                disabled={loading}
                                className="h-40 text-4xl font-black bg-green-600 hover:bg-green-700 text-white rounded-[3rem] border-[10px] border-green-800 shadow-xl flex flex-col gap-2 items-center justify-center transition-transform active:scale-95"
                            >
                                {loading ? <Loader2 className="h-16 w-16 animate-spin" /> : (
                                    <>
                                        <Wallet className="h-12 w-12" />
                                        FAMILY WALLET (-₹{fee})
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleBook}
                                disabled={loading}
                                variant="outline"
                                className="h-40 text-4xl font-black bg-white text-black hover:bg-slate-50 rounded-[3rem] border-[10px] border-black shadow-xl flex flex-col gap-2 items-center justify-center transition-transform active:scale-95"
                            >
                                {loading ? <Loader2 className="h-16 w-16 animate-spin" /> : (
                                    <>
                                        <QrCode className="h-12 w-12" />
                                        PAY VIA UPI
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // INITIAL SELECTION SCREEN
    return (
        <div className="min-h-screen bg-slate-100 text-black p-10 space-y-16 flex flex-col">
            <Button
                className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8 self-start hover:scale-105 transition-transform"
                onClick={() => router.push('/dashboard/elderly')}
            >
                <ArrowLeft className="h-16 w-16" />
                GO HOME
            </Button>

            <div className="flex-1 flex items-center justify-center pb-20">
                <div className="w-full max-w-4xl transform scale-125 origin-top">
                    <ElderAppointmentSelector
                        onSearchDoctors={handleSearch}
                        isLoading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
