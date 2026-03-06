
"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Clock, Pill, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Medication {
  id: string | number;
  name: string;
  dose: string;
  timeLabel: string;
  taken: boolean;
}

export function MedicationList() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescribedMeds = () => {
      const savedFamily = localStorage.getItem("mediflow_family_members");
      const familyMembers = savedFamily ? JSON.parse(savedFamily) : [];
      const authorizedNames = familyMembers.map((m: any) => m.name.toLowerCase());

      const saved = localStorage.getItem("mediflow_prescriptions");
      if (saved && authorizedNames.length > 0) {
        const prescriptions = JSON.parse(saved);
        
        // STRICT PRIVACY: Only show meds issued to this account or its family members
        const myPrescriptions = prescriptions.filter((rx: any) => 
          authorizedNames.includes(rx.patientName?.toLowerCase())
        );

        const extractedMeds: Medication[] = myPrescriptions.flatMap((rx: any) => 
          rx.medications.map((m: any) => ({
            id: m.id,
            name: m.name,
            dose: m.dosage,
            timeLabel: m.timeLabel,
            taken: JSON.parse(localStorage.getItem(`med_taken_${m.id}`) || "false")
          }))
        );
        setMeds(extractedMeds);
      }
      setLoading(false);
    };

    fetchPrescribedMeds();
    const interval = setInterval(fetchPrescribedMeds, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleTaken = (id: string | number) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    
    const newState = !med.taken;
    setMeds(meds.map(m => m.id === id ? { ...m, taken: newState } : m));
    localStorage.setItem(`med_taken_${id}`, JSON.stringify(newState));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (meds.length === 0) {
    return (
      <div className="text-center py-12 px-6 border-2 border-dashed rounded-[2rem] bg-slate-50/50">
        <Pill className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-bold text-lg">No Active Prescription</h3>
        <p className="text-xs text-muted-foreground">Your doctor hasn't issued a digital prescription yet.</p>
      </div>
    );
  }

  const remaining = meds.filter(m => !m.taken).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
         <h3 className="font-headline font-bold text-xl">Today's Schedule</h3>
         <Badge variant="secondary" className="bg-primary text-white">
           {meds.length} Prescribed
         </Badge>
      </div>
      
      {meds.map((med) => (
        <Card key={med.id} className={cn("transition-all border-l-4 overflow-hidden", med.taken ? "border-l-green-500 opacity-75" : "border-l-primary shadow-sm")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn("p-2 rounded-lg", med.taken ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary")}>
              <Pill className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-bold truncate max-w-[120px]", med.taken && "line-through text-muted-foreground")}>{med.name}</span>
                <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-1.5 rounded">{med.dose}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {med.timeLabel}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Checkbox 
                  checked={med.taken} 
                  onCheckedChange={() => toggleTaken(med.id)}
                  className="h-7 w-7 rounded-xl border-2 border-primary"
                />
                <span className="text-8px] uppercase font-bold text-muted-foreground">{med.taken ? "Taken" : "Mark"}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {remaining > 0 ? (
        <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3 mt-6 border border-primary/10">
           <Bell className="h-5 w-5 text-primary animate-bounce" />
           <p className="text-[10px] text-primary font-bold">
             Smart Alert: You have {remaining} dose{remaining > 1 ? 's' : ''} remaining for today.
           </p>
        </div>
      ) : (
        <div className="bg-green-50 p-4 rounded-2xl flex items-center gap-3 mt-6 border border-green-100">
           <CheckCircle2 className="h-5 w-5 text-green-600" />
           <p className="text-[10px] text-green-700 font-bold">
             Great work! All prescribed doses are recorded for today.
           </p>
        </div>
      )}
    </div>
  );
}
