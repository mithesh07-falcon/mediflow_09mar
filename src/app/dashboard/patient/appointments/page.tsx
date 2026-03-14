
"use client";

import { useState, useEffect, useMemo } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  Clock,
  ArrowRight,
  CalendarDays,
  UserCheck,
  Activity,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";

export default function AppointmentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const [onboardedDoctors, setOnboardedDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [filterSpec, setFilterSpec] = useState("all");
  const [masterSlots, setMasterSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [symptomsDesc, setSymptomsDesc] = useState("");
  const [recommendedSpec, setRecommendedSpec] = useState<string | null>(null);

  useEffect(() => {
    const activeUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    const currentEmail = activeUser.email || "default";
    const savedFamily = JSON.parse(localStorage.getItem("mediflow_family_members") || "[]");
    
    let members = savedFamily.filter((m: any) => m.userId === currentEmail);
    if (members.length === 0) {
      members = [{ id: "1-" + Date.now(), name: activeUser.firstName || "User", relation: "Self", age: activeUser.age || "30", seed: "10", userId: currentEmail }];
    }
    
    setFamilyMembers(members);
    if (members.length > 0) setSelectedFamily(members[0].name);

    // AI SUGGESTION: Read context from dashboard analysis
    const lastAnalysis = localStorage.getItem("mediflow_last_symptom_analysis");
    let aiSpecialist = "";
    let aiDescription = "";
    if (lastAnalysis) {
      const parsed = JSON.parse(lastAnalysis);
      aiSpecialist = parsed.specialist || "";
      aiDescription = parsed.description || "";
      setSymptomsDesc(aiDescription);
      // Clean up help context after reading
      localStorage.removeItem("mediflow_last_symptom_analysis");
    }

    // Fetch doctors from Server API
    const fetchDoctors = async () => {
      try {
        const res = await fetch('/api/doctors');
        const data = await res.json();
        if (data.doctors) {
          setOnboardedDoctors(data.doctors);
          const specs = Array.from(new Set(data.doctors.map((d: any) => d.specialization))) as string[];
          setSpecializations(specs);

          // AUTO-SELECT for recommendation
          if (aiSpecialist && aiSpecialist !== "all") {
            // ── Smart Specialist Matcher ──────────────────────────────────
            // Priority keyword map: maps known AI output words → DB spec keywords
            const keywordMap: Record<string, string[]> = {
              ent: ["ent", "ear", "nose", "throat"],
              gastro: ["gastro", "stomach", "digestive", "gi"],
              neuro: ["neuro", "brain", "nerve"],
              cardio: ["cardio", "heart"],
              ophthal: ["ophthal", "eye", "vision", "ocular"],
              ortho: ["ortho", "bone", "joint", "spine", "muscle"],
              derma: ["derma", "skin", "dermatol"],
              pediatr: ["pediatr", "child"],
              general: ["general", "medicine", "family", "internal"],
            };
            const normalizedAI = aiSpecialist.toLowerCase();

            // 1. Try exact match first
            let bestSpec = specs.find(s => s.toLowerCase() === normalizedAI);

            // 2. Try: AI output keywords exist inside DB spec name
            if (!bestSpec) {
              bestSpec = specs.find(s => {
                const sl = s.toLowerCase();
                return normalizedAI.split(/[\s,/-]+/).some(word => word.length > 2 && sl.includes(word));
              });
            }

            // 3. Try: DB spec keywords exist inside AI output string
            if (!bestSpec) {
              bestSpec = specs.find(s => {
                const sl = s.toLowerCase();
                return sl.split(/[\s,/-]+/).some(word => word.length > 2 && normalizedAI.includes(word));
              });
            }

            // 4. Keyword-map fallback
            if (!bestSpec) {
              for (const [_group, keywords] of Object.entries(keywordMap)) {
                if (keywords.some(kw => normalizedAI.includes(kw))) {
                  const found = specs.find(s => keywords.some(kw => s.toLowerCase().includes(kw)));
                  if (found) { bestSpec = found; break; }
                }
              }
            }

            const resolvedSpec = bestSpec || aiSpecialist;
            setRecommendedSpec(resolvedSpec);
            setFilterSpec(resolvedSpec);

            const suggestedDoc = data.doctors.find((d: any) =>
              d.specialization === resolvedSpec ||
              d.specialization?.toLowerCase() === normalizedAI
            );
            if (suggestedDoc) {
              setSelectedDoctor(suggestedDoc.email);
            }
          } else if (aiSpecialist === "all") {
            setFilterSpec("all");
          }
        }
      } catch (err) {
        console.error("Failed to fetch doctors", err);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    setCheckingSlots(true);

    // ── LOCAL DATE STRING (timezone-safe) ────────────────────────────────
    // NEVER use toISOString() for date comparison — it returns UTC which is
    // offset by +5:30 for IST users, causing wrong "isToday" detection.
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const dateStr = `${localYear}-${localMonth}-${localDay}`;

    const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const timer = setTimeout(() => {
      // MASTER SLOT LOGIC: Fetch Admin-configured slots for this doctor/date
      const allMaster = JSON.parse(localStorage.getItem("mediflow_master_schedules") || "{}");
      const rawSlots: string[] = allMaster[`${selectedDoctor}_${dateStr}`] ||
        ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];

      // ── TIME-AWARE SLOT FILTER (LOCAL TIMEZONE) ──────────────────────────
      // Build today's local date string the same timezone-safe way
      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      const isToday = dateStr === todayStr;
      let availableSlots = rawSlots;

      if (isToday) {
        availableSlots = rawSlots.filter(slot => {
          // Parse "09:00 AM" or "02:00 PM"
          const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return true;
          let hours = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && hours !== 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;

          // Build a Date object for this slot using today's LOCAL date
          const slotTime = new Date();
          slotTime.setHours(hours, mins, 0, 0);

          // STRICT: hide any slot whose time is <= right now
          return slotTime.getTime() > now.getTime();
        });
      }

      setMasterSlots(availableSlots);

      // COLLISION CHECK: Fetch existing appointments
      const allAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
      setBookedSlots(
        allAppts
          .filter((a: any) => a.doctorEmail === selectedDoctor && a.date === displayDate)
          .map((a: any) => a.time)
      );

      setCheckingSlots(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedDoctor, date]);

  const filteredDoctors = useMemo(() => filterSpec === "all" ? onboardedDoctors : onboardedDoctors.filter(d => d.specialization === filterSpec), [onboardedDoctors, filterSpec]);

  const handleBook = () => {
    if (!date || !selectedDoctor || !selectedSlot) return;
    const doctor = onboardedDoctors.find(d => d.email === selectedDoctor);
    localStorage.setItem("mediflow_pending_payment", JSON.stringify({
      doctor: doctor?.name,
      doctorEmail: doctor?.email,
      patient: selectedFamily,
      time: selectedSlot,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      fee: 300,
      symptoms: symptomsDesc
    }));
    router.push("/dashboard/patient/appointments/payment");
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />
      <main className="flex-1 p-8 bg-slate-50/30">
        <header className="mb-12"><h1 className="text-5xl font-headline font-bold text-primary">Clinical Scheduler</h1></header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-6">
              <Label className="text-lg font-bold uppercase text-slate-400">0. Select Patient Profile</Label>
              <div className="flex flex-wrap gap-3">
                {familyMembers.map((member) => (
                  <Button
                    key={member.id}
                    variant={selectedFamily === member.name ? "default" : "outline"}
                    className={`h-16 px-6 rounded-2xl flex items-center gap-3 transition-all ${selectedFamily === member.name ? 'shadow-lg shadow-primary/20 scale-[1.02]' : ''}`}
                    onClick={() => setSelectedFamily(member.name)}
                  >
                    <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden relative">
                      <img src={`https://picsum.photos/seed/${member.seed || member.id}/100`} alt={member.name} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black leading-none">{member.name}</p>
                      <p className="text-[10px] font-bold opacity-60 uppercase">{member.relation}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-lg font-bold uppercase text-slate-400">1. Select Clinician</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant={filterSpec === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => { setFilterSpec("all"); setSelectedDoctor(""); setDate(undefined); setSelectedSlot(""); }}>All</Badge>
                {specializations.map(s => <Badge key={s} variant={filterSpec === s ? "default" : "outline"} className="cursor-pointer" onClick={() => { setFilterSpec(s); setSelectedDoctor(""); setDate(undefined); setSelectedSlot(""); }}>{s}</Badge>)}
              </div>
              <Select value={selectedDoctor} onValueChange={(val) => { setSelectedDoctor(val); setDate(undefined); setSelectedSlot(""); }}>
                <SelectTrigger className="h-16 rounded-2xl border-2 px-6"><SelectValue placeholder="Search clinical staff..." /></SelectTrigger>
                <SelectContent>
                  {filteredDoctors.map(doc => <SelectItem key={doc.email} value={doc.email}>{doc.name} ({doc.specialization})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedDoctor && date && (
              <div className="space-y-6 animate-in slide-in-from-top-4">
                <div className="space-y-3">
                  <Label className="text-lg font-bold uppercase text-slate-400">3. Symptom Notes</Label>
                  <Textarea
                    placeholder="Briefly describe what you're facing..."
                    className="min-h-[100px] rounded-2xl border-2 resize-none"
                    value={symptomsDesc}
                    onChange={(e) => setSymptomsDesc(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-bold uppercase text-slate-400">4. Arrival Slot</Label>
                  {checkingSlots ? (
                    <div className="flex items-center gap-2 text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-widest">Verifying clinical slots...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {masterSlots.map(slot => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? "default" : "outline"}
                          disabled={bookedSlots.includes(slot)}
                          className={`h-14 rounded-2xl ${selectedSlot === slot ? 'shadow-lg shadow-primary/20 scale-[1.02]' : ''} transition-all`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot} {bookedSlots.includes(slot) && "(Booked)"}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-20 text-2xl font-bold rounded-3xl shadow-xl shadow-primary/20 mt-8 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                  onClick={handleBook}
                  disabled={!selectedSlot}
                >
                  Proceed to Payment
                </Button>
              </div>
            )}
          </div>
          <div className="lg:col-span-7 space-y-6">
            <Label className="text-lg font-bold uppercase text-slate-400">2. Mark Date</Label>
            <div className={!selectedDoctor ? 'opacity-40 pointer-events-none grayscale' : ''}>
              <div className="rounded-[3rem] border-2 shadow-2xl overflow-hidden bg-white">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setSelectedSlot(""); }}
                  className="w-full"
                  disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
