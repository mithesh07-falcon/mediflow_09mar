"use client";

import { GlobalSync } from "@/lib/sync-service";
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

const normalizeSpecialization = (value: string) => {
    const v = (value || "").toLowerCase().trim();

    if (["cardiology", "cardiologist", "heart"].some(k => v === k || v.includes(k))) return "cardiology";
    if (["orthopedics", "orthopedic", "orthopedic surgeon", "ortho", "bone", "joint"].some(k => v === k || v.includes(k))) return "orthopedics";
    if (["ophthalmology", "ophthalmologist", "eye", "vision"].some(k => v === k || v.includes(k))) return "ophthalmology";
    if (["dentistry", "dentist", "dental"].some(k => v === k || v.includes(k))) return "dentistry";
    if (["ent", "ear nose throat"].some(k => v === k || v.includes(k))) return "ent";
    if (["gastroenterology", "gastro", "digestive", "stomach"].some(k => v === k || v.includes(k))) return "gastroenterology";
    if (["neurology", "neurologist", "brain", "nerve"].some(k => v === k || v.includes(k))) return "neurology";
    if (["dermatology", "dermatologist", "skin"].some(k => v === k || v.includes(k))) return "dermatology";
    if (["general", "general medicine", "general physician", "physician"].some(k => v === k || v.includes(k))) return "general";

    return v;
};

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
                // --- GLOBAL CLOUD SYNC ---
                await GlobalSync.pullStaff();

                const res = await fetch("/api/admin/staff");
                const data = await res.json();
                if (data.staff) {
                    let allStaff = [...data.staff];
                    try {
                        const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
                        localStaff.forEach((ls: any) => {
                            if (!allStaff.find(s => s.email.toLowerCase() === ls.email.toLowerCase())) {
                                allStaff.push(ls);
                            }
                        });
                    } catch(e) {}
                    setStaff(allStaff);
                }
            } catch (err) {
                console.error("Failed to fetch clinical staff", err);
            }
        };
        fetchStaff();

        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (!user.isElderly) router.push("/dashboard/patient");
    }, [router]);

    const getDoctorForSpecialist = (specialist: string, predictedName?: string) => {
        const doctors = staff.filter(s => String(s.role || "").toLowerCase() === "doctor");
        if (doctors.length === 0) return "DR. ROBERT (GENERAL)";

        const normalizedPredicted = (predictedName || "").trim().toLowerCase();
        if (normalizedPredicted) {
            const byName = doctors.find(s => String(s.name || "").trim().toLowerCase() === normalizedPredicted);
            if (byName) return byName.name;
        }

        const target = normalizeSpecialization(specialist);
        console.log(`[Lookup] Searching for specialist=${specialist} (normalized=${target}). Predicted=${predictedName || "none"}`);

        const exact = doctors.find(s => normalizeSpecialization(String(s.specialization || "")) === target);
        if (exact) return exact.name;

        const partial = doctors.find(s => {
            const normalizedSpec = normalizeSpecialization(String(s.specialization || ""));
            return normalizedSpec.includes(target) || target.includes(normalizedSpec);
        });
        if (partial) return partial.name;

        const general = doctors.find(s => normalizeSpecialization(String(s.specialization || "")) === "general");
        if (general) return general.name;

        return doctors[0].name || "DR. ROBERT (GENERAL)";
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
            const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
            const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
            
            const doctorName = getDoctorForSpecialist(doctorMatch?.specialist || "", doctorMatch?.predictedDoctorName);
            // We need the doctor email for the doctor dashboard to filter
            // Let's assume the name mapping is consistent or match by name
            const allStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
            const doctorObj = [...staff, ...allStaff].find((s: any) =>
                String(s.role || "").toLowerCase() === "doctor" &&
                String(s.name || "").trim().toLowerCase() === String(doctorName || "").trim().toLowerCase()
            );

            const newAppt = {
                id: Date.now(),
                patient: user.firstName + " " + user.lastName,
                patientEmail: user.email,
                doctor: doctorName,
                doctorEmail: doctorObj?.email || "internal-matching@mediflow.com",
                date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                time: doctorMatch?.timePreferenceLabel || "09:00 AM",
                status: "Confirmed",
                type: "Elderly",
                symptoms: doctorMatch?.reason || "General Checkup"
            };

            localStorage.setItem("mediflow_appointments", JSON.stringify([newAppt, ...savedAppts]));
            
            // --- GLOBAL CLOUD SYNC ---
            GlobalSync.pushAppointments();

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
                    {/* Giant background watermark icon */}
                    <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-[0.06]">
                        <SpecialistIcon className="h-64 w-64" />
                    </div>

                    {/* AI Reason Banner */}
                    {(doctorMatch.aiMessage || doctorMatch.reason) && (
                        <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <div className="bg-primary/10 border-[6px] border-primary/20 rounded-[3rem] p-10 flex gap-8 items-center">
                                <div className="h-24 w-24 bg-primary text-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
                                    <Sparkles className="h-12 w-12" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-4xl font-black text-primary leading-tight lowercase first-letter:uppercase">
                                        &ldquo;{doctorMatch.aiMessage || doctorMatch.reason}&rdquo;
                                    </p>
                                    {doctorMatch.nextStep && (
                                        <p className="text-2xl font-bold text-slate-600 italic">
                                            Pro-Tip: {doctorMatch.nextStep}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* NEW: Triage Results & Risk Level */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={cn(
                                    "p-8 rounded-[3rem] border-[6px] flex flex-col justify-center items-center text-center space-y-4",
                                    doctorMatch.riskLevel === "high" ? "bg-red-50 border-red-200 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : 
                                    doctorMatch.riskLevel === "medium" ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
                                )}>
                                    <span className={cn(
                                        "text-2xl font-black uppercase tracking-[0.2em]",
                                        doctorMatch.riskLevel === "high" ? "text-red-500" : 
                                        doctorMatch.riskLevel === "medium" ? "text-orange-500" : "text-green-500"
                                    )}>Risk Level</span>
                                    <h3 className={cn(
                                        "text-7xl font-black uppercase tracking-tighter",
                                        doctorMatch.riskLevel === "high" ? "text-red-700" : 
                                        doctorMatch.riskLevel === "medium" ? "text-orange-700" : "text-green-700"
                                    )}>
                                        {doctorMatch.riskLevel || "Low"}
                                    </h3>
                                    {doctorMatch.emergency && (
                                        <div className="bg-red-600 text-white px-8 py-3 rounded-full text-2xl font-black animate-pulse border-4 border-red-900">
                                            NEED EMERGENCY CARE!
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border-[6px] border-slate-200 rounded-[3rem] p-10 space-y-6">
                                    <h4 className="text-2xl font-black text-slate-400 uppercase tracking-widest border-b-4 border-slate-100 pb-2">Structured Symptoms</h4>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Pain Type</p>
                                            <p className="text-2xl font-black text-black capitalize">{doctorMatch.structuredSymptoms?.painType || "General"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Severity</p>
                                            <p className="text-2xl font-black text-black capitalize">{doctorMatch.structuredSymptoms?.severity || "Mild"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Onset</p>
                                            <p className="text-2xl font-black text-black capitalize">{doctorMatch.structuredSymptoms?.onset || "Gradual"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Duration</p>
                                            <p className="text-2xl font-black text-black capitalize">{doctorMatch.structuredSymptoms?.duration || "Few hours"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detected Symptoms Section */}
                            {doctorMatch.detectedSymptoms && doctorMatch.detectedSymptoms.length > 0 && (
                                <div className="bg-white border-[6px] border-slate-200 rounded-[3rem] p-8 flex flex-wrap gap-4 items-center">
                                    <span className="text-2xl font-black text-slate-400 uppercase tracking-widest mr-4">Detected Signs:</span>
                                    {doctorMatch.detectedSymptoms.map((sym, idx) => (
                                        <div key={idx} className="bg-slate-50 border-[4px] border-slate-100 text-slate-700 px-6 py-3 rounded-full text-2xl font-black flex items-center gap-2">
                                            <div className="h-3 w-3 bg-green-500 rounded-full" />
                                            {sym}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Hero: Specialist Icon + Doctor Name ─────────────────────── */}
                    <div className="flex flex-col items-center text-center gap-10 relative z-10">
                        {/* Specialist Icon — Large, colored, with shadow */}
                        <div className={cn(
                            "h-72 w-72 rounded-[4rem] flex items-center justify-center border-[12px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-2 transition-transform",
                            iconData.bg
                        )}>
                            <SpecialistIcon className={cn("h-40 w-40 drop-shadow-md", iconData.color)} />
                        </div>

                        {/* Specialist label below icon */}
                        <div className="flex items-center gap-4">
                            <div className={cn("h-8 w-8 rounded-full", iconData.bg)} />
                            <p className="text-3xl font-black text-slate-500 uppercase tracking-widest">
                                {doctorMatch.specialist} Specialist
                            </p>
                            <div className={cn("h-8 w-8 rounded-full", iconData.bg)} />
                        </div>

                        <div className="space-y-4">
                            <p className="text-3xl font-black text-slate-400 uppercase tracking-[0.2em]">Medical Specialist Found</p>
                            <h2 className="text-8xl font-black mb-4 uppercase tracking-tighter text-black">{doctorName}</h2>
                            <div className="inline-block px-8 py-3 bg-black text-white rounded-full text-3xl font-black uppercase">
                                {doctorMatch.specialist}
                            </div>
                        </div>
                    </div>

                    {/* ── Appointment Details ─────────────────────────────────────── */}
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

                    {/* ── Step 1: Choose Appointment Type ─────────────────────────── */}
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

                    {/* ── Step 2: Pay to Confirm ──────────────────────────────────── */}
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
