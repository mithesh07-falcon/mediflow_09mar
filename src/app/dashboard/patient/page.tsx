
"use client";

import { GlobalSync } from "@/lib/sync-service";
import { useEffect, useState } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { AIDoctorRecommender } from "@/components/patient/AIDoctorRecommender";
import { MedicationList } from "@/components/patient/MedicationList";
import { EnvironmentalTracker } from "@/components/patient/EnvironmentalTracker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  ChevronRight,
  Activity,
  UserPlus,
  PlusCircle,
  FileText,
  Clock,
  Heart,
  Stethoscope,
  Video,
  Loader2,
  Phone,
  Siren,
  Wallet
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: string;
  seed: string;
}

export default function PatientDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [connectingTele, setConnectingTele] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(5000);
  const [isGuardian, setIsGuardian] = useState<boolean>(false);

  useEffect(() => {
    // --- GLOBAL CLOUD SYNC ---
    const runSync = async () => {
       await GlobalSync.pullAppointments();
       await GlobalSync.pullMedicalData();
    };
    runSync();

    const activeUserStr = localStorage.getItem("mediflow_current_user");
    if (!activeUserStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(activeUserStr);

    // REDIRECT GUARD: Force seniors to their high-accessibility portal
    if (user.isElderly) {
      router.push("/dashboard/elderly");
      return;
    }

    setUserName(user.firstName || "Guest");
    setUserProfile(user);

    const saved = localStorage.getItem("mediflow_family_members");
    let members: FamilyMember[] = [];
    const currentEmail = user.email || "default";
    if (saved) {
      const allMembers = JSON.parse(saved);
      members = allMembers.filter((m: any) => m.userId === currentEmail);
      
      // Check if this patient is a guardian
      const hasElderly = members.some(m => 
        (m.relation === "Grandpa" || m.relation === "Grandma" || m.relation === "Father" || m.relation === "Mother" || m.relation === "Elderly") && 
        parseInt(m.age) >= 60
      );
      setIsGuardian(hasElderly);
      
      // Safety fallback if no members exist for this user yet
      if (members.length === 0) {
        const defaultSelf = { id: "1-" + Date.now(), name: user.firstName, relation: "Self", age: user.age || "32", seed: "10", userId: currentEmail };
        members = [defaultSelf];
        allMembers.push(defaultSelf);
        localStorage.setItem("mediflow_family_members", JSON.stringify(allMembers));
      }
      setFamilyMembers(members);
    } else {
      const defaultSelf = [{ id: "1-" + Date.now(), name: user.firstName, relation: "Self", age: user.age || "32", seed: "10", userId: currentEmail }];
      members = defaultSelf;
      setFamilyMembers(defaultSelf);
      localStorage.setItem("mediflow_family_members", JSON.stringify(defaultSelf));
      setIsGuardian(false);
    }

    // Sync wallet balance
    const savedBalance = localStorage.getItem("mediflow_family_wallet_balance");
    if (savedBalance) setWalletBalance(parseInt(savedBalance));

    const fetchSecureAppointments = async (membersList: FamilyMember[]) => {
      try {
        const token = btoa(JSON.stringify(user));
        const res = await fetch("/api/appointments", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // ── HYBRID SYNC: Merge Server Data with Browser Cache ────────────────
        const apiAppts = data.appointments || [];
        const localAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");

        const combined = [...apiAppts];
        localAppts.forEach((l: any) => {
          const exists = apiAppts.some((a: any) => a.date === l.date && a.time === l.time && a.patient === l.patient);
          if (!exists) combined.push(l);
        });

        const now = new Date();

        const upcomingAppts = combined
          .filter((a: any) => {
            if (!a.patient) return false;
            const patientName = a.patient.toLowerCase();
            const matchesFamily = membersList.some(m => m.name && m.name.toLowerCase() === patientName);
            const matchesSelf = patientName === (user.firstName || "").toLowerCase();
            if (!matchesFamily && !matchesSelf) return false;

            // Filter out completed/cancelled/missed statuses
            const s = (a.status || "").toLowerCase();
            if (s === "completed" || s === "done" || s === "missed" || s === "cancelled") return false;

            // Filter out past appointments
            try {
              const apptDate = new Date(`${a.date} ${a.time}`);
              return !isNaN(apptDate.getTime()) && apptDate > now;
            } catch {
              return false;
            }
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(`${a.date} ${a.time}`).getTime();
            const dateB = new Date(`${b.date} ${b.time}`).getTime();
            return dateA - dateB;
          });

        if (upcomingAppts.length > 0) {
          setNextAppointment(upcomingAppts[0]);
        } else {
          setNextAppointment(null);
        }

        const savedBalance = localStorage.getItem("mediflow_family_wallet_balance");
        if (savedBalance) setWalletBalance(parseInt(savedBalance));
      } catch (e) {
        console.error("Clinical Appt Parse Error", e);
        // Deep Fallback: Just use local storage if API is completely broken
        const localAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
        if (localAppts.length > 0) setNextAppointment(localAppts[0]);
      }
    };

    fetchSecureAppointments(members);
  }, [router]);

  const handleEmergencyCall = () => {
    toast({
      variant: "destructive",
      title: "Emergency Response Initiated",
      description: "Redirecting to your nearest Hospital's Emergency Wing...",
    });
    setTimeout(() => {
      window.location.href = "tel:108"; // Emergency response number
    }, 1500);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />

      <main className="flex-1 p-8 bg-background">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary mb-2">Welcome Back, {userName}</h1>
            <p className="text-xl text-muted-foreground">Unified health hub for your family.</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border shadow-sm flex items-center gap-6">
            <div className="flex -space-x-4">
              {familyMembers.map(member => (
                <div key={member.id} className="h-14 w-14 rounded-full border-4 border-white dark:border-zinc-900 bg-muted flex items-center justify-center overflow-hidden shadow-lg group relative">
                  <Image src={`https://picsum.photos/seed/${member.seed}/100`} width={100} height={100} alt={member.name} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-bold">{member.name}</span>
                  </div>
                </div>
              ))}
              <button
                onClick={() => router.push('/dashboard/patient/family')}
                className="h-14 w-14 rounded-full border-4 border-white dark:border-zinc-900 bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <UserPlus className="h-6 w-6" />
              </button>
            </div>
            <div className="hidden lg:block border-l pl-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Managed Profiles</p>
              <p className="text-2xl font-headline font-bold">{familyMembers.length} Members</p>
            </div>
            {userProfile?.guardianName && (
              <div className="hidden xl:block border-l pl-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Guardian Active</p>
                <p className="text-xl font-headline font-bold">{userProfile.guardianName}</p>
                <p className="text-[10px] text-muted-foreground italic">{userProfile.guardianRelationship}</p>
              </div>
            )}
            <div className="hidden sm:block border-l pl-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Language</p>
              <p className="text-xl font-headline font-bold">{userProfile?.language || "English"}</p>
            </div>
          </div>
        </header>

        <EnvironmentalTracker />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-10">
            <AIDoctorRecommender />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">Next Appointment</CardTitle>
                </CardHeader>
                <CardContent>
                  {nextAppointment ? (
                    <div className="flex items-center gap-5 p-4 bg-muted/20 rounded-2xl">
                      <div className="bg-primary text-white p-3 rounded-2xl text-center min-w-[70px]">
                        <div className="text-xl font-bold">{nextAppointment.date.split(' ')[1]}</div>
                        <div className="text-[10px] uppercase font-bold">{nextAppointment.date.split(' ')[0]}</div>
                      </div>
                      <div>
                        <h4 className="font-bold text-base">{nextAppointment.doctor}</h4>
                        <p className="text-xs text-muted-foreground">Patient: {nextAppointment.patient}</p>
                        <Badge variant="secondary" className="mt-2 text-[10px]">{nextAppointment.status}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground italic text-sm border-2 border-dashed rounded-2xl">
                      No upcoming visits.
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-6 rounded-xl group"
                    onClick={() => router.push('/dashboard/patient/my-schedule')}
                  >
                    View Schedule <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center mb-2">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg font-bold">Health Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-5 p-4 bg-muted/20 rounded-2xl">
                    <div className="bg-accent/10 p-4 rounded-2xl text-accent">
                      <Stethoscope className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">Family Health Records</h4>
                      <p className="text-xs text-muted-foreground">Prescriptions, visits & lab reports</p>
                      <Badge variant="outline" className="mt-2 border-accent text-accent text-[10px]">Secure Access</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="rounded-xl group"
                      onClick={() => router.push('/dashboard/patient/family')}
                    >
                      Health Records <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl group"
                      onClick={() => router.push('/dashboard/patient/meds')}
                    >
                      Meds <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl group"
                      onClick={() => router.push('/dashboard/patient/medication-report')}
                    >
                      Medication Report <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Card className="shadow-2xl border-primary/20 bg-white dark:bg-zinc-900 rounded-[2.5rem]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Activity className="h-6 w-6" />
                  Live Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MedicationList />
              </CardContent>
            </Card>

            <Card className="bg-red-600 text-white rounded-[2.5rem] shadow-xl overflow-hidden relative group border-none">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Siren className="h-32 w-32" />
              </div>
              <CardContent className="p-10 relative z-10 space-y-6">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-headline font-bold">ER Service</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-2 rounded-full bg-red-200 animate-pulse" />
                      <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Immediate Call Dispatch</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full h-16 text-xl rounded-2xl bg-white text-red-600 hover:bg-white/90 shadow-lg font-bold flex items-center justify-center gap-2"
                  onClick={handleEmergencyCall}
                >
                  <Phone className="h-6 w-6" />
                  EMERGENCY CALL
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
