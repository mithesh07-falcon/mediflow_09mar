"use client";

import { GlobalSync } from "@/lib/sync-service";
import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Activity,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserX,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { useRoleGuard } from "@/hooks/use-role-guard";

// ─── Confirmation Dialog Component ──────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200 border border-border">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-headline">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="rounded-xl px-6" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className={`rounded-xl px-6 font-bold ${confirmClass || "bg-red-600 hover:bg-red-700 text-white"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Button Group ─────────────────────────────────────────────────
function AttendanceControl({
  apt,
  onMarkArrived,
  onMarkMissed,
  onUndo,
  loading,
}: {
  apt: any;
  onMarkArrived: (id: string) => void;
  onMarkMissed: (id: string) => void;
  onUndo: (id: string) => void;
  loading: string | null;
}) {
  const [showMissedDialog, setShowMissedDialog] = useState(false);
  const isArrived = apt.status === "Arrived";
  const isMissed = apt.status === "Missed";
  const isCompleted = apt.status === "Completed";
  const isPending = loading === String(apt.id);

  return (
    <div className="flex flex-col gap-2 items-start" onClick={(e) => e.stopPropagation()}>
      {isCompleted ? (
        // ── Completed State: show status + Prescription ID ────────────
        <div className="flex flex-col gap-1">
          <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] tracking-widest px-3 py-1.5 rounded-xl">
            SESSION FINALIZED
          </Badge>
          {apt.prescriptionId && (
            <span className="text-[9px] text-muted-foreground font-mono ml-1 uppercase">ID: {apt.prescriptionId}</span>
          )}
        </div>
      ) : isArrived ? (
        // ── Arrived State: show green badge + Undo button ──────────────
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Arrived</span>
          </div>
          <button
            onClick={() => onUndo(apt.id)}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest transition-colors px-1"
          >
            <RotateCcw className="h-3 w-3" />
            {isPending ? "Reverting..." : "Undo"}
          </button>
        </div>
      ) : isMissed ? (
        // ── Missed State: show red badge + Undo button ─────────────────
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 px-3 py-1.5 rounded-xl">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-black text-red-700 uppercase tracking-widest">No-Show</span>
          </div>
          <button
            onClick={() => onUndo(apt.id)}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest transition-colors px-1"
          >
            <RotateCcw className="h-3 w-3" />
            {isPending ? "Reverting..." : "Undo"}
          </button>
        </div>
      ) : (
        // ── Default (Scheduled/Confirmed): show YES + NO buttons ───────
        <div className="flex gap-2">
          <button
            onClick={() => onMarkArrived(apt.id)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            YES
          </button>
          <button
            onClick={() => setShowMissedDialog(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            NO
          </button>
        </div>
      )}

      {/* Confirmation dialog for NO / Mark as Missed */}
      <ConfirmDialog
        open={showMissedDialog}
        title="Mark as No-Show?"
        message={`You are marking ${apt.patient} as absent for the ${apt.time} appointment. This will be recorded as a missed visit and cannot start a diagnosis session.`}
        confirmLabel="Yes, Mark as Missed"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={() => {
          setShowMissedDialog(false);
          onMarkMissed(apt.id);
        }}
        onCancel={() => setShowMissedDialog(false)}
      />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  // CONSTRAINT 10: Only doctors can access this portal
  useRoleGuard("doctor");
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<{status: string, loginTime: string, screenTimeStr: string} | null>(null);

  const fetchAppts = async (user: any) => {
    // --- GLOBAL CLOUD SYNC ---
    await GlobalSync.pullAppointments();
    
    const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const myAppts = savedAppts.filter(
      (a: any) => a.doctorEmail?.toLowerCase() === user.email?.toLowerCase()
    );
    const today = myAppts.filter((a: any) => a.date === todayStr);
    setTodayAppointments(today);

    // Keep selectedPatient in sync if it is open
    if (selectedPatient) {
      const refreshed = today.find((a: any) => String(a.id) === String(selectedPatient.id));
      if (refreshed) setSelectedPatient(refreshed);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    setDoctorInfo(user);
    fetchAppts(user);
    
    // Attendance Tracking
    const updateAttendance = () => {
      const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const logs = JSON.parse(localStorage.getItem("mediflow_staff_attendance") || "[]");
      const myLog = logs.find((l: any) => l.email === user.email && l.date === todayStr);
      const lastLogin = localStorage.getItem("mediflow_last_login");

      let screenTimeStr = "0h 0m";
      if (lastLogin) {
         const diff = new Date().getTime() - new Date(lastLogin).getTime();
         const hrs = Math.floor(diff / (1000 * 60 * 60));
         const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         screenTimeStr = `${hrs}h ${mins}m`;
      }

      if (myLog) {
         setAttendance({
           status: myLog.status,
           loginTime: myLog.loginTime,
           screenTimeStr
         });
      }
    };

    updateAttendance();
    const intervalAtt = setInterval(updateAttendance, 60000); // 1 minute
    const interval = setInterval(() => fetchAppts(user), 4000);
    return () => {
      clearInterval(interval);
      clearInterval(intervalAtt);
    };
  }, []);

  // Internal status updater
  const updateStatus = (id: string, newStatus: string, successToast: { title: string; description: string }) => {
    setLoadingId(id);
    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
      const updated = saved.map((a: any) =>
        String(a.id) === String(id) ? { ...a, status: newStatus } : a
      );
      localStorage.setItem("mediflow_appointments", JSON.stringify(updated));
      
      // --- GLOBAL CLOUD SYNC ---
      GlobalSync.pushAppointments();

      // Refresh local state immediately
      const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
      fetchAppts(user);
      setLoadingId(null);
      toast(successToast);
    }, 600);
  };

  const handleMarkArrived = (id: string) =>
    updateStatus(id, "Arrived", {
      title: "✅ Patient Checked In",
      description: "Patient is marked as Arrived. You can now start the diagnostic session.",
    });

  const handleMarkMissed = (id: string) =>
    updateStatus(id, "Missed", {
      title: "🚫 Patient Marked as No-Show",
      description: "The appointment has been logged as a missed visit.",
    });

  const handleUndo = (id: string) =>
    updateStatus(id, "Confirmed", {
      title: "↩️ Status Reverted",
      description: "Appointment is back to Confirmed. You can re-mark attendance.",
    });

  const handleUpdateNotes = (id: string, notes: string) => {
    const saved = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
    const updated = saved.map((a: any) =>
      String(a.id) === String(id) ? { ...a, doctorNotes: notes } : a
    );
    localStorage.setItem("mediflow_appointments", JSON.stringify(updated));
  };

  const handlePrescribe = (id: string, status: string) => {
    if (status !== "Arrived") {
      toast({
        variant: "destructive",
        title: "Check-In Required",
        description: "Mark the patient as Arrived (YES) before starting a diagnosis session.",
      });
      return;
    }
    router.push(`/dashboard/doctor/diagnose/${id}`);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="doctor" />

      <main className="flex-1 p-8 bg-background">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary mb-1">
              Welcome, {doctorInfo?.firstName || "Clinician"}
            </h1>
            <p className="text-muted-foreground">{doctorInfo?.specialization || "General Practice"} Registry</p>
          </div>
          <div className="flex items-center gap-3">
            {attendance && (
              <div className="flex gap-2">
                <Badge className={`px-3 py-2 font-bold uppercase tracking-widest text-[10px] ${attendance.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                   {attendance.status}: {attendance.loginTime}
                </Badge>
                <Badge variant="outline" className="px-3 py-2 font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-slate-50">
                   Screen Time: {attendance.screenTimeStr}
                </Badge>
              </div>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/dashboard/doctor/schedule")}>
              <Calendar className="h-4 w-4 mr-2" /> My Schedule
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => router.push("/dashboard/doctor/certificates")}>
              <FileText className="h-4 w-4 mr-2" /> Certificates
            </Button>
            <Badge className="bg-green-100 text-green-700 p-2 font-bold uppercase tracking-widest text-[10px]">
              Session Active
            </Badge>
          </div>
        </header>

        {/* AI Risk Snapshot */}
        {selectedPatient && (
          <Card
            className={`mb-8 rounded-[2.5rem] border-none shadow-xl animate-in slide-in-from-top-4 duration-500 overflow-hidden ${selectedPatient.status === "Arrived" ? "bg-red-50" : "bg-yellow-50"
              }`}
          >
            <CardHeader className="border-b border-black/5 pb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${selectedPatient.status === "Arrived" ? "bg-red-600 text-white" : "bg-yellow-500 text-white"}`}>
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-headline">AI Risk Snapshot: {selectedPatient.patient}</CardTitle>
                    <CardDescription className="text-lg font-medium opacity-80">Pre-consultation intelligence generated by MediFlow AI.</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(null)} className="rounded-full h-12 w-12 hover:bg-black/5">
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h5 className="font-bold uppercase tracking-widest text-xs text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Key Risk Factors
                  </h5>
                  <ul className="space-y-3 text-sm font-bold">
                    <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5" />High (Family history of CVD)</li>
                    <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5" />BP elevated over last 3 visits</li>
                    <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5" />Allergy: Penicillin sensitive</li>
                  </ul>
                </div>
                <div className="space-y-4 border-l pl-8">
                  <h5 className="font-bold uppercase tracking-widest text-xs text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Compliance Rate
                  </h5>
                  <div className="text-4xl font-black text-primary">82%</div>
                  <p className="text-xs text-muted-foreground">Adherence to previous medication course.</p>
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/20"
                    onClick={() => handlePrescribe(selectedPatient.id, selectedPatient.status)}
                    disabled={selectedPatient.status !== "Arrived"}
                  >
                    Start Diagnostic Session
                    <ChevronRight className="ml-2 h-6 w-6" />
                  </Button>
                  {selectedPatient.status !== "Arrived" && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-2">
                      {selectedPatient.status === "Missed"
                        ? "Patient marked as no-show — session locked"
                        : "Mark patient as Arrived (YES) to start"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinical Queue Table */}
        <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-zinc-800 border-b pb-8 px-10">
            <CardTitle className="text-2xl">Today's Clinical Queue</CardTitle>
            <CardDescription>
              Mark <span className="text-emerald-600 font-bold">YES</span> when patient arrives ·{" "}
              <span className="text-red-600 font-bold">NO</span> if they don't show up
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-zinc-800/50">
                <TableRow>
                  <TableHead className="pl-10 py-6 uppercase tracking-widest text-[10px] font-bold">Patient</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold w-40">Attendance</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Time & Status</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold min-w-[250px]">Consultation Notes</TableHead>
                  <TableHead className="text-right pr-10 uppercase tracking-widest text-[10px] font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                      No consultations scheduled for today.
                    </TableCell>
                  </TableRow>
                ) : (
                  todayAppointments.map((apt) => (
                    <TableRow
                      key={apt.id}
                      className={`hover:bg-primary/5 transition-colors cursor-pointer group ${apt.status === "Missed" ? "bg-red-50/50 dark:bg-red-900/10" : ""
                        }`}
                      onClick={() => setSelectedPatient(apt)}
                    >
                      {/* Patient */}
                      <TableCell className="pl-10 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-lg">{apt.patient}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{apt.patientEmail}</span>
                        </div>
                      </TableCell>

                      {/* Attendance — YES / NO dedicated buttons */}
                      <TableCell>
                        <AttendanceControl
                          apt={apt}
                          onMarkArrived={handleMarkArrived}
                          onMarkMissed={handleMarkMissed}
                          onUndo={handleUndo}
                          loading={loadingId}
                        />
                      </TableCell>

                      {/* Time & Status */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="font-bold text-sm">{apt.time}</span>
                          </div>
                          <Badge
                            className={`rounded-full px-3 text-[9px] w-fit font-bold ${apt.status === "Arrived"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : apt.status === "Missed"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            variant="outline"
                          >
                            {apt.status}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Textarea
                            placeholder="Add specific notes for this patient..."
                            className="min-h-[60px] max-h-[100px] text-xs font-medium rounded-xl border-dashed focus-visible:ring-primary/20"
                            defaultValue={apt.doctorNotes || ""}
                            onBlur={(e) => handleUpdateNotes(apt.id, e.target.value)}
                          />
                        </div>
                      </TableCell>

                      {/* Diagnose Button */}
                      <TableCell className="text-right pr-10">
                        {(() => {
                          const isArrived = apt.status === "Arrived";
                          const isCompleted = apt.status === "Completed";
                          const isMissed = apt.status === "Missed";

                          // Calculate if within ±10 min window
                          const now = new Date();
                          const [timeStr, ampm] = apt.time.split(' ');
                          let [hours, minutes] = timeStr.split(':').map(Number);
                          if (ampm === "PM" && hours < 12) hours += 12;
                          if (ampm === "AM" && hours === 12) hours = 0;

                          const apptTime = new Date();
                          apptTime.setHours(hours, minutes, 0, 0);

                          const diffInMs = now.getTime() - apptTime.getTime();
                          const diffInMins = Math.abs(diffInMs / (1000 * 60));
                          const withinWindow = diffInMins <= 10;

                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                className={`rounded-xl px-6 font-black uppercase tracking-widest text-xs h-12 transition-all ${isArrived && withinWindow
                                  ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                                  : isCompleted
                                    ? "bg-slate-100 text-slate-400 cursor-default"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  }`}
                                disabled={!isArrived || !withinWindow || isCompleted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrescribe(apt.id, apt.status);
                                }}
                              >
                                {isCompleted ? (
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                  </span>
                                ) : isMissed ? (
                                  <span className="flex items-center gap-1.5">
                                    <UserX className="h-3.5 w-3.5" /> No-Show
                                  </span>
                                ) : (
                                  "Diagnose"
                                )}
                              </Button>
                              {!withinWindow && !isCompleted && !isMissed && (
                                <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest text-right">
                                  Window: {new Date(apptTime.getTime() - 10 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(apptTime.getTime() + 10 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
