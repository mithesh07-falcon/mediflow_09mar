
"use client";

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
  Loader2
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

  useEffect(() => {
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

    const saved = localStorage.getItem("mediflow_family_members");
    let members: FamilyMember[] = [];
    if (saved) {
      members = JSON.parse(saved);
      setFamilyMembers(members);
    } else {
      const defaultSelf = [{ id: "1", name: user.firstName, relation: "Self", age: user.age || "32", seed: "10" }];
      members = defaultSelf;
      setFamilyMembers(defaultSelf);
      localStorage.setItem("mediflow_family_members", JSON.stringify(defaultSelf));
    }

    const fetchSecureAppointments = async (membersList: FamilyMember[]) => {
      try {
        const token = btoa(JSON.stringify(user));
        const res = await fetch("/api/appointments", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.appointments) {
          // The backend strictly isolates by user, we only need to filter for family mapping locally if needed
          const myAppts = data.appointments.filter((a: any) => {
            if (!a.patient) return false;
            const patientName = a.patient.toLowerCase();
            const matchesFamily = membersList.some(m => m.name && m.name.toLowerCase() === patientName);
            const matchesSelf = patientName === (user.firstName || "").toLowerCase();
            return matchesFamily || matchesSelf;
          });
          if (myAppts.length > 0) {
            setNextAppointment(myAppts[0]);
          }
        }
      } catch (e) {
        console.error("Clinical Appt Parse Error", e);
      }
    };

    fetchSecureAppointments(members);
  }, [router]);

  const handleTeleConsult = () => {
    setConnectingTele(true);
    setTimeout(() => {
      setConnectingTele(false);
      toast({
        title: "Clinical Room Ready",
        description: "A specialized clinician is now available for your urgent consultation.",
      });
    }, 2000);
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
                    onClick={() => router.push('/dashboard/patient/appointments')}
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
                      <h4 className="font-bold text-base">Digital Records</h4>
                      <p className="text-xs text-muted-foreground">Verify prescriptions & labs</p>
                      <Badge variant="outline" className="mt-2 border-accent text-accent text-[10px]">Secure Access</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 rounded-xl group"
                    onClick={() => router.push('/dashboard/patient/meds')}
                  >
                    View Meds <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
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

            <Card className="bg-primary text-white rounded-[2.5rem] shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Video className="h-32 w-32" />
              </div>
              <CardContent className="p-10 relative z-10 space-y-6">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-headline font-bold">Urgent Help</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Connect in 60s</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full h-16 text-xl rounded-2xl bg-white text-primary hover:bg-white/90 shadow-lg font-bold flex items-center justify-center gap-2"
                  onClick={handleTeleConsult}
                  disabled={connectingTele}
                >
                  {connectingTele ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Video className="h-6 w-6" />
                      Tele-Consult
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
