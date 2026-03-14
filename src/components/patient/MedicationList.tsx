
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2, Bell, Clock, Pill, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Medication {
  id: string | number;
  name: string;
  dose: string;
  timeLabel: string;
  taken: boolean;
  instruction?: string;
}

const langMap: any = {
  English: "en-US",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
};

export function MedicationList() {
  const { toast } = useToast();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState("English");

  const [maxAlerts, setMaxAlerts] = useState<number>(5);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedMax = localStorage.getItem("mediflow_max_alerts");
    if (savedMax) setMaxAlerts(parseInt(savedMax));
  }, []);

  const handleMaxAlertsChange = (val: string) => {
    const num = parseInt(val) || 0;
    const bounded = Math.max(1, Math.min(20, num));
    setMaxAlerts(bounded);
    localStorage.setItem("mediflow_max_alerts", bounded.toString());
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (user.language) setPreferredLanguage(user.language);

    const fetchPrescribedMeds = () => {
      const savedFamily = localStorage.getItem("mediflow_family_members");
      const familyMembers = savedFamily ? JSON.parse(savedFamily) : [];
      const currentEmail = user?.email || "default";
      const myMembers = familyMembers.filter((m: any) => m.userId === currentEmail);
      const authorizedNames = myMembers.length > 0
        ? myMembers.map((m: any) => m.name.toLowerCase())
        : [user?.firstName?.toLowerCase()].filter(Boolean);

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
            instruction: m.instructions || "",
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
    // Reset alert count when taken so if it's unchecked again, it can restart
    if (newState) {
      localStorage.setItem(`med_alert_count_${id}`, "0");
    }
  };

  // Alert Reminder System
  useEffect(() => {
    if (loading || meds.length === 0) return;

    const alertInterval = setInterval(() => {
      meds.forEach(med => {
        if (!med.taken) {
          const currentCount = parseInt(localStorage.getItem(`med_alert_count_${med.id}`) || "0");
          if (currentCount < maxAlerts) {
            toast({
              title: "Medication Reminder",
              description: `⚠️ Please take ${med.name} (${med.dose}). Alert ${currentCount + 1} of ${maxAlerts}`,
              variant: "destructive",
            });
            localStorage.setItem(`med_alert_count_${med.id}`, (currentCount + 1).toString());
          }
        }
      });
    }, 15000); // Trigger every 15 seconds for demonstration purposes

    return () => clearInterval(alertInterval);
  }, [meds, loading, maxAlerts, toast]);

  const speakMed = (med: Medication) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const ttsLang = langMap[preferredLanguage] || "en-US";
    let text = `Medication: ${med.name}. Dosage: ${med.dose}. Time: ${med.timeLabel}. ${med.instruction}`;

    // Simple regional templates
    if (preferredLanguage === "Hindi") {
      text = `दवाई: ${med.name}। खुराक: ${med.dose}। समय: ${med.timeLabel}। निर्देश: ${med.instruction || "समय पर दवा लें"}`;
    } else if (preferredLanguage === "Tamil") {
      text = `மருந்து: ${med.name}. அளவு: ${med.dose}. நேரம்: ${med.timeLabel}. குறிப்பு: ${med.instruction || "மருந்தை நேரத்திற்கு எடுத்துக் கொள்ளுங்கள்"}`;
    } else if (preferredLanguage === "Telugu") {
      text = `మందు: ${med.name}. మోతాదు: ${med.dose}. సమయం: ${med.timeLabel}. సూచన: ${med.instruction || "సమయానికి మందు తీసుకోండి"}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
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
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary text-white">
            {meds.length} Prescribed
          </Badge>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="bg-slate-50 border-dashed transition-all animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-4 flex flex-col gap-2">
            <Label className="font-bold flex justify-between items-center">
              Alert Frequency Limit (Max 20)
              <Badge variant="outline">{maxAlerts} alerts per pill</Badge>
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                max={20}
                min={1}
                value={maxAlerts}
                onChange={(e) => handleMaxAlertsChange(e.target.value)}
                className="font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground italic">You will receive unmissable reminders every 15 seconds up to this limit if a pill is ignored.</p>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speakMed(med)}
                className="h-10 w-10 bg-primary/20 hover:bg-primary/30 rounded-full"
              >
                <Bell className="h-4 w-4 text-primary" />
              </Button>
              <div className="flex flex-col items-center gap-1">
                <Checkbox
                  checked={med.taken}
                  onCheckedChange={() => toggleTaken(med.id)}
                  className="h-7 w-7 rounded-xl border-2 border-primary"
                />
                <span className="text-[8px] uppercase font-bold text-muted-foreground">{med.taken ? "Taken" : "Mark"}</span>
              </div>
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
