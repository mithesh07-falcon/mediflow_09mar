
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
    CalendarDays,
    Clock,
    Stethoscope,
    User,
    AlertTriangle,
    CheckCircle2,
    CalendarClock,
    PlusCircle,
    Loader2,
    RefreshCw,
} from "lucide-react";

interface Appointment {
    id?: string | number;
    doctor: string;
    doctorEmail?: string;
    patient: string;
    patientEmail?: string;
    date: string;
    time: string;
    status?: string;
    symptoms?: string;
    fee?: number;
    syncedAt?: string;
}

function getStatusConfig(status?: string, date?: string, time?: string) {
    const s = (status || "").toLowerCase();

    // Derive if the appointment time has passed and status is still "Scheduled"
    let isPast = false;
    if (date && time) {
        try {
            const apptDateStr = `${date} ${time}`.replace(/(\d+:\d+\s*[AP]M)/i, (match) => match);
            const apptDate = new Date(`${date} ${time}`);
            isPast = !isNaN(apptDate.getTime()) && apptDate < new Date();
        } catch { }
    }

    if (s === "missed" || s === "no-show" || s === "cancelled") {
        return {
            label: s === "cancelled" ? "Cancelled" : "Missed",
            cardClass:
                "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700",
            badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300",
            icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
            textClass: "text-red-700 dark:text-red-300",
            dotClass: "bg-red-500",
        };
    }
    if (s === "completed" || s === "done") {
        return {
            label: "Completed",
            cardClass:
                "border-slate-200 bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 opacity-80",
            badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
            icon: <CheckCircle2 className="h-4 w-4 text-slate-500" />,
            textClass: "text-slate-600",
            dotClass: "bg-slate-400",
        };
    }
    if (isPast && (s === "scheduled" || s === "confirmed" || s === "")) {
        return {
            label: "Missed",
            cardClass:
                "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700",
            badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300",
            icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
            textClass: "text-red-700 dark:text-red-300",
            dotClass: "bg-red-500",
        };
    }
    // Upcoming / Scheduled / Confirmed
    return {
        label: s === "confirmed" ? "Confirmed" : "Upcoming",
        cardClass:
            "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800",
        badgeClass:
            "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
        icon: <CalendarClock className="h-4 w-4 text-emerald-500" />,
        textClass: "text-emerald-700 dark:text-emerald-300",
        dotClass: "bg-emerald-500",
    };
}

