
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

   useEffect(() => {
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
      setMeds([...meds, { id: Date.now().toString(), name: "", dosage: "", frequency: "", duration: "7 days" }]);
   };

   const removeMed = (id: string) => setMeds(meds.filter(m => m.id !== id));

   const updateMed = (id: string, field: keyof MedicationItem, value: string) => {
      setMeds(meds.map(m => m.id === id ? { ...m, [field]: value } : m));
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

      setTimeout(() => {
         const savedPrescriptions = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");

         const newPrescription = {
            id: `RX-${Date.now()}`,
            patientId,
            patientName: patientInfo?.name || "Unknown",
            date: new Date().toLocaleDateString(),
            doctorEmail: JSON.parse(localStorage.getItem("mediflow_current_user") || "{}").email,
            doctorName: JSON.parse(localStorage.getItem("mediflow_current_user") || "{}").firstName,
            notes: diagnosisNote,
            medications: meds,
            sentToPharmacy: sendToPharmacy,
            consentCaptured: patientConsent
         };

         localStorage.setItem("mediflow_prescriptions", JSON.stringify([newPrescription, ...savedPrescriptions]));

         setLoading(false);
         toast({
            title: "Prescription Issued",
            description: `Digital records sent to Patient Profile ${sendToPharmacy ? 'and Pharmacy Hub' : ''}.`,
         });
         router.push("/dashboard/doctor/patients");
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
                                 <div key={med.id} className="grid grid-cols-12 gap-3 p-4 bg-muted/20 rounded-2xl border items-end">
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase">Drug Name</Label>
                                       <Input
                                          className="rounded-lg h-10"
                                          placeholder="e.g. Omeprazole"
                                          value={med.name}
                                          onChange={e => updateMed(med.id, 'name', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                       <Label className="text-[10px] uppercase">Dosage</Label>
                                       <Input
                                          className="rounded-lg h-10"
                                          placeholder="e.g. 20mg"
                                          value={med.dosage}
                                          onChange={e => updateMed(med.id, 'dosage', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase">Frequency</Label>
                                       <Input
                                          className="rounded-lg h-10"
                                          placeholder="e.g. Twice Daily"
                                          value={med.frequency}
                                          onChange={e => updateMed(med.id, 'frequency', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                       <Label className="text-[10px] uppercase flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> Duration
                                       </Label>
                                       <Input
                                          className="rounded-lg h-10"
                                          placeholder="7 days"
                                          value={med.duration}
                                          onChange={e => updateMed(med.id, 'duration', e.target.value)}
                                       />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                       <Button variant="ghost" size="icon" onClick={() => removeMed(med.id)} className="text-muted-foreground hover:text-destructive h-10 w-10">
                                          <Trash2 className="h-4 w-4" />
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
