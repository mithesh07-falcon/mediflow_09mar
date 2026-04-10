"use client";

import { addDays, format } from "date-fns";

import { GlobalSync } from "@/lib/sync-service";
import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
   Stethoscope,
   ArrowLeft,
   Plus,
   Trash2,
   Activity,
   User,
   Clock
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface MedicationItem {
   id: string;
   name: string;
   dosage: string;
   frequency: string;
   duration: string;
   courseDays: number;
   courseEndDate: string;
   timeLabel: string;
   scheduledHour: number;
   scheduledMinute: number;
   isCustomTime?: boolean;
}

interface MedTimeSlot {
   label: string;   // e.g. "Morning"
   display: string; // e.g. "Morning (8 AM)"
   hour: number;
   minute: number;
}

// Default slots — overridden by admin config if present
const DEFAULT_MED_TIME_SLOTS: MedTimeSlot[] = [
   { label: "Morning", display: "Morning (8 AM)", hour: 8, minute: 0 },
   { label: "Afternoon", display: "Afternoon (1 PM)", hour: 13, minute: 0 },
   { label: "Evening", display: "Evening (6 PM)", hour: 18, minute: 0 },
   { label: "Night", display: "Night (9 PM)", hour: 21, minute: 0 },
];

function loadMedTimeSlots(): MedTimeSlot[] {
   try {
      const saved = localStorage.getItem("mediflow_med_time_slots");
      if (saved) {
         const parsed = JSON.parse(saved);
         if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
   } catch { }
   return DEFAULT_MED_TIME_SLOTS;
}

export default function DiagnosisPage() {
   const router = useRouter();
   const { patientId } = useParams();
   const { toast } = useToast();

   const [meds, setMeds] = useState<MedicationItem[]>([]);
   const [diagnosisNote, setDiagnosisNote] = useState("");
   const [sendToPharmacy, setSendToPharmacy] = useState(false);
   const [patientConsent, setPatientConsent] = useState(false);
   const [loading, setLoading] = useState(false);
   const [patientInfo, setPatientInfo] = useState<any>(null);
   const [medTimeSlots, setMedTimeSlots] = useState<MedTimeSlot[]>(DEFAULT_MED_TIME_SLOTS);

   useEffect(() => {
      // Load admin-configured medication time slots
      setMedTimeSlots(loadMedTimeSlots());

      const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
      const appointment = savedAppts.find((a: any) => String(a.id) === String(patientId));
      if (appointment) {
         setPatientInfo({
            name: appointment.patient,
            age: appointment.patientAge || "Unknown",
            history: appointment.patientHistory || "No significant prior history documented.",
            symptoms: appointment.symptoms || "None reported"
         });
      } else {
         setPatientInfo({ name: "Unknown Patient", age: "-", history: "-", symptoms: "-" });
      }
   }, [patientId]);

   const addMed = () => {
      if (!diagnosisNote.trim()) {
         toast({ variant: "destructive", title: "Wait!", description: "You must enter a diagnosis before adding medicines." });
         return;
      }
      const firstSlot = medTimeSlots[0] || DEFAULT_MED_TIME_SLOTS[0];
      setMeds([...meds, {
         id: Date.now().toString(),
         name: "",
         dosage: "",
         frequency: "Once Daily",
         duration: "7 days",
         courseDays: 7,
         courseEndDate: format(addDays(new Date(), 7), "MMM d, yyyy"),
         timeLabel: firstSlot.label as any,
         scheduledHour: firstSlot.hour,
         scheduledMinute: firstSlot.minute
      }]);
   };

   const removeMed = (id: string) => setMeds(meds.filter(m => m.id !== id));

   const updateMed = (id: string, field: keyof MedicationItem, value: any) => {
      setMeds(meds.map(m => {
         if (m.id === id) {
            let updated = { ...m, [field]: value };
            if (field === 'timeLabel') {
               if (value === 'Custom') {
                  updated.isCustomTime = true;
               } else {
                  updated.isCustomTime = false;
                  // Find the matching slot from admin-configured slots
                  const slot = medTimeSlots.find(s => s.label === value);
                  if (slot) {
                     updated.scheduledHour = slot.hour;
                     updated.scheduledMinute = slot.minute;
                  }
               }
            }
            if (field === 'courseDays') {
               const days = parseInt(value) || 0;
               updated.courseEndDate = format(addDays(new Date(), days), "MMM d, yyyy");
               updated.duration = `${days} days`;
            }
            return updated;
         }
         return m;
      }));
   };

   const handleSubmit = () => {
      if (!diagnosisNote) {
         toast({ variant: "destructive", title: "Note Required", description: "Please enter diagnostic notes before issuing a prescription." });
         return;
      }

      if (sendToPharmacy && !patientConsent) {
         toast({ variant: "destructive", title: "Consent Required", description: "You must confirm patient consent before forwarding to the pharmacy." });
         return;
      }

      setLoading(true);

      setTimeout(async () => {
         const savedPrescriptions = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");
         const doctorUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");

         // CONSTRAINT 17 & 18: Prescription with editing window and permanent storage
         const newPrescription = {
            id: `RX-${Date.now()}`,
            patientId,
            patientName: patientInfo?.name || "Unknown",
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            submittedAt: new Date().toISOString(), // CONSTRAINT 17: Track time for 10-min edit window
            isFinalized: false, // Will become true after 10 minutes
            doctorEmail: doctorUser.email,
            doctorName: doctorUser.firstName,
            doctorSpecialization: doctorUser.specialization || "General",
            notes: diagnosisNote,
            diagnosisDescription: diagnosisNote, // CONSTRAINT 18: Store full description
            medications: meds,
            sentToPharmacy: sendToPharmacy,
            consentCaptured: patientConsent,
            isPermanent: true, // CONSTRAINT 18: Cannot be deleted by normal users
         };

         localStorage.setItem("mediflow_prescriptions", JSON.stringify([newPrescription, ...savedPrescriptions]));

         // CONSTRAINT 18: Also store in permanent medical history
         const medHistory = JSON.parse(localStorage.getItem("mediflow_medical_history") || "[]");
         medHistory.push({
            prescriptionId: newPrescription.id,
            patientId,
            patientName: patientInfo?.name,
            diagnosisDescription: diagnosisNote,
            prescribedMedicines: meds.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration })),
            dateTime: new Date().toISOString(),
            doctorName: doctorUser.firstName,
            doctorEmail: doctorUser.email,
            doctorSpecialization: doctorUser.specialization || "General",
            isPermanent: true,
         });
         localStorage.setItem("mediflow_medical_history", JSON.stringify(medHistory));
         
         // ── DATA INTEGRITY: Mark appointment as Completed ──────────────────
         const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
         const updatedAppts = savedAppts.map((a: any) =>
            String(a.id) === String(patientId) ? { ...a, status: "Completed", prescriptionId: newPrescription.id } : a
         );
         localStorage.setItem("mediflow_appointments", JSON.stringify(updatedAppts));

         // --- GLOBAL CLOUD SYNC ---
         GlobalSync.pushMedicalData();
         GlobalSync.pushAppointments();

         // 2. Sync to server-side appointments.json
         try {
            const token = btoa(JSON.stringify(doctorUser));
            await fetch("/api/appointments/complete", {
               method: "POST",
               headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
               body: JSON.stringify({ appointmentId: patientId, prescriptionId: newPrescription.id }),
            });
         } catch (e) {
            // Non-blocking: localStorage is already updated
            console.warn("Server sync for completion failed, localStorage updated only.", e);
         }
         // ──────────────────────────────────────────────────────────────────

         setLoading(false);
         toast({
            title: "✅ Prescription Issued & Appointment Completed",
            description: `Digital records sent to Patient Profile ${sendToPharmacy ? "and Pharmacy Hub" : ""}. Appointment marked as Completed.`,
         });
         router.push("/dashboard/doctor");
      }, 2000);
   };

   return (
      <div className="flex min-h-screen">
         <SidebarNav role="doctor" />

         <main className="flex-1 p-8 bg-slate-50">
            <header className="mb-12 flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-12 w-12">
                  <ArrowLeft className="h-6 w-6" />
               </Button>
               <div>
                  <h1 className="text-4xl font-headline font-bold text-primary mb-1">Clinical Diagnostic Desk</h1>
                  <p className="text-muted-foreground">Issuing digital prescription for Patient #{patientId}</p>
               </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-8 space-y-8">
                  {patientInfo && (
                     <Card className="rounded-[2.5rem] border-none shadow-xl bg-white">
                        <CardHeader className="bg-primary/5 pb-6">
                           <CardTitle className="text-lg flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" /> Patient Details
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-xs text-muted-foreground uppercase font-bold">Patient Name</p>
                              <p className="text-lg font-bold">{patientInfo.name}</p>
                           </div>
                           <div>
                              <p className="text-xs text-muted-foreground uppercase font-bold">Age</p>
                              <p className="text-lg font-bold">{patientInfo.age}</p>
                           </div>
                           <div className="col-span-2">
                              <p className="text-xs text-muted-foreground uppercase font-bold">Reported Symptoms</p>
                              <p className="text-sm">{patientInfo.symptoms}</p>
                           </div>
                           <div className="col-span-2">
                              <p className="text-xs text-muted-foreground uppercase font-bold">Medical History</p>
                              <p className="text-sm">{patientInfo.history}</p>
                           </div>
                        </CardContent>
                     </Card>
                  )}

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white">
                     <CardHeader className="pb-8 border-b">
                        <div className="flex items-center gap-3">
                           <Activity className="h-6 w-6 text-primary" />
                           <CardTitle>Diagnostic Notes</CardTitle>
                        </div>
                     </CardHeader>
                     <CardContent className="pt-8 space-y-6">
                        <div className="space-y-2">
                           <Label className="font-bold">Clinical Observation</Label>
                           <Textarea
                              placeholder="Document symptoms, physical findings, and diagnosis..."
                              className="min-h-[150px] rounded-2xl resize-none border-2 focus:border-primary/50"
                              value={diagnosisNote}
                              onChange={e => setDiagnosisNote(e.target.value)}
                           />
                        </div>

                        <div className="pt-4 space-y-4">
                           <div className="flex justify-between items-center">
                              <Label className="font-bold text-lg">Medication Plan & Scheduling</Label>
                              <Button variant="outline" size="sm" onClick={addMed} className="rounded-xl border-primary/20 text-primary">
                                 <Plus className="h-4 w-4 mr-2" /> Add Medication
                              </Button>
                           </div>

                           <div className="space-y-3">
                              {meds.map((med) => (
                                 <div key={med.id} className="grid grid-cols-12 gap-3 p-6 bg-muted/20 rounded-[2rem] border-2 items-end">
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Drug Name</Label>
                                       <Input
                                          className="rounded-xl h-12 border-2"
                                          placeholder="e.g. Omeprazole"
                                          value={med.name}
                                          onChange={e => updateMed(med.id, 'name', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                       <Label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Dosage</Label>
                                       <Input
                                          className="rounded-xl h-12 border-2"
                                          placeholder="e.g. 20mg"
                                          value={med.dosage}
                                          onChange={e => updateMed(med.id, 'dosage', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Time Slot</Label>
                                       <div className="space-y-2">
                                          <Select value={med.timeLabel} onValueChange={v => updateMed(med.id, 'timeLabel', v)}>
                                             <SelectTrigger className="h-12 rounded-xl border-2">
                                                <SelectValue />
                                             </SelectTrigger>
                                             <SelectContent className="rounded-xl">
                                                {medTimeSlots.map(slot => (
                                                   <SelectItem key={slot.label} value={slot.label}>
                                                      {slot.display}
                                                   </SelectItem>
                                                ))}
                                                <SelectItem value="Custom">✨ Custom Time...</SelectItem>
                                             </SelectContent>
                                          </Select>
                                          {med.isCustomTime && (
                                             <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                                                <Clock className="h-4 w-4 text-primary" />
                                                <Input
                                                   type="time"
                                                   className="h-9 rounded-lg border-2 text-xs font-bold"
                                                   value={`${String(med.scheduledHour).padStart(2, '0')}:${String(med.scheduledMinute).padStart(2, '0')}`}
                                                   onChange={(e) => {
                                                      const [h, m] = e.target.value.split(':');
                                                      setMeds(prev => prev.map(p => p.id === med.id ? { ...p, scheduledHour: parseInt(h), scheduledMinute: parseInt(m) } : p));
                                                   }}
                                                />
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> Duration (Days)
                                       </Label>
                                       <Input
                                          type="number"
                                          className="rounded-xl h-12 border-2"
                                          placeholder="7"
                                          value={med.courseDays}
                                          onChange={e => updateMed(med.id, 'courseDays', e.target.value)}
                                       />
                                       <p className="text-[9px] text-primary font-bold pl-1 uppercase">Ends: {med.courseEndDate}</p>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                       <Button variant="ghost" size="icon" onClick={() => removeMed(med.id)} className="text-muted-foreground hover:text-destructive h-12 w-12 hover:bg-destructive/10 rounded-xl">
                                          <Trash2 className="h-5 w-5" />
                                       </Button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>

               <div className="lg:col-span-4 space-y-8">
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                     <CardHeader className="bg-primary text-white pb-8">
                        <CardTitle className="flex items-center gap-2">
                           <Stethoscope className="h-5 w-5" /> Issue Prescription
                        </CardTitle>
                        <CardDescription className="text-blue-100">Final review before digital signing.</CardDescription>
                     </CardHeader>
                     <CardContent className="pt-8 space-y-8">
                        <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed space-y-4">
                           <div className="flex items-center justify-between">
                              <Label className="font-bold">Pharmacy Sync</Label>
                              <Switch
                                 checked={sendToPharmacy}
                                 onCheckedChange={setSendToPharmacy}
                              />
                           </div>
                           <p className="text-xs text-muted-foreground italic">
                              Directly forward to verified pharmacy partners.
                           </p>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border space-y-4">
                           <div className="flex items-center justify-between">
                              <Label className="font-bold">Patient Consent</Label>
                              <Switch
                                 checked={patientConsent}
                                 onCheckedChange={setPatientConsent}
                              />
                           </div>
                           <p className="text-xs text-muted-foreground">
                              Confirm that the patient accepts the medication plan.
                           </p>
                        </div>

                        <div className="pt-4">
                           <Button
                              className="w-full h-16 rounded-2xl text-lg font-bold shadow-lg"
                              onClick={handleSubmit}
                              disabled={loading}
                           >
                              {loading ? "Processing..." : "Issue & Sign RX"}
                           </Button>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </main>
      </div>
   );
}
