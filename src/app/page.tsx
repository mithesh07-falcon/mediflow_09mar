
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Loader2,
  Heart,
  Eye,
  EyeOff,
  Stethoscope,
  User,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// MASTER CLINICAL CREDENTIALS (Admin remains hardcoded for safety)
const ADMIN_EMAIL = "admin@mediflow.com";
const ADMIN_PASS = "MediFlowAdmin2024!";

export default function MultiRoleLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | "pharmacist" | "admin" | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("mediflow_current_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.isElderly) {
        router.push("/dashboard/elderly");
      }
    }
  }, [router]);

  const handleLogin = async (role: string, data: any) => {
    setLoading(true);
    const email = data.email?.toLowerCase();
    const password = data.password;

    // 1. ADMIN AUTHENTICATION
    if (role === 'admin') {
      setTimeout(() => {
        if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
          localStorage.setItem("mediflow_current_user", JSON.stringify({ email, role: 'admin', firstName: "Admin" }));
          router.push("/dashboard/admin");
          setLoading(false);
          return;
        } else {
          toast({ variant: "destructive", title: "Admin Denied", description: "Invalid administrative credentials." });
          setLoading(false);
          return;
        }
      }, 200);
      return;
    }

    // 2. DOCTOR AUTHENTICATION — Verified against SERVER mock data
    if (role === 'doctor') {
      try {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          // --- VERCEL EPHEMERAL FALLBACK ---
          const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
          const matched = localStaff.find((s: any) => s.role === 'doctor' && s.email.toLowerCase() === email && (s.password === password || s.passwordPlain === password));
          
          if (!matched) {
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: result.error || "Invalid credentials. Doctor accounts are hospital-managed. Contact Admin.",
            });
            setLoading(false);
            return;
          } else {
            result.doctor = matched;
          }
        }

        const doc = result.doctor;
        localStorage.setItem("mediflow_current_user", JSON.stringify({
          email: doc.email,
          role: 'doctor',
          firstName: doc.name,
          specialization: doc.specialization,
          license: doc.license,
          phone: doc.phone,
        }));

        // Also sync to staff list so admin dashboard and schedules stay in sync
        const savedStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
        if (!savedStaff.some((s: any) => s.email.toLowerCase() === doc.email.toLowerCase())) {
          savedStaff.push({ ...doc, password: "••••••••" });
          localStorage.setItem("mediflow_staff", JSON.stringify(savedStaff));
        }

        setLoading(false);
        toast({ title: "Access Granted", description: `Welcome, ${doc.name}. Your clinical session is active.` });
        router.push('/dashboard/doctor');
      } catch (err) {
        toast({ variant: "destructive", title: "Server Error", description: "Could not reach the authentication server." });
        setLoading(false);
      }
      return;
    }

    // 3. PHARMACIST AUTHENTICATION — Verified against SERVER registry
    if (role === 'pharmacist') {
      try {
        const res = await fetch('/api/pharmacists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          // --- VERCEL EPHEMERAL FALLBACK ---
          const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
          const matched = localStaff.find((s: any) => s.role === 'pharmacist' && s.email.toLowerCase() === email && (s.password === password || s.passwordPlain === password));
          
          if (!matched) {
            toast({ variant: "destructive", title: "Access Denied", description: result.error || "No pharmacy account found." });
            setLoading(false);
            return;
          } else {
            result.pharmacist = matched;
          }
        }

        const pharmacist = result.pharmacist;
        localStorage.setItem("mediflow_current_user", JSON.stringify({
          email: pharmacist.email,
          role: 'pharmacist',
          firstName: pharmacist.name,
          specialization: "Clinical Pharmacy"
        }));

        setLoading(false);
        toast({ title: "Access Granted", description: `Welcome to MediFlow HQ.` });
        router.push('/dashboard/pharmacist');
      } catch (err) {
        toast({ variant: "destructive", title: "Server Error", description: "Pharmacist database offline." });
        setLoading(false);
      }
      return;
    }

    // 4. PATIENT AUTHENTICATION — Verified against SERVER data
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const result = await res.json();

      let patient = result.patient;

      // FALLBACK: If server doesn't have the user (happens on Vercel resets), check local storage
      if (!patient) {
        const localPatients = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
        const matched = localPatients.find((p: any) => p.email.toLowerCase() === email && p.password === password);
        if (matched) {
          patient = matched;
          console.log("MediFlow: Logged in via Local Identity (Server session reset).");
        }
      }

      if (!patient) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: result.error || "Invalid credentials. Please check your email and password.",
        });
        setLoading(false);
        return;
      }

      // CROSS-PORTAL GUARD: Prevent pre-registered staff from using patient portal
      if (patient.email.includes('@mediflow.com')) {
        toast({
          variant: "destructive",
          title: "Portal Access Denied",
          description: "This is a private clinical staff email. Please use the Doctor or Pharmacist portal."
        });
        setLoading(false);
        return;
      }

      localStorage.setItem("mediflow_current_user", JSON.stringify({ ...patient, role: 'patient' }));

      setLoading(false);
      toast({ title: "Access Granted", description: `Welcome back, ${patient.firstName}!` });
      router.push('/dashboard/patient');
    } catch (err: any) {
      console.error("Login Error:", err);
      toast({
        variant: "destructive",
        title: "System Exception",
        description: err.message || "The authentication server encountered a critical error. Please try again."
      });
      setLoading(false);
    }
  };

  const PortalCard = ({ role, title, description, icon: Icon, color }: any) => (
    <Card className="rounded-[2.5rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white group cursor-pointer" onClick={() => setSelectedRole(role)}>
      <CardContent className="pt-10 pb-10 px-8 flex flex-col items-center text-center">
        <div className={`h-16 w-16 rounded-2xl ${color || 'bg-primary/5'} flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors`}>
          <Icon className={`h-8 w-8 ${color ? 'text-white' : 'text-primary'} group-hover:text-white`} />
        </div>
        <h3 className="text-2xl font-headline font-bold mb-4">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-8 min-h-[40px]">{description}</p>
        <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-4 transition-all">
          Enter Portal <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-zinc-950">
      <nav className="p-6 flex justify-between items-center fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Network</span>
        </div>
        <ThemeToggle />
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-20">
        <div className="text-center mb-12 flex flex-col items-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-5xl font-headline font-bold text-[#1F2937] tracking-tight">MediFlow</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Integrated Clinical Systems</p>
          </div>
        </div>

        {!selectedRole ? (
          <div className="w-full max-w-6xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PortalCard role="patient" title="Patient Portal" description="Manage family health and book appointments." icon={User} />
              <PortalCard role="doctor" title="Doctor Portal" description="Access patient records and schedules." icon={Stethoscope} />
              <PortalCard role="pharmacist" title="Pharmacy Portal" description="Verify digital prescriptions and manage inventory." icon={ClipboardList} />
              <PortalCard role="admin" title="Admin Portal" description="Staff governance, master inventory, and schedules." icon={ShieldCheck} color="bg-blue-600" />
            </div>
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="h-24 w-full max-w-md rounded-[2.5rem] bg-zinc-900 hover:bg-zinc-800 text-white border-none flex justify-center items-center gap-6 transition-transform hover:scale-105 shadow-2xl"
                onClick={() => { setLoading(true); setTimeout(() => router.push('/elderly'), 200); }}
              >
                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black leading-none uppercase">Senior Mode</p>
                  <p className="text-xs opacity-60 uppercase tracking-widest font-bold mt-2">Mobile-First Accessibility</p>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-500">
            <Button variant="ghost" className="mb-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setSelectedRole(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portals
            </Button>
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/95 p-4">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline font-bold capitalize">{selectedRole} Access</CardTitle>
                <CardDescription>Enter clinical credentials to continue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={(e: any) => {
                  e.preventDefault();
                  handleLogin(selectedRole, { email: e.target.email.value, password: e.target.password.value });
                }}>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground pl-1">Email / ID</Label>
                    <Input name="email" type="email" placeholder={selectedRole === 'patient' ? "yourname@gmail.com" : selectedRole === 'admin' ? "admin@mediflow.com" : selectedRole === 'doctor' ? "dr.smith.neuro@mediflow.com" : `pharmacist.john@mediflow.com`} required className="h-14 rounded-2xl border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground pl-1">Password</Label>
                    <div className="relative">
                      <Input name="password" type={showPassword ? "text" : "password"} required className="h-14 rounded-2xl border-2 pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-primary" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Enter ${selectedRole} Portal`}
                  </Button>
                </form>



                {selectedRole === 'doctor' && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-700 flex items-start gap-3">
                    <Stethoscope className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      <strong>Login Only:</strong> Doctor accounts are pre-registered by the hospital. No signup is available. Contact the Admin for credentials.
                    </p>
                  </div>
                )}

                {selectedRole === 'pharmacist' && (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 flex items-start gap-3">
                    <ClipboardList className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Login Only:</strong> Pharmacy accounts are created by the Admin. No signup is available.
                    </p>
                  </div>
                )}

                {selectedRole === 'patient' && (
                  <div className="mt-8 pt-8 border-t text-center">
                    <Link href="/register"><Button variant="outline" className="w-full h-14 rounded-2xl text-primary font-bold">Create Account</Button></Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <footer className="p-8 text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">
        Verified Medical Environment • ISO 27001 Secure
      </footer>
    </div>
  );
}
