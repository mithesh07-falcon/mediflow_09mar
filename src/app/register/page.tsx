
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Phone, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, User } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91"); // Defaulting to Indian prefix
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailLower = email.toLowerCase();

    // 1. Regional Prefix Check (+91 for India) — client-side quick check
    if (!phone.startsWith("+91") || phone.replace(/\s/g, '').length < 13) {
      toast({
        variant: "destructive",
        title: "Invalid Region Format",
        description: "Patient phone numbers must follow the Indian clinical format starting with +91 followed by 10 digits.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          firstName,
          lastName,
          email: emailLower,
          phone: phone.replace(/\s/g, ''),
          age,
          password,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast({
          variant: "destructive",
          title: res.status === 409 ? "Already Registered" : "Registration Failed",
          description: result.error || "Could not create your account. Please try again.",
        });
        setLoading(false);
        return;
      }

      // Also sync to localStorage so other pages can read it
      const saved = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
      saved.push({
        email: emailLower,
        phone: phone.replace(/\s/g, ''),
        firstName,
        lastName,
        age,
        password,
      });
      localStorage.setItem("mediflow_patients", JSON.stringify(saved));

      setLoading(false);
      toast({
        title: "Clinical Account Created",
        description: `Welcome to MediFlow, ${firstName}. Your safety loop is now active.`,
      });

      // Clinical redirection delay
      setTimeout(() => router.push("/"), 200);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Server Error",
        description: "Could not reach the registration server. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950">
      <nav className="p-6 flex justify-between items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-lg border-b sticky top-0 z-50">
        <Logo />
        <ThemeToggle />
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 py-12">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-headline font-bold">Join the Network</h1>
            <p className="text-muted-foreground italic text-sm">Unified health management for you and your family.</p>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-4">
            <CardHeader className="space-y-1 pb-8">
              <div className="flex justify-between items-center mb-4">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                    </div>
                    {s === 1 && <div className={`h-1 w-20 rounded-full ${step > 1 ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>
              <CardTitle className="text-2xl font-headline font-bold">
                {step === 1 ? "Personal Details" : "Secure Your Account"}
              </CardTitle>
              <CardDescription>
                {step === 1 ? "Provide your regional clinical identity." : "Set up your secure access credentials."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-6">
                {step === 1 ? (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>First Name</Label>
                        <Input
                          placeholder="Sarah"
                          required
                          className="h-12 rounded-xl"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Last Name</Label>
                        <Input
                          placeholder="Johnson"
                          required
                          className="h-12 rounded-xl"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Primary Phone (India)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="+91 00000 00000"
                            required
                            className="h-12 pl-10 rounded-xl font-bold"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic pl-1">Format: +91 10-digits</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Age</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Age"
                            required
                            className="h-12 pl-10 rounded-xl"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="button" onClick={() => setStep(2)} className="w-full h-14 text-lg font-bold rounded-xl mt-4">
                      Next Step <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1.5">
                      <Label>Clinical Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="sarah@example.com"
                          required
                          className="h-12 pl-10 rounded-xl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Master Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          required
                          className="h-12 pl-10 pr-10 rounded-xl"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button type="submit" className="h-14 flex-[2] text-lg font-bold rounded-xl shadow-lg shadow-primary/20" disabled={loading}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Registration"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                Already have a clinical account?{" "}
                <Link href="/" className="text-primary font-bold hover:underline">
                  Sign in here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