export default function MySchedulePage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"all" | "upcoming" | "missed" | "completed">("all");

    const fetchAppointments = async () => {
        setLoading(true);
        setError("");
        try {
            const userStr = localStorage.getItem("mediflow_current_user");
            if (!userStr) { router.push("/"); return; }
            const user = JSON.parse(userStr);
            const token = btoa(JSON.stringify(user));

            const res = await fetch("/api/appointments", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            // ── HYBRID SYNC: Combine server data with client cache ────────────────
            const apiAppts = data.appointments || [];
            const localAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");

            // Deduplicate: If an appointment has the same date, time, and patient, only keep the server version
            const combined = [...apiAppts];
            localAppts.forEach((l: any) => {
                const exists = apiAppts.some((a: any) =>
                    a.date === l.date &&
                    a.time === l.time &&
                    a.patient === l.patient
                );
                if (!exists) combined.push(l);
            });

            // Clean up: Filter for current user only
            const filteredAppts = combined.filter((a: any) =>
                (a.patientEmail?.toLowerCase() === user.email?.toLowerCase()) ||
                (a.patient.toLowerCase() === user.firstName.toLowerCase())
            );

            // Sort: most recent first
            const sorted = filteredAppts.sort((a: any, b: any) => {
                const da = new Date(`${a.date} ${a.time}`);
                const db = new Date(`${b.date} ${b.time}`);
                return db.getTime() - da.getTime();
            });
            setAppointments(sorted);
        } catch (e) {
            console.warn("Clinical sync failed, falling back to local storage.");
            const localAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
            setAppointments(localAppts);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const filteredAppointments = appointments.filter((appt) => {
        const s = (appt.status || "").toLowerCase();
        const now = new Date();
        const apptDate = new Date(`${appt.date} ${appt.time}`);
        const isPast = !isNaN(apptDate.getTime()) && apptDate < now;
        const isMissed = s === "missed" || s === "no-show" || (isPast && (s === "scheduled" || s === "confirmed" || s === ""));
        const isCompleted = s === "completed" || s === "done";
        const isUpcoming = !isMissed && !isCompleted;

        if (filter === "all") return true;
        if (filter === "missed") return isMissed;
        if (filter === "completed") return isCompleted;
        if (filter === "upcoming") return isUpcoming;
        return true;
    });

    const counts = {
        all: appointments.length,
        upcoming: appointments.filter((a) => {
            const s = (a.status || "").toLowerCase();
            const isPast = !isNaN(new Date(`${a.date} ${a.time}`).getTime()) && new Date(`${a.date} ${a.time}`) < new Date();
            return !isPast && s !== "completed" && s !== "done" && s !== "missed" && s !== "no-show" && s !== "cancelled";
        }).length,
        missed: appointments.filter((a) => {
            const s = (a.status || "").toLowerCase();
            const isPast = !isNaN(new Date(`${a.date} ${a.time}`).getTime()) && new Date(`${a.date} ${a.time}`) < new Date();
            return s === "missed" || s === "no-show" || s === "cancelled" || (isPast && (s === "scheduled" || s === "confirmed" || s === ""));
        }).length,
        completed: appointments.filter((a) => {
            const s = (a.status || "").toLowerCase();
            return s === "completed" || s === "done";
        }).length,
    };

    return (
        <div className="flex min-h-screen">
            <SidebarNav role="patient" />
            <main className="flex-1 p-8 bg-slate-50/30 dark:bg-zinc-950">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-5xl font-headline font-bold text-primary mb-2">
                            My Schedule
                        </h1>
                        <p className="text-muted-foreground text-base">
                            A complete history and upcoming view of all your consultations.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl gap-2"
                            onClick={fetchAppointments}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button
                            className="rounded-xl gap-2"
                            onClick={() => router.push("/dashboard/patient/appointments")}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Book New
                        </Button>
                    </div>
                </header>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {(["all", "upcoming", "missed", "completed"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all capitalize ${filter === f
                                ? f === "missed"
                                    ? "bg-red-500 border-red-500 text-white shadow-md"
                                    : f === "upcoming"
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md"
                                        : f === "completed"
                                            ? "bg-slate-500 border-slate-500 text-white shadow-md"
                                            : "bg-primary border-primary text-white shadow-md"
                                : "bg-white dark:bg-zinc-900 border-border text-muted-foreground hover:border-primary/40"
                                }`}
                        >
                            {f} ({counts[f]})
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="font-bold">Fetching your clinical records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <AlertTriangle className="h-12 w-12 text-red-400" />
                        <p className="font-bold text-red-600">{error}</p>
                        <Button variant="outline" onClick={fetchAppointments}>
                            Try Again
                        </Button>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground border-2 border-dashed rounded-3xl">
                        <CalendarDays className="h-14 w-14 opacity-30" />
                        <p className="font-bold text-lg">
                            {filter === "all"
                                ? "No appointments found. Book your first consultation!"
                                : `No ${filter} appointments found.`}
                        </p>
                        {filter === "all" && (
                            <Button
                                onClick={() => router.push("/dashboard/patient/appointments")}
                            >
                                Book Appointment
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map((appt, idx) => {
                            const config = getStatusConfig(appt.status, appt.date, appt.time);
                            return (
                                <div
                                    key={appt.id || idx}
                                    className={`rounded-2xl border-2 p-6 transition-all hover:shadow-md ${config.cardClass}`}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        {/* Date Badge */}
                                        <div
                                            className={`min-w-[72px] text-center p-3 rounded-2xl font-bold flex flex-col items-center ${config.dotClass === "bg-red-500"
                                                ? "bg-red-500 text-white"
                                                : config.dotClass === "bg-emerald-500"
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-slate-400 text-white"
                                                }`}
                                        >
                                            {appt.date ? (
                                                <>
                                                    <span className="text-2xl font-black leading-none">
                                                        {appt.date.split(" ")[1]?.replace(",", "") || appt.date.split("/")[1] || "—"}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold opacity-80">
                                                        {appt.date.split(" ")[0] || ""}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-lg">—</span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold">{appt.doctor}</h3>
                                                <Badge
                                                    className={`text-[10px] font-bold border rounded-full ${config.badgeClass}`}
                                                >
                                                    {config.icon}
                                                    <span className="ml-1">{config.label}</span>
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" />
                                                    Patient: <span className="font-semibold text-foreground">{appt.patient}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span className="font-semibold text-foreground">{appt.time}</span>
                                                </span>
                                                {appt.fee && (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-foreground">₹{appt.fee}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {appt.symptoms && (
                                                <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                                                    <Stethoscope className="inline h-3 w-3 mr-1" />
                                                    {appt.symptoms}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
