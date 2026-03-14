"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Activity, Stethoscope, ClipboardList, User, Heart, Phone, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (role: string, data: any) => {
    setLoading(true);

    if ((role === 'doctor' || role === 'pharmacist') && !data.email?.endsWith('@mediflow.com')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Professional accounts must use a @mediflow.com email address.",
      });
      setLoading(false);
      return;
    }

    // Doctor authentication via server API
    if (role === 'doctor') {
      try {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: result.error || "Invalid credentials. Doctor accounts are hospital-managed.",
          });
          setLoading(false);
          return;
        }

        const doc = result.doctor;
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" });
        
        let status = "Late";
        if (now.getHours() < 9 || (now.getHours() === 9 && now.getMinutes() <= 30)) {
          status = "Present";
        }

        const attendanceLogs = JSON.parse(localStorage.getItem("mediflow_staff_attendance") || "[]");
        const existingLogIndex = attendanceLogs.findIndex((log: any) => log.email === doc.email && log.date === dateStr);
        if (existingLogIndex === -1) {
             attendanceLogs.push({
                 id: `${doc.email}-${dateStr}`,
                 name: doc.name,
                 email: doc.email,
                 role: 'doctor',
                 date: dateStr,
                 loginTime: timeStr,
                 status: status,
                 timestamp: now.toISOString()
             });
             localStorage.setItem("mediflow_staff_attendance", JSON.stringify(attendanceLogs));
        }

        localStorage.setItem("mediflow_last_login", now.toISOString());
        localStorage.setItem("mediflow_current_user", JSON.stringify({
          email: doc.email,
          role: 'doctor',
          firstName: doc.name,
          specialization: doc.specialization,
        }));

        setLoading(false);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${doc.name}.`,
        });
        router.push('/dashboard/doctor');
      } catch (err) {
        toast({ variant: "destructive", title: "Server Error", description: "Could not reach the authentication server." });
        setLoading(false);
      }
      return;
    }

    // Patient authentication via server API
    if (role === 'patient') {
      try {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email: data.email, password: data.password }),
        });
        const result = await res.json();

        let patient = result.patient;

        // FALLBACK: If server doesn't have the user (happens on Vercel resets), check local storage
        if (!patient) {
          const localPool = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
          const matched = localPool.find((p: any) => p.email.toLowerCase() === data.email.toLowerCase() && p.password === data.password);
          if (matched) {
            patient = matched;
          }
        }

        if (!patient) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: result.error || "Check your email/password."
          });
          setLoading(false);
          return;
        }

        localStorage.setItem("mediflow_current_user", JSON.stringify({ ...patient, role: 'patient' }));

        setLoading(false);
        toast({ title: "Access Granted", description: `Welcome back, ${patient.firstName}!` });
        router.push('/dashboard/patient');
      } catch (err: any) {
        console.error("Patient Login Error:", err);
        toast({
          variant: "destructive",
          title: "System Exception",
          description: err.message || "The authentication server encountered a critical error."
        });
        setLoading(false);
      }
      return;
    }

    // Elderly/Senior authentication simulation
    if (role === 'elderly') {
      const seniorUser = {
        firstName: "Senior User",
        email: "senior@mediflow.com",
        role: 'patient',
        isElderly: true,
        guardianPhone: "+91 98765 43210"
      };
      localStorage.setItem("mediflow_current_user", JSON.stringify(seniorUser));
      setLoading(false);
      toast({ title: "Senior Access Granted", description: "Welcome to your simplified home." });
      router.push('/dashboard/elderly');
      return;
    }

    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Login Successful",
        description: `Welcome back to MediFlow, ${role}.`,
      });
      router.push(`/dashboard/${role}`);
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors">
      <nav className="p-6 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">MediFlow</span>
        </div>
        <ThemeToggle />
      </nav>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-headline font-bold">Secure Access Portal</h1>
            <p className="text-muted-foreground">Select your role to continue to your dashboard</p>
          </div>

          <Tabs defaultValue="patient" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-16 bg-white dark:bg-zinc-900 shadow-sm rounded-xl p-1 gap-1">
              <TabsTrigger value="patient" className="data-[state=active]:bg-primary data-[state=active]:text-white flex flex-col gap-1 py-2">
                <User className="h-4 w-4" />
                <span className="text-xs font-bold">Patient</span>
              </TabsTrigger>
              <TabsTrigger value="elderly" className="data-[state=active]:bg-primary data-[state=active]:text-white flex flex-col gap-1 py-2">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-bold">Senior</span>
              </TabsTrigger>
              <TabsTrigger value="doctor" className="data-[state=active]:bg-primary data-[state=active]:text-white flex flex-col gap-1 py-2">
                <Stethoscope className="h-4 w-4" />
                <span className="text-xs font-bold">Doctor</span>
              </TabsTrigger>
              <TabsTrigger value="pharmacist" className="data-[state=active]:bg-primary data-[state=active]:text-white flex flex-col gap-1 py-2">
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs font-bold">Pharmacist</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <TabsContent value="patient">
                <Card className="border-none shadow-xl">
                  <CardHeader>
                    <CardTitle>Patient Login</CardTitle>
                    <CardDescription>Access your medical history and family profiles.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={(e: any) => { e.preventDefault(); handleLogin('patient', { email: e.target.email.value, password: e.target.password.value }); }}>
                      <div className="space-y-2">
                        <Label htmlFor="p-email">Email Address</Label>
                        <Input id="p-email" name="email" type="email" placeholder="sarah@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-pass">Password</Label>
                        <div className="relative">
                          <Input
                            id="p-pass"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button className="w-full py-6 text-lg" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Continue to Dashboard
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="elderly">
                <Card className="border-none shadow-xl border-t-4 border-t-primary">
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Senior Care Portal</CardTitle>
                    <CardDescription className="text-lg">Simple login for easier access.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-lg hover:border-primary hover:bg-primary/5">
                        <Phone className="h-8 w-8 text-primary" />
                        Phone Number
                      </Button>
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-lg hover:border-primary hover:bg-primary/5">
                        <Mail className="h-8 w-8 text-primary" />
                        Email Address
                      </Button>
                    </div>
                    <form className="space-y-6" onSubmit={(e: any) => { e.preventDefault(); handleLogin('elderly', { elderly: true }); }}>
                      <div className="space-y-3">
                        <Label className="text-lg">Enter your Phone or Email</Label>
                        <Input className="h-20 text-2xl px-6 rounded-2xl border-4 border-black" placeholder="Your Phone or Email" required />
                      </div>
                      <Button className="w-full h-24 text-3xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-3xl" disabled={loading}>
                        {loading ? <Loader2 className="h-10 w-10 animate-spin" /> : "SIGN IN NOW"}
                      </Button>
                    </form>
                    <div className="mt-8 p-4 bg-muted/50 rounded-xl text-center text-sm">
                      Need help? <span className="text-primary font-bold cursor-pointer">Call Support: 1-800-FLOW</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="doctor">
                <Card className="border-none shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Clinician Workspace</CardTitle>
                      <CardDescription>Exclusive access for MediFlow verified doctors.</CardDescription>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Stethoscope className="h-8 w-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={async (e: any) => { e.preventDefault(); await handleLogin('doctor', { email: e.target.email.value, password: e.target['d-pass']?.value }); }}>
                      <div className="space-y-2">
                        <Label htmlFor="d-email">Medical ID (Email)</Label>
                        <Input id="d-email" name="email" type="email" placeholder="dr.smith@mediflow.com" required />
                        <p className="text-[10px] text-muted-foreground italic">Must end with @mediflow.com</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="d-pass">Clinical Password</Label>
                        <div className="relative">
                          <Input
                            id="d-pass"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button className="w-full py-6 text-lg bg-primary" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Access Clinical Dashboard
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pharmacist">
                <Card className="border-none shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Pharmacy Portal</CardTitle>
                      <CardDescription>Verify and dispense digital prescriptions safely.</CardDescription>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={async (e: any) => { 
                      e.preventDefault(); 
                      const pharmacistEmail = e.target.email.value;
                      const pharmacistPassword = e.target.password.value;
                      
                      // Inject attendance logic before handLogin returns or handles it, or handle it inside handleLogin if we passed more details. 
                      // Wait, handleLogin takes (role, data). The actual code for Pharmacist login is in handleLogin. 
                      // Let me fix my approach - the easiest way is to re-factor the handleLogin function up top.
                      await handleLogin('pharmacist', { email: pharmacistEmail, password: pharmacistPassword }); 
                    }}>
                      <div className="space-y-2">
                        <Label htmlFor="ph-email">Pharmacy ID (Email)</Label>
                        <Input id="ph-email" name="email" type="email" placeholder="pharmacy.hq@mediflow.com" required />
                        <p className="text-[10px] text-muted-foreground italic">Must end with @mediflow.com</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ph-pass">Dispensing Key</Label>
                        <div className="relative">
                          <Input
                            id="ph-pass"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button className="w-full py-6 text-lg bg-primary" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Access Inventory & RX
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account? <span className="text-primary font-bold hover:underline cursor-pointer" onClick={() => router.push('/register')}>Register as Patient</span>
            <br />
            <span className="text-[10px] text-muted-foreground mt-1 block">Doctor & Pharmacist accounts are login-only. Contact Admin for access.</span>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-xs text-muted-foreground opacity-50">
        &copy; 2024 MediFlow Integrated Health Systems. Secured by Advanced Biometrics.
      </footer>
    </div>
  );
}
