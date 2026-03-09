"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope, Video, Loader2, Calendar, Wallet, QrCode, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { ElderAppointmentSelector, AppointmentRequest } from "@/components/elderly/ElderAppointmentSelector";

export default function BookAppointmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [doctorMatch, setDoctorMatch] = useState<AppointmentRequest | null>(null);
    const [consultMode, setConsultMode] = useState<"clinic" | "video">("clinic");

    const getDoctorName = (specialist: string) => {
        const names: Record<string, string> = {
            "Cardiologist": "DR. SHARMA",
            "Orthopedist": "DR. PATEL",
            "Ophthalmologist": "DR. REDDY",
            "General Physician": "DR. VERMA",
            "Dentist": "DR. GUPTA",
            "ENT": "DR. RAMESH",
            "Gastroenterology": "DR. IYER",
            "Neurology": "DR. KRISHNAN",
            "Dermatology": "DR. MENON",
            "Pediatrics": "DR. CHOPRA"
        };
        return names[specialist] || "DR. ROBERT";
    };

    const getAppointmentTime = (timePref: string) => {
        if (timePref === "morning") return "Tomorrow at 10:30 AM";
        if (timePref === "afternoon") return "Tomorrow at 2:15 PM";
        return "Tomorrow at 6:00 PM";
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (!user.isElderly) router.push("/dashboard/patient");
    }, [router]);

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

    // SUCCESS SCREEN
    if (success) {
        return (
            <div className="min-h-screen bg-green-50 text-black p-10 flex flex-col items-center justify-center space-y-12">
                <div className="h-48 w-48 bg-green-500 rounded-full flex items-center justify-center border-[10px] border-green-700">
                    <Stethoscope className="h-24 w-24 text-white" />
                </div>
                <h1 className="text-7xl font-black text-center text-green-800 uppercase leading-tight">
                    Appointment Confirmed!
                </h1>
                <p className="text-4xl font-bold text-center opacity-80 max-w-2xl">
                    Your doctor will see you in the {doctorMatch?.timePreferenceLabel}.
                </p>
                <div className="p-8 mt-12 border-[8px] border-black rounded-[3rem] bg-white animate-pulse">
                    <p className="text-3xl font-black text-center">Redirecting you to the home page...</p>
                </div>
            </div>
        );
    }

    // SEARCH RESULT SCREEN
    if (doctorMatch) {
        const doctorName = getDoctorName(doctorMatch.specialist);
        const apptTime = getAppointmentTime(doctorMatch.timePreferenceCode);
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

                <div className="p-16 border-[12px] border-black rounded-[5rem] space-y-16 bg-slate-50">
                    <div className="flex flex-col items-center text-center gap-8">
                        <div className="h-48 w-48 bg-black text-white rounded-[3rem] flex items-center justify-center">
                            <Stethoscope className="h-24 w-24" />
                        </div>
                        <div>
                            <h2 className="text-7xl font-black mb-4 uppercase">{doctorName}</h2>
                            <p className="text-4xl font-bold opacity-70 uppercase">
                                Specialist: <span className="text-primary underline">{doctorMatch.specialist}</span>
                            </p>
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
                                className={`h-32 text-4xl font-black rounded-[2rem] border-[8px] ${consultMode === "clinic" ? "bg-black text-white border-black" : "border-slate-300 text-slate-500"}`}
                            >
                                <MapPin className="mr-4 w-12 h-12" /> IN CLINIC
                            </Button>
                            <Button
                                onClick={() => setConsultMode("video")}
                                variant={consultMode === "video" ? "default" : "outline"}
                                className={`h-32 text-4xl font-black rounded-[2rem] border-[8px] ${consultMode === "video" ? "bg-black text-white border-black" : "border-slate-300 text-slate-500"}`}
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
