"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Droplet,
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  Smile,
  Meh,
  Frown,
  HeartPulse,
  Thermometer,
  Waves,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ElderlyHealthReading,
  WellnessEntry,
  appendGuardianNotification,
  loadHealthReadings,
  loadWellnessLog,
  saveHealthReadings,
  saveWellnessLog,
} from "@/lib/elderly-portal";
import { useToast } from "@/hooks/use-toast";

type ReadingType = ElderlyHealthReading["type"];

const typeMeta: Record<ReadingType, { label: string; icon: any; unit: string; placeholder: string }> = {
  blood_sugar: { label: "Blood Sugar", icon: Droplet, unit: "mg/dL", placeholder: "110" },
  blood_pressure: { label: "Blood Pressure", icon: Activity, unit: "mmHg", placeholder: "120/80" },
  pulse: { label: "Pulse", icon: HeartPulse, unit: "bpm", placeholder: "72" },
  oxygen: { label: "Oxygen", icon: Waves, unit: "%", placeholder: "98" },
  temperature: { label: "Temperature", icon: Thermometer, unit: "F", placeholder: "98.4" },
};

function determineStatus(type: ReadingType, value: string): "normal" | "abnormal" {
  const trimmed = value.trim();

  if (type === "blood_pressure") {
    const parts = trimmed.split("/").map((v) => Number(v));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const [systolic, diastolic] = parts;
      return systolic <= 140 && diastolic <= 90 ? "normal" : "abnormal";
    }
    return "abnormal";
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return "abnormal";

  if (type === "blood_sugar") return num >= 70 && num <= 140 ? "normal" : "abnormal";
  if (type === "pulse") return num >= 55 && num <= 100 ? "normal" : "abnormal";
  if (type === "oxygen") return num >= 95 ? "normal" : "abnormal";
  if (type === "temperature") return num >= 97 && num <= 99.5 ? "normal" : "abnormal";

  return "normal";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ElderlyHealthTrackingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [readings, setReadings] = useState<ElderlyHealthReading[]>([]);
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<ReadingType>("blood_sugar");

  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [mood, setMood] = useState<WellnessEntry["mood"]>("okay");
  const [moodNote, setMoodNote] = useState("");

  useEffect(() => {
    const savedReadings = loadHealthReadings();
    const initialReadings: ElderlyHealthReading[] =
      savedReadings.length > 0
        ? savedReadings
        : [
            {
              id: "r1",
              type: "blood_sugar",
              value: "115",
              unit: "mg/dL",
              status: "normal",
              createdAt: new Date().toISOString(),
            },
            {
              id: "r2",
              type: "blood_pressure",
              value: "135/85",
              unit: "mmHg",
              status: "normal",
              createdAt: new Date(Date.now() - 8.64e7).toISOString(),
            },
          ];

    setReadings(initialReadings);
    if (savedReadings.length === 0) {
      saveHealthReadings(initialReadings);
    }

    setWellness(loadWellnessLog());
  }, []);

  const latestByType = useMemo(() => {
    const map: Partial<Record<ReadingType, ElderlyHealthReading>> = {};
    for (const entry of readings) {
      if (!map[entry.type]) {
        map[entry.type] = entry;
      }
    }
    return map;
  }, [readings]);

  const addReading = () => {
    if (!newValue.trim()) return;

    const status = determineStatus(newType, newValue);
    const next: ElderlyHealthReading = {
      id: `${Date.now()}`,
      type: newType,
      value: newValue.trim(),
      unit: typeMeta[newType].unit,
      status,
      createdAt: new Date().toISOString(),
    };

    const updated = [next, ...readings];
    setReadings(updated);
    saveHealthReadings(updated);
    setNewValue("");

    if (status === "abnormal") {
      appendGuardianNotification({
        type: "wellness_alert",
        message: `Abnormal ${typeMeta[newType].label} reading recorded: ${next.value} ${next.unit}`,
      });

      toast({
        variant: "destructive",
        title: "Please monitor this reading",
        description: `${typeMeta[newType].label} looks outside normal range.`,
      });
    } else {
      toast({
        title: "Reading saved",
        description: `${typeMeta[newType].label} added successfully.`,
      });
    }
  };

  const saveMood = () => {
    const next: WellnessEntry = {
      id: `${Date.now()}`,
      mood,
      note: moodNote.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [next, ...wellness].slice(0, 50);
    setWellness(updated);
    saveWellnessLog(updated);
    setMoodNote("");

    if (mood === "low") {
      appendGuardianNotification({
        type: "wellness_alert",
        message: `Wellness check-in marked as low mood. Note: ${next.note || "No note"}`,
      });
    }

    toast({ title: "Wellness check-in saved" });
  };

  const downloadReport = () => {
    const reportLines = [
      "MediFlow Elder Health Report",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Recent Readings:",
      ...readings.slice(0, 30).map((r) => `${formatDate(r.createdAt)} | ${typeMeta[r.type].label}: ${r.value} ${r.unit} | ${r.status}`),
      "",
      "Mood Check-ins:",
      ...wellness.slice(0, 30).map((w) => `${formatDate(w.createdAt)} | Mood: ${w.mood} | Note: ${w.note || "-"}`),
    ].join("\n");

    const blob = new Blob([reportLines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "elder-health-report.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black p-10 space-y-12">
      <Button
        className="h-24 px-12 text-4xl font-black bg-black text-white rounded-[2rem] border-[8px] border-black flex items-center gap-6"
        onClick={() => router.push("/dashboard/elderly")}
      >
        <ArrowLeft className="h-10 w-10" /> GO HOME
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-7xl font-black uppercase tracking-tight">Health Tracking</h1>
          <p className="text-2xl font-bold text-slate-500">Vitals, history, and wellness check-in in one place.</p>
        </div>
        <Button
          className="h-16 px-8 text-2xl font-black bg-black text-white border-4 border-black rounded-xl"
          onClick={downloadReport}
        >
          <Download className="h-6 w-6 mr-2" /> DOWNLOAD REPORT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {(Object.keys(typeMeta) as ReadingType[]).map((type) => {
          const Icon = typeMeta[type].icon;
          const latest = latestByType[type];
          return (
            <div key={type} className="p-5 border-4 border-black rounded-2xl bg-slate-50">
              <p className="text-xs font-black uppercase opacity-50">{typeMeta[type].label}</p>
              <div className="flex items-center gap-3 mt-2">
                <Icon className="h-7 w-7" />
                <p className="text-2xl font-black">{latest ? `${latest.value} ${latest.unit}` : "No data"}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-8 border-[6px] border-black rounded-[2rem] space-y-6">
        <h2 className="text-4xl font-black uppercase">Add New Reading</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(typeMeta) as ReadingType[]).map((type) => {
            const Icon = typeMeta[type].icon;
            return (
              <Button
                key={type}
                className={`h-16 text-2xl font-black rounded-xl border-4 ${
                  newType === type ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"
                }`}
                onClick={() => setNewType(type)}
              >
                <Icon className="h-6 w-6 mr-2" /> {typeMeta[type].label}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Label className="text-xl font-black uppercase">Enter Value ({typeMeta[newType].unit})</Label>
          <Input
            className="h-16 text-3xl font-black border-4 border-black rounded-xl"
            placeholder={typeMeta[newType].placeholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
        </div>

        <Button
          className="h-16 w-full text-2xl font-black bg-black text-white border-4 border-black rounded-xl"
          onClick={addReading}
        >
          <Plus className="h-6 w-6 mr-2" /> SAVE READING
        </Button>
      </div>

      <div className="p-8 border-[6px] border-black rounded-[2rem] space-y-5">
        <h2 className="text-4xl font-black uppercase">Mood / Wellness Check-in</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            className={`h-14 px-6 text-xl font-black border-4 rounded-xl ${mood === "great" ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"}`}
            onClick={() => setMood("great")}
          >
            <Smile className="h-5 w-5 mr-2" /> GREAT
          </Button>
          <Button
            className={`h-14 px-6 text-xl font-black border-4 rounded-xl ${mood === "okay" ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"}`}
            onClick={() => setMood("okay")}
          >
            <Meh className="h-5 w-5 mr-2" /> OKAY
          </Button>
          <Button
            className={`h-14 px-6 text-xl font-black border-4 rounded-xl ${mood === "low" ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"}`}
            onClick={() => setMood("low")}
          >
            <Frown className="h-5 w-5 mr-2" /> LOW
          </Button>
        </div>
        <Input
          className="h-14 text-xl font-bold border-4 border-black rounded-xl"
          placeholder="Optional note (example: headache since morning)"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
        />
        <Button
          className="h-14 px-8 text-xl font-black bg-black text-white border-4 border-black rounded-xl"
          onClick={saveMood}
        >
          SAVE CHECK-IN
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-4xl font-black uppercase">Recent Records</h2>
        {readings.slice(0, 12).map((r) => {
          const Icon = typeMeta[r.type].icon;
          return (
            <div key={r.id} className="p-6 border-[6px] border-black rounded-[1.5rem] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Icon className="h-10 w-10" />
                <div>
                  <p className="text-2xl font-black uppercase">{typeMeta[r.type].label}</p>
                  <p className="text-lg font-bold text-slate-500">{formatDate(r.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-3xl font-black">{r.value} {r.unit}</p>
                {r.status === "normal" ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
