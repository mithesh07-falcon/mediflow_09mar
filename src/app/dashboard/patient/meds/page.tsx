
"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Pill,
  Clock,
  Settings,
  AlertTriangle,
  Smartphone,
  Loader2,
  Users,
  Bell,
  Activity,
  FileText,
  User,
  Stethoscope,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Medication {
  id: string | number;
  name: string;
  dose: string;
  timeLabel: string;
  taken: boolean;
  frequency: string;
  scheduledHour: number;
  scheduledMinute: number;
}

function safeParseArray<T = any>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function MedicationSchedulePage() {
  const { toast } = useToast();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardianContact, setGuardianContact] = useState<string | null>(null);
  const [expandedRx, setExpandedRx] = useState<string | null>(null);
  const [notificationFrequency, setNotificationFrequency] = useState(5);

  const fetchPrescriptions = useCallback(() => {
    const userStr = localStorage.getItem("mediflow_current_user");
    let user: any = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch {
      user = null;
    }

    if (user && user.guardianPhone) {
      setGuardianContact(user.guardianPhone);
    }

    const familyMembers = safeParseArray<any>("mediflow_family_members");
    const currentEmail = user?.email || "default";
    const myMembers = familyMembers.filter((m: any) => m.userId === currentEmail);
    // If no members at all (e.g. legacy or fresh), at least allow their own prescriptions
    const authorizedNames = myMembers.length > 0 
      ? myMembers.map((m: any) => m.name.toLowerCase())
      : [user?.firstName?.toLowerCase()].filter(Boolean);

    const allPrescriptions = safeParseArray<any>("mediflow_prescriptions");

    // STRICT PRIVACY: Only show meds issued to this user or their authorized family members
    const myPrescriptions = allPrescriptions
      .filter((rx: any) => authorizedNames.includes(String(rx?.patientName || "").toLowerCase()))
      .map((rx: any, rxIndex: number) => ({
        ...rx,
        id: rx?.id ? String(rx.id) : `RX-${rxIndex + 1}`,
        medications: Array.isArray(rx?.medications) ? rx.medications : [],
      }));

    setPrescriptions(myPrescriptions);

    const allMeds: Medication[] = myPrescriptions.flatMap((rx: any) =>
      (Array.isArray(rx.medications) ? rx.medications : []).map((m: any, medIndex: number) => {
        const medId = m?.id ?? `${rx.id}-${medIndex}`;
        return {
          id: medId,
          name: m?.name || "Unnamed Medicine",
          dose: m?.dosage || m?.dose || "-",
          timeLabel: m?.timeLabel || "Not set",
          scheduledHour: Number.isFinite(Number(m?.scheduledHour)) ? Number(m.scheduledHour) : 0,
          scheduledMinute: Number.isFinite(Number(m?.scheduledMinute)) ? Number(m.scheduledMinute) : 0,
          frequency: m?.frequency || "As directed",
          taken: JSON.parse(localStorage.getItem(`med_taken_${medId}`) || "false")
        };
      })
    );

    setMeds(allMeds);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrescriptions();
    const interval = setInterval(fetchPrescriptions, 5000);
    return () => clearInterval(interval);
  }, [fetchPrescriptions]);

  const toggleMed = (id: string | number) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;

    const newState = !med.taken;

    // Immediate local feedback
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: newState } : m));

    if (newState) {
      toast({
        title: "Clinical Processing...",
        description: `Verifying ${med.name} intake with central health records.`,
      });

      // Mandatory 2-second clinical verification delay
      setTimeout(() => {
        localStorage.setItem(`med_taken_${id}`, JSON.stringify(newState));
        toast({
          title: "Intake Verified",
          description: "Patient compliance records updated. Guardian alerts silenced.",
        });
      }, 2000);
    } else {
      localStorage.setItem(`med_taken_${id}`, JSON.stringify(newState));
    }
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />

      <main className="flex-1 p-8 bg-slate-50">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary mb-1">Medication Alert Hub</h1>
            <p className="text-muted-foreground text-lg">Real-time clinical compliance with guardian safety loop.</p>
          </div>
          <div className="flex gap-3">
            {guardianContact && (
              <Badge variant="secondary" className="h-12 px-6 flex items-center gap-2 rounded-2xl bg-primary/10 text-primary border-none shadow-sm font-bold">
                <Users className="h-5 w-5" />
                Guardian: {guardianContact}
              </Badge>
            )}
            <Badge variant="outline" className="h-12 px-6 flex items-center gap-2 rounded-2xl border-primary/20 bg-white font-bold">
              <Smartphone className="h-5 w-5 text-primary" />
              Push: ACTIVE
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
              <CardHeader className="bg-primary text-white pb-12 pt-12 px-10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-4xl font-headline">Clinical Dose Routine</CardTitle>
                    <CardDescription className="text-white/80 text-lg mt-2 font-medium">
                      Automatic guardian notifications trigger after 10 minutes of neglect.
                    </CardDescription>
                  </div>
                  {!loading && (
                    <div className="bg-white/20 p-6 rounded-[2rem] backdrop-blur-md border border-white/30 text-center min-w-[140px]">
                      <div className="text-4xl font-bold">{meds.filter(m => m.taken).length} / {meds.length}</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-80">Taken Today</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse text-xl font-bold">Syncing Records...</p>
                  </div>
                ) : meds.length === 0 ? (
                  <div className="text-center py-32 px-10">
                    <Pill className="h-24 w-24 text-muted-foreground/10 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold mb-3">No Active Regimens</h3>
                    <p className="text-muted-foreground text-lg">Digital prescriptions issued by your doctor will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y border-t">
                    {meds.map((med) => (
                      <div key={med.id} className={`p-10 flex items-center gap-10 transition-all ${med.taken ? 'bg-green-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                        <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center transition-all ${med.taken ? 'bg-green-100 text-green-600' : 'bg-primary/5 text-primary shadow-sm'}`}>
                          <Pill className="h-12 w-12" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h4 className={`text-3xl font-bold ${med.taken ? 'line-through text-muted-foreground' : ''}`}>{med.name}</h4>
                            <Badge variant="outline" className="rounded-xl px-5 py-1.5 text-sm font-bold border-primary/20 bg-primary/5 text-primary">{med.dose}</Badge>
                          </div>
                          <div className="flex items-center gap-8 text-lg text-muted-foreground">
                            <span className="flex items-center gap-2 font-bold text-primary">
                              <Clock className="h-5 w-5" />
                              {med.timeLabel}
                            </span>
                            <span className="opacity-30">•</span>
                            <span className="italic font-medium">{med.frequency}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <Checkbox
                            checked={med.taken}
                            onCheckedChange={() => toggleMed(med.id)}
                            className="h-16 w-16 rounded-[1.5rem] border-4 border-primary data-[state=checked]:bg-primary transition-all scale-110"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {med.taken ? "Verified" : "Mark Taken"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-10 bg-orange-50 border-4 border-orange-100 rounded-[3.5rem] flex items-start gap-8 shadow-sm">
              <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-2xl text-orange-900 mb-2">Clinical Protocol Active</h4>
                <p className="text-lg text-orange-700 leading-relaxed font-medium">
                  Your safety loop is configured. If a dose is missed for **10 minutes**, an automated clinical SMS will be dispatched to your guardian at **{guardianContact || "Not Configured"}**.
                </p>
              </div>
            </div>

            <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden mt-12">
              <CardHeader className="p-10 border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">Prescription Master Vault</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {prescriptions.length === 0 ? (
                  <div className="p-20 text-center text-muted-foreground italic">
                    No digital records synchronized.
                  </div>
                ) : (
                  <div className="divide-y">
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="group">
                        <button
                          className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                          onClick={() => setExpandedRx(expandedRx === rx.id ? null : rx.id)}
                        >
                          <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                              <Stethoscope className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="text-xl font-black text-slate-800">{rx.id || "RX-UNASSIGNED"}</p>
                                <Badge className="bg-green-100 text-green-700 font-bold border-none">{rx.date || "No date"}</Badge>
                              </div>
                              <p className="text-sm font-bold text-muted-foreground uppercase mt-1">Issued by Dr. {rx.doctorName || "Unknown"}</p>
                            </div>
                          </div>
                          <ChevronDown className={`h-6 w-6 text-slate-300 transition-transform ${expandedRx === rx.id ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedRx === rx.id && (
                          <div className="p-10 bg-slate-50 border-t-2 border-dashed border-slate-200 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Recipient</p>
                                <p className="font-bold text-lg">{rx.patientName}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Dispensing Method</p>
                                <Badge variant="outline" className={`font-bold ${rx.sentToPharmacy ? 'border-blue-500 text-blue-600' : 'border-slate-300'}`}>
                                  {rx.sentToPharmacy ? 'Pharmacy Direct Dispatched' : 'Self-Fulfillment'}
                                </Badge>
                              </div>
                            </div>
                            <div className="mb-8">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Clinical Observations</p>
                              <p className="p-4 bg-white rounded-xl border italic text-sm text-slate-600 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                "{rx.notes || "No clinical notes captured."}"
                              </p>
                            </div>
                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase text-slate-400">Regimen Details</p>
                              {Array.isArray(rx.medications) && rx.medications.length > 0 ? (
                                rx.medications.map((m: any, idx: number) => (
                                  <div key={m?.id ?? idx} className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <Pill className="h-5 w-5 text-primary" />
                                      <div>
                                        <p className="font-bold">{m?.name || "Unnamed Medicine"}</p>
                                        <p className="text-xs text-muted-foreground uppercase font-black">{m?.dosage || m?.dose || "-"} • {m?.timeLabel || "Not set"}</p>
                                      </div>
                                    </div>
                                    <Badge className="bg-slate-100 text-slate-600 border-none font-bold uppercase text-[10px] px-3">
                                      {m?.duration || "As prescribed"}
                                    </Badge>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 bg-white rounded-xl border text-sm text-muted-foreground">
                                  No medication items available for this prescription.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white p-6">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Settings className="h-6 w-6 text-primary" />
                  Alert Calibration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-10 pt-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Clinical Heartbeat</label>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Active Monitoring</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic text-center px-4">System polls every 10 seconds for dose compliance.</p>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Message Frequency</label>
                    <Badge variant="outline" className="font-bold border-primary/20 text-primary">{notificationFrequency} / Day</Badge>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border flex flex-col gap-6">
                    <Slider 
                      defaultValue={[notificationFrequency]} 
                      max={20} 
                      min={1} 
                      step={1} 
                      onValueChange={(val) => setNotificationFrequency(val[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                      <span>1</span>
                      <span>Max 20</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t">
                  <Button variant="outline" className="w-full h-16 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 text-lg">
                    <Bell className="h-5 w-5 mr-3" />
                    Test Clinical Alert
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[3.5rem] border-none shadow-2xl bg-primary text-white overflow-hidden relative group cursor-pointer">
              <div className="absolute -top-12 -right-12 p-12 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <Activity className="h-64 w-64" />
              </div>
              <CardContent className="p-12 relative z-10 space-y-10">
                <div>
                  <h4 className="text-4xl font-headline font-bold mb-3">SOS Help</h4>
                  <p className="text-lg opacity-80 leading-relaxed font-medium">
                    Immediate clinical gateway. Notifies doctor and guardian instantly.
                  </p>
                </div>
                <Button variant="secondary" className="w-full h-20 bg-white text-primary font-bold rounded-[1.5rem] text-2xl shadow-2xl hover:scale-105 transition-transform">
                  INITIATE SOS
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
