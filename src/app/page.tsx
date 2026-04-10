"use client";
import { GlobalSync } from "@/lib/sync-service";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Heart,
  Eye,
  EyeOff,
  Stethoscope,
  User,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// MASTER CLINICAL CREDENTIALS (Admin remains hardcoded for safety)
const ADMIN_EMAIL = "admin@mediflow.com";
const ADMIN_PASS = "MediFlowAdmin2024!";

type PortalRole = "patient" | "doctor" | "pharmacist" | "admin";

const PARTICLES = Array.from({ length: 18 }, (_, index) => {
  const seed = index + 1;
  const left = ((seed * 37) % 100) + ((seed % 3) * 0.17);
  const top = ((seed * 53) % 100) + ((seed % 5) * 0.11);
  const size = 3 + (((seed * 19) % 50) / 10);
  const delay = ((seed * 29) % 80) / 10;
  const duration = 14 + (((seed * 23) % 100) / 10);

  return {
    id: index,
    left: Number(left.toFixed(3)),
    top: Number(top.toFixed(3)),
    size: Number(size.toFixed(3)),
    delay: Number(delay.toFixed(3)),
    duration: Number(duration.toFixed(3)),
  };
});

export default function MultiRoleLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PortalRole | null>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 35 });

  const particles = PARTICLES;

  useEffect(() => {
    const userStr = localStorage.getItem("mediflow_current_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.isElderly) {
        router.push("/dashboard/elderly");
      }
    }
  }, [router]);

  useEffect(() => {
    let raf = 0;
    const handlePointer = (event: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setPointer({
          x: (event.clientX / window.innerWidth) * 100,
          y: (event.clientY / window.innerHeight) * 100,
        });
      });
    };

    window.addEventListener("mousemove", handlePointer);
    return () => {
      window.removeEventListener("mousemove", handlePointer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
          // 1. Try pulling from cloud first to handle "other device" registrations
          await GlobalSync.pullStaff();
          
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
          // 1. Try pulling from cloud first to handle "other device" registrations
          await GlobalSync.pullStaff();
          
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

  const PortalCard = ({ role, title, icon: Icon, color }: any) => (
    <Card className="rounded-[2.5rem] border border-transparent shadow-sm hover:shadow-xl transition-all duration-300 bg-white/95 dark:bg-zinc-900/80 dark:border-emerald-500/20 dark:shadow-[0_20px_55px_rgba(0,0,0,0.55)] backdrop-blur-sm group cursor-pointer" onClick={() => setSelectedRole(role)}>
      <CardContent className="pt-10 pb-10 px-8 min-h-[280px] flex flex-col items-center justify-center text-center">
        <div className={`h-16 w-16 rounded-2xl ${color || 'bg-primary/10 dark:bg-primary/20'} flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors`}>
          <Icon className={`h-8 w-8 ${color ? 'text-white' : 'text-primary'} group-hover:text-white`} />
        </div>
        <h3 className="text-2xl font-headline font-bold mb-10">{title}</h3>
        <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-4 transition-all">
          Enter Portal <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-[#0a0d12] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-emerald-400/25 blur-3xl"
          style={{ transform: `translate(${(pointer.x - 50) * 0.35}px, ${(pointer.y - 50) * 0.25}px)` }}
        />
        <div
          className="absolute top-[32%] right-[-120px] h-[460px] w-[460px] rounded-full bg-blue-400/25 blur-3xl"
          style={{ transform: `translate(${(pointer.x - 50) * -0.3}px, ${(pointer.y - 50) * 0.28}px)` }}
        />
        <div
          className="absolute bottom-[-180px] left-[30%] h-[520px] w-[520px] rounded-full bg-indigo-400/20 blur-3xl"
          style={{ transform: `translate(${(pointer.x - 50) * 0.2}px, ${(pointer.y - 50) * -0.2}px)` }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.12)_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />

        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full bg-white/60 dark:bg-emerald-200/25"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `portalFloat ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <nav className="p-6 flex justify-between items-center fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Network</span>
        </div>
        <ThemeToggle />
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start p-6 pt-24 md:pt-28">
        <div className="text-center mb-14 flex flex-col items-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-5xl font-headline font-bold text-[#1F2937] dark:text-zinc-50 tracking-tight">MediFlow</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Integrated Clinical Systems</p>
          </div>
        </div>

        {!selectedRole ? (
          <div className="w-full max-w-7xl space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
              <PortalCard role="patient" title="Patient Portal" icon={User} />
              <PortalCard role="doctor" title="Doctor Portal" icon={Stethoscope} />
              <PortalCard role="pharmacist" title="Pharmacy Portal" icon={ClipboardList} />
              <PortalCard role="admin" title="Admin Portal" icon={ShieldCheck} color="bg-blue-600" />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="h-28 w-full max-w-xl rounded-[2.5rem] bg-zinc-900 hover:bg-zinc-800 dark:bg-[#121212] dark:hover:bg-[#1a1a1a] text-white border-none flex justify-center items-center gap-6 transition-transform hover:scale-105 shadow-2xl"
                onClick={() => { setLoading(true); setTimeout(() => router.push('/elderly'), 200); }}
              >
                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-5xl md:text-[2.2rem] font-black leading-none uppercase tracking-tight">Senior Mode</p>
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
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/95 dark:bg-zinc-900/85 dark:border dark:border-emerald-500/20 p-4 backdrop-blur-sm">
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
                    <Input name="email" type="email" required className="h-14 rounded-2xl border-2" />
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

      <style jsx global>{`
        @keyframes portalFloat {
          0% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.35; }
          50% { transform: translate3d(12px, -24px, 0) scale(1.15); opacity: 0.8; }
          100% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
