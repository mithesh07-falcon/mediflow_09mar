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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 text-white p-10 flex flex-col items-center justify-center space-y-12 relative overflow-hidden">
                {/* Background glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 bg-emerald-500" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] opacity-20 bg-green-400" />
                </div>

                <div className="relative group z-10">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
                    <div className="relative h-48 w-48 md:h-56 md:w-56 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center border-4 border-white/20 shadow-[0_0_80px_20px_rgba(16,185,129,0.4)] transform hover:scale-110 transition-transform backdrop-blur-xl">
                        <Icon className="h-24 w-24 md:h-28 md:w-28 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                    </div>
                </div>
                <div className="space-y-4 text-center z-10">
                    <h1 className="text-6xl md:text-8xl font-black uppercase leading-tight tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                        Success!
                    </h1>
                    <p className="text-3xl md:text-5xl font-black text-emerald-400 uppercase">Confirmed</p>
                </div>
                <div className="relative z-10 p-8 md:p-12 border-2 border-white/10 rounded-[3rem] bg-white/5 backdrop-blur-2xl shadow-2xl max-w-4xl w-full text-center space-y-8">
                    <p className="text-2xl md:text-3xl font-bold text-white/80 leading-tight">
                        Your appointment with <span className="text-white font-black">{getDoctorForSpecialist(doctorMatch?.specialist || "", doctorMatch?.predictedDoctorName)}</span> ({doctorMatch?.specialist}) has been successfully booked for the <span className="text-emerald-400 font-black">{doctorMatch?.timePreferenceLabel}</span>.
                    </p>
                    <div className="pt-8 border-t border-white/10 flex items-center justify-center gap-4">
                        <div className="h-4 w-4 bg-emerald-500 rounded-full animate-ping" />
                        <p className="text-xl md:text-2xl font-black text-white/30 uppercase tracking-widest">Redirecting you home...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── GLASSMORPHISM COLOR MAP ──────────────────────────────────────────
    const glassColorMap: Record<string, { gradient: string; glow: string; iconBg: string; accent: string }> = {
        heart:   { gradient: "from-rose-500/80 via-red-400/60 to-pink-500/70",   glow: "shadow-[0_0_80px_20px_rgba(244,63,94,0.35)]",  iconBg: "bg-gradient-to-br from-rose-400 to-red-600",   accent: "text-rose-200" },
        bones:   { gradient: "from-orange-500/80 via-amber-400/60 to-yellow-500/70", glow: "shadow-[0_0_80px_20px_rgba(251,146,60,0.35)]", iconBg: "bg-gradient-to-br from-orange-400 to-amber-600", accent: "text-orange-200" },
        eyes:    { gradient: "from-blue-500/80 via-cyan-400/60 to-sky-500/70",    glow: "shadow-[0_0_80px_20px_rgba(59,130,246,0.35)]",  iconBg: "bg-gradient-to-br from-blue-400 to-cyan-600",   accent: "text-blue-200" },
        fever:   { gradient: "from-emerald-500/80 via-green-400/60 to-teal-500/70", glow: "shadow-[0_0_80px_20px_rgba(16,185,129,0.35)]", iconBg: "bg-gradient-to-br from-emerald-400 to-green-600", accent: "text-emerald-200" },
        dental:  { gradient: "from-violet-500/80 via-purple-400/60 to-fuchsia-500/70", glow: "shadow-[0_0_80px_20px_rgba(139,92,246,0.35)]", iconBg: "bg-gradient-to-br from-violet-400 to-purple-600", accent: "text-violet-200" },
        ent:     { gradient: "from-yellow-500/80 via-amber-300/60 to-orange-400/70", glow: "shadow-[0_0_80px_20px_rgba(234,179,8,0.35)]",  iconBg: "bg-gradient-to-br from-yellow-400 to-amber-600", accent: "text-yellow-200" },
        stomach: { gradient: "from-amber-500/80 via-orange-400/60 to-yellow-500/70", glow: "shadow-[0_0_80px_20px_rgba(245,158,11,0.35)]", iconBg: "bg-gradient-to-br from-amber-400 to-orange-600", accent: "text-amber-200" },
        neuro:   { gradient: "from-indigo-500/80 via-violet-400/60 to-purple-500/70", glow: "shadow-[0_0_80px_20px_rgba(99,102,241,0.35)]", iconBg: "bg-gradient-to-br from-indigo-400 to-violet-600", accent: "text-indigo-200" },
        skin:    { gradient: "from-pink-500/80 via-rose-400/60 to-fuchsia-500/70", glow: "shadow-[0_0_80px_20px_rgba(236,72,153,0.35)]", iconBg: "bg-gradient-to-br from-pink-400 to-rose-600", accent: "text-pink-200" },
    };

    // SEARCH RESULT SCREEN
    if (doctorMatch) {
        const doctorName = getDoctorForSpecialist(doctorMatch.specialist, doctorMatch.predictedDoctorName);
        const apptTime = getAppointmentTime(doctorMatch.timePreferenceCode);
        const iconData = getSymptomIcon(doctorMatch.symptomId);
        const SpecialistIcon = iconData.icon;
        const fee = consultMode === "video" ? 300 : 500;
        const glass = glassColorMap[doctorMatch.symptomId] || glassColorMap.fever;

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-10 space-y-10 relative overflow-hidden">
                {/* Animated Background Orbs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className={cn("absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 animate-pulse", `bg-gradient-to-br ${glass.gradient}`)} />
                    <div className={cn("absolute -bottom-60 -right-60 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 animate-pulse", `bg-gradient-to-br ${glass.gradient}`)} style={{ animationDelay: "1s" }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[200px] opacity-10 bg-white" />
                </div>

                {/* Back Button — Glassmorphism */}
                <Button
                    className="relative h-20 md:h-24 px-10 md:px-16 text-3xl md:text-4xl font-black rounded-[2rem] flex items-center gap-6 border-2 border-white/10 bg-white/5 backdrop-blur-xl text-white/90 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg"
                    onClick={() => setDoctorMatch(null)}
                >
                    <ArrowLeft className="h-10 w-10 md:h-12 md:w-12" />
                    START OVER
                </Button>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-black uppercase text-center tracking-tight">
                    <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent drop-shadow-2xl">
                        We Found a Doctor!
                    </span>
                </h1>

                {/* Main Glass Card */}
                <div className="relative max-w-5xl mx-auto rounded-[3rem] md:rounded-[4rem] border-2 border-white/10 bg-white/5 backdrop-blur-2xl p-8 md:p-14 space-y-12 shadow-2xl overflow-hidden">

                    {/* AI Reason Banner */}
                    {doctorMatch.reason && (
                        <div className="relative z-10 rounded-[2rem] p-6 md:p-8 flex gap-6 items-center border border-white/10 bg-white/5 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className={cn("h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center shrink-0 shadow-xl", glass.iconBg)}>
                                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white drop-shadow-md" />
                            </div>
                            <p className={cn("text-2xl md:text-3xl font-black leading-tight lowercase first-letter:uppercase", glass.accent)}>
                                &ldquo;{doctorMatch.reason}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* ── Hero: Specialist Icon + Doctor Name ─────────────────────── */}
                    <div className="flex flex-col items-center text-center gap-8 relative z-10 py-4">
                        {/* Glowing Specialist Icon */}
                        <div className="relative group">
                            {/* Outer Glow Ring */}
                            <div className={cn(
                                "absolute inset-0 rounded-[3rem] opacity-60 group-hover:opacity-90 transition-opacity duration-700 blur-xl",
                                glass.glow
                            )} />
                            {/* Pulsating ring */}
                            <div className={cn(
                                "absolute -inset-3 rounded-[3.5rem] border-2 border-white/20 animate-ping opacity-20"
                            )} />
                            {/* Glassmorphism Icon Card */}
                            <div className={cn(
                                "relative h-48 w-48 md:h-64 md:w-64 rounded-[3rem] flex items-center justify-center",
                                "border-2 border-white/20 bg-white/10 backdrop-blur-2xl",
                                "shadow-2xl transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-500",
                                glass.glow
                            )}>
                                {/* Inner gradient disc */}
                                <div className={cn("absolute inset-4 rounded-[2rem] opacity-40", glass.iconBg)} />
                                <SpecialistIcon className="relative z-10 h-24 w-24 md:h-32 md:w-32 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                            </div>
                        </div>

                        {/* Doctor Info */}
                        <div className="space-y-3">
                            <p className="text-lg md:text-xl font-bold uppercase tracking-[0.3em] text-white/40">
                                Medical Specialist Found
                            </p>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                                {doctorName}
                            </h2>
                            <div className={cn(
                                "inline-block px-8 py-3 rounded-full text-xl md:text-2xl font-black uppercase tracking-wider",
                                "border border-white/20 bg-white/10 backdrop-blur-xl text-white/90"
                            )}>
                                {doctorMatch.specialist}
                            </div>
                        </div>
                    </div>

                    {/* ── Appointment Details Glass Cards ─────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
                        <div className="flex items-center gap-5 p-6 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-lg">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", glass.iconBg)}>
                                <Calendar className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-white/40">Schedule</p>
                                <p className="text-2xl md:text-3xl font-black text-white/90">{apptTime}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-5 p-6 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-lg">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", glass.iconBg)}>
                                <Wallet className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase tracking-widest text-white/40">Consultation Fee</p>
                                <p className="text-2xl md:text-3xl font-black text-white/90">₹{fee}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Step 1: Appointment Type ────────────────────────────────── */}
                    <div className="space-y-6 pt-8 border-t border-white/10 max-w-4xl mx-auto w-full">
                        <h3 className="text-2xl md:text-3xl font-black text-center uppercase tracking-wider text-white/60">
                            1. Choose Appointment Type
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <button
                                onClick={() => setConsultMode("clinic")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-3 p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 group",
                                    consultMode === "clinic"
                                        ? "border-white/30 bg-white/15 backdrop-blur-xl shadow-xl scale-[1.03]"
                                        : "border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <MapPin className={cn("h-10 w-10 md:h-12 md:w-12 transition-colors", consultMode === "clinic" ? "text-white" : "text-white/40")} />
                                <span className={cn("text-2xl md:text-3xl font-black uppercase", consultMode === "clinic" ? "text-white" : "text-white/50")}>
                                    In Clinic
                                </span>
                                {consultMode === "clinic" && (
                                    <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-white/0 via-white to-white/0 mt-1" />
                                )}
                            </button>
                            <button
                                onClick={() => setConsultMode("video")}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-3 p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 group",
                                    consultMode === "video"
                                        ? "border-white/30 bg-white/15 backdrop-blur-xl shadow-xl scale-[1.03]"
                                        : "border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <Video className={cn("h-10 w-10 md:h-12 md:w-12 transition-colors", consultMode === "video" ? "text-white" : "text-white/40")} />
                                <span className={cn("text-2xl md:text-3xl font-black uppercase", consultMode === "video" ? "text-white" : "text-white/50")}>
                                    Video Call
                                </span>
                                {consultMode === "video" && (
                                    <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-white/0 via-white to-white/0 mt-1" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── Step 2: Pay to Confirm ──────────────────────────────────── */}
                    <div className="space-y-6 pt-8 border-t border-white/10 max-w-4xl mx-auto w-full">
                        <h3 className="text-2xl md:text-3xl font-black text-center uppercase tracking-wider text-emerald-400">
                            2. Pay to Confirm
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <Button
                                onClick={handleBook}
                                disabled={loading}
                                className={cn(
                                    "h-28 md:h-36 text-2xl md:text-3xl font-black rounded-[2rem] flex flex-col gap-2 items-center justify-center transition-all duration-300 active:scale-95",
                                    "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
                                    "border-2 border-emerald-400/30 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                                )}
                            >
                                {loading ? <Loader2 className="h-12 w-12 animate-spin" /> : (
                                    <>
                                        <Wallet className="h-8 w-8 md:h-10 md:w-10" />
                                        FAMILY WALLET (-₹{fee})
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleBook}
                                disabled={loading}
                                className={cn(
                                    "h-28 md:h-36 text-2xl md:text-3xl font-black rounded-[2rem] flex flex-col gap-2 items-center justify-center transition-all duration-300 active:scale-95",
                                    "bg-white/10 hover:bg-white/15 backdrop-blur-xl",
                                    "border-2 border-white/20 text-white shadow-xl"
                                )}
                            >
                                {loading ? <Loader2 className="h-12 w-12 animate-spin" /> : (
                                    <>
                                        <QrCode className="h-8 w-8 md:h-10 md:w-10" />
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
