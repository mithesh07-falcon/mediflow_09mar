
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Heart, Phone, Loader2, ArrowLeft, ShieldCheck, User, KeyRound } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/Logo";

export default function SeniorCareLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Phone Numbers, 2: OTP
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guardianNumber, setGuardianNumber] = useState("");
  const [age, setAge] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (user.isElderly) {
      router.push("/dashboard/elderly");
    }
  }, [router]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !age) {
      toast({ variant: "destructive", title: "Info Missing", description: "Please provide your number and age." });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setStep(2);
      setLoading(false);
      toast({
        title: "OTP SENT",
        description: `Your 4-digit clinical access code is: ${code}`,
        duration: 8000,
      });
    }, 200);
  };

  const handleVerifyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      toast({ variant: "destructive", title: "Invalid Code", description: "The OTP entered does not match our records." });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const senior = {
        role: 'patient',
        isElderly: true,
        phone: `+91 ${phoneNumber}`,
        guardianPhone: `+91 ${guardianNumber}`,
        age: age,
        firstName: "Senior User"
      };
      localStorage.setItem("mediflow_current_user", JSON.stringify(senior));

      const saved = JSON.parse(localStorage.getItem("mediflow_family_members") || "[]");
      const updated = [{ id: "senior-self", name: "Senior User", relation: "Self", age: age, seed: "42" }, ...saved.filter((m: any) => m.relation !== 'Self')];
      localStorage.setItem("mediflow_family_members", JSON.stringify(updated));

      setLoading(false);
      toast({ title: "Welcome Home", description: "Your safety loop is now active." });
      router.push("/dashboard/elderly");
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 font-sans">
      <nav className="p-6 flex justify-between items-center bg-white/80 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/')} className="rounded-full h-12 w-12"><ArrowLeft className="h-6 w-6" /></Button>
          <Logo />
        </div>
        <ThemeToggle />
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 bg-slate-50/50">
        <div className="w-full max-w-2xl">
          <Card className="border-[8px] border-black shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="text-center pb-8 pt-12 px-6">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                {step === 1 ? <Heart className="h-12 w-12 text-primary" /> : <KeyRound className="h-12 w-12 text-primary" />}
              </div>
              <CardTitle className="text-5xl font-black uppercase tracking-tight">
                {step === 1 ? "Senior Access" : "Enter Code"}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-black opacity-60">
                {step === 1 ? "Simple clinical sign-in" : "Check your messages for the OTP"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-10 pb-16">
              {step === 1 ? (
                <form className="space-y-8" onSubmit={handleSendOtp}>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-2xl font-black flex items-center gap-3">
                        <Phone className="h-6 w-6 text-primary" /> YOUR PHONE
                      </Label>
                      <div className="flex gap-4 items-center">
                        <span className="text-4xl font-black text-slate-400">+91</span>
                        <Input
                          className="h-24 text-5xl px-8 rounded-3xl border-4 border-black font-black"
                          placeholder="00000 00000"
                          type="tel"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-2xl font-black">GUARDIAN PHONE</Label>
                      <div className="flex gap-4 items-center">
                        <span className="text-4xl font-black text-slate-400">+91</span>
                        <Input
                          className="h-20 text-4xl px-8 rounded-3xl border-4 border-black font-bold"
                          placeholder="Contact"
                          type="tel"
                          value={guardianNumber}
                          onChange={e => setGuardianNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-2xl font-black flex items-center gap-3">
                        <User className="h-6 w-6 text-primary" /> YOUR AGE
                      </Label>
                      <Input
                        className="h-20 text-4xl px-8 rounded-3xl border-4 border-black font-bold"
                        placeholder="Age"
                        type="number"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button className="w-full h-28 text-4xl font-black rounded-[2.5rem] bg-primary text-white shadow-2xl border-b-8 border-black hover:translate-y-1 transition-transform" disabled={loading}>
                    {loading ? <Loader2 className="h-12 w-12 animate-spin" /> : "SEND OTP"}
                  </Button>
                </form>
              ) : (
                <form className="space-y-10" onSubmit={handleVerifyLogin}>
                  <div className="space-y-4 text-center">
                    <Label className="text-3xl font-black uppercase">Enter 4-Digit Code</Label>
                    <Input
                      className="h-32 text-7xl text-center tracking-[1rem] rounded-3xl border-8 border-black font-black"
                      placeholder="0000"
                      maxLength={4}
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <Button type="button" variant="outline" className="h-24 text-2xl font-black border-4 border-black rounded-3xl" onClick={() => setStep(1)}>
                      BACK
                    </Button>
                    <Button className="h-24 text-3xl font-black rounded-3xl bg-green-600 text-white border-b-8 border-green-900" disabled={loading}>
                      {loading ? <Loader2 className="h-10 w-10 animate-spin" /> : "VERIFY"}
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-12 p-8 bg-slate-50 rounded-[2.5rem] flex items-start gap-6 border-4 border-dashed border-slate-200">
                <ShieldCheck className="h-12 w-12 text-primary shrink-0" />
                <p className="text-xl font-bold text-slate-600 leading-relaxed">
                  Total Safety: Your health alerts are automatically shared with your designated guardian. No password needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
