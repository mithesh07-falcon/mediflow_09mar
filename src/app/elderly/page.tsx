
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Heart, Phone, Loader2, ArrowLeft, ShieldCheck, User, KeyRound, Languages, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

export default function SeniorCareLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Phone Numbers, 2: OTP
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianNumber, setGuardianNumber] = useState("");
  const [elderName, setElderName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [isGuardianVerified, setIsGuardianVerified] = useState(false);
  const [age, setAge] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [existingUserData, setExistingUserData] = useState<any>(null);


  const languages = [
    { name: "English", native: "English" },
    { name: "Hindi", native: "हिंदी" },
    { name: "Tamil", native: "தமிழ்" },
    { name: "Telugu", native: "తెలుగు" },
    { name: "Kannada", native: "ಕನ್ನಡ" },
    { name: "Bengali", native: "বাংলা" },
    { name: "Marathi", native: "मराठी" }
  ];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (user.isElderly) {
      router.push("/dashboard/elderly");
    }
  }, [router]);

  const verifyGuardian = async (email: string) => {
    if (!email || !email.includes("@")) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid guardian email address." });
      return;
    }

    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    try {
      // 1. Check Browser Cache First (Crucial for Vercel where server DB might be empty)
      const cachedPatients = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
      const localMatch = cachedPatients.find((p: any) => p.email.toLowerCase() === emailLower);

      if (localMatch) {
        setGuardianName(`${localMatch.firstName} ${localMatch.lastName || ""}`.trim());
        setGuardianNumber(localMatch.phone.replace("+91", ""));
        setIsGuardianVerified(true);
        toast({ title: "Guardian Linked", description: `Found ${localMatch.firstName} in your local clinical registry.` });
        setLoading(false);
        return;
      }

      // 2. Fallback to Server API for previously existing/seeded accounts
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-guardian", email: emailLower }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGuardianName(data.guardian.name);
        setGuardianNumber(data.guardian.phone.replace("+91", ""));
        setIsGuardianVerified(true);
        toast({ title: "Guardian Linked", description: `Found ${data.guardian.name}. Details auto-populated.` });
      } else {
        setIsGuardianVerified(false);
        setGuardianName("");
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.error || "Guardian profile not found. Please ensure they are registered as a patient."
        });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to the patient registry." });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneNumber.length !== 10) {
      toast({ variant: "destructive", title: "Invalid Phone", description: "Please enter exactly 10 digits." });
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
    const existingUser = allUsers.find((u: any) => u.phone && u.phone.replace(/\s/g, '').endsWith(phoneNumber));

    if (mode === "signup") {
      if (!age || !isGuardianVerified) {
        toast({
          variant: "destructive",
          title: "Action Required",
          description: !isGuardianVerified ? "You must verify a guardian's email to ensure clinical safety." : "Please provide your number and age."
        });
        return;
      }
      if (existingUser) {
        toast({ variant: "destructive", title: "Already Registered", description: "This phone number is already registered. Please switch to Sign In." });
        return;
      }
    } else {
      // mode === "signin"
      if (!existingUser || !existingUser.isElderly) {
        toast({ variant: "destructive", title: "Account Not Found", description: "This phone number is not registered. Please Register first." });
        return;
      }
      // Load user details for session construction during sign-in
      setExistingUserData(existingUser);
      setGuardianEmail(existingUser.guardianEmail || "");
      setGuardianName(existingUser.guardianName || "Guardian");
      setGuardianNumber(existingUser.guardianPhone || "");
      setAge(existingUser.age || "60");
      setSelectedLanguage(existingUser.language || "English");
    }


    setLoading(true);
    setTimeout(() => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setStep(2);
      setShowOtpPopup(true);
      setLoading(false);
      toast({
        title: "OTP SENT",
        description: `Check the popup monitor for your access code.`,
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
      const finalElderName = elderName.trim() || "Senior User";

      const senior = {
        role: 'patient',
        isElderly: true,
        phone: `+91 ${phoneNumber}`,
        guardianEmail,
        guardianName,
        guardianPhone: guardianNumber.startsWith("+") ? guardianNumber : `+91 ${guardianNumber}`,
        age: age,
        language: selectedLanguage,
        firstName: mode === "signup" ? finalElderName : (existingUserData?.firstName || "Senior User")
      };

      localStorage.setItem("mediflow_current_user", JSON.stringify(senior));

      // If registering anew, save them to the global patient pool
      if (mode === "signup") {
        const allUsers = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
        allUsers.push({
          email: `${phoneNumber}@elder.local`, // internal dummy mapping
          phone: `+91 ${phoneNumber}`,
          firstName: finalElderName,
          lastName: "",
          age: age,
          guardianName,
          guardianPhone: guardianNumber,
          guardianEmail,
          guardianRelationship: "Dependent",
          language: selectedLanguage,
          isElderly: true
        });
        localStorage.setItem("mediflow_patients", JSON.stringify(allUsers));
      }

      const saved = JSON.parse(localStorage.getItem("mediflow_family_members") || "[]");
      const savedName = mode === "signup" ? finalElderName : (existingUserData?.firstName || "Senior User");
      const updated = [{ id: "senior-self", name: savedName, relation: "Self", age: age, seed: "42" }, ...saved.filter((m: any) => m.relation !== 'Self')];

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
                {step === 1 ? (mode === "signin" ? "Senior Sign In" : "Senior Registration") : "Enter Code"}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-black opacity-60">
                {step === 1 ? (mode === "signin" ? "Welcome back. Enter your phone." : "Simple clinical sign-up") : "Check your messages for the OTP"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-10 pb-16">
              {step === 1 ? (
                <form className="space-y-8" onSubmit={handleSendOtp}>
                  <div className="flex bg-slate-100 p-2 rounded-2xl mb-8">
                    <Button
                      type="button"
                      variant={mode === "signin" ? "default" : "ghost"}
                      className={cn("flex-1 h-16 text-3xl font-black rounded-xl", mode === "signin" && "bg-black text-white shadow-md")}
                      onClick={() => setMode("signin")}
                    >
                      SIGN IN
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "signup" ? "default" : "ghost"}
                      className={cn("flex-1 h-16 text-3xl font-black rounded-xl", mode === "signup" && "bg-black text-white shadow-md")}
                      onClick={() => setMode("signup")}
                    >
                      REGISTER
                    </Button>
                  </div>

                  <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Only show language for signup */}
                    {mode === "signup" && (
                      <div className="space-y-4">
                        <Label className="text-2xl font-black flex items-center gap-3">
                          <Languages className="h-6 w-6 text-primary" /> SELECT YOUR LANGUAGE
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {languages.map((lang) => (
                            <Button
                              key={lang.name}
                              type="button"
                              variant={selectedLanguage === lang.name ? "default" : "outline"}
                              className={cn(
                                "h-20 text-2xl font-bold rounded-2xl border-4 transition-all",
                                selectedLanguage === lang.name
                                  ? "border-black shadow-lg scale-105"
                                  : "border-slate-200 opacity-60 hover:opacity-100"
                              )}
                              onClick={() => setSelectedLanguage(lang.name)}
                            >
                              <div className="flex flex-col">
                                <span>{lang.name}</span>
                                <span className="text-sm opacity-60">{lang.native}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-2xl font-black flex items-center gap-3">
                        <Phone className="h-6 w-6 text-primary" /> YOUR PHONE
                      </Label>
                      <div className="flex gap-4 items-center">
                        <span className="text-4xl font-black text-slate-400">+91</span>
                        <Input
                          className="h-24 text-5xl px-8 rounded-3xl border-4 border-black font-black"
                          placeholder="0000000000"
                          type="tel"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          required
                        />
                      </div>
                    </div>

                    {mode === "signup" && (
                      <>
                        <div className="space-y-3">
                          <Label className="text-2xl font-black flex items-center gap-3">
                            <User className="h-6 w-6 text-primary" /> YOUR NAME
                          </Label>
                          <Input
                            className="h-20 text-4xl px-8 rounded-3xl border-4 border-black font-bold"
                            placeholder="Full Name"
                            value={elderName}
                            onChange={e => setElderName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-2xl font-black flex items-center gap-3">
                            GUARDIAN EMAIL (REQUIRED)
                          </Label>
                          <div className="flex gap-4">
                            <Input
                              className="h-20 text-3xl px-8 rounded-3xl border-4 border-black font-bold flex-1"
                              placeholder="guardian@example.com"
                              type="email"
                              value={guardianEmail}
                              onChange={e => {
                                setGuardianEmail(e.target.value);
                                setIsGuardianVerified(false);
                              }}
                              required
                            />
                            <Button
                              type="button"
                              onClick={() => verifyGuardian(guardianEmail)}
                              className="h-20 px-8 rounded-3xl bg-black text-white hover:bg-zinc-800 font-bold"
                              disabled={loading || isGuardianVerified}
                            >
                              {isGuardianVerified ? "VERIFIED" : "LINK"}
                            </Button>
                          </div>
                        </div>

                        <div className={cn("space-y-6 transition-all", !isGuardianVerified ? "opacity-30 pointer-events-none" : "opacity-100")}>
                          <div className="space-y-3">
                            <Label className="text-2xl font-black">GUARDIAN NAME</Label>
                            <Input
                              className="h-20 text-3xl px-8 rounded-3xl border-4 border-black bg-slate-50 font-bold"
                              value={guardianName}
                              readOnly
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-2xl font-black">GUARDIAN CONTACT NO.</Label>
                            <div className="flex gap-4 items-center">
                              <span className="text-4xl font-black text-slate-400">+91</span>
                              <Input
                                className="h-20 text-4xl px-8 rounded-3xl border-4 border-black bg-slate-50 font-bold"
                                value={guardianNumber}
                                readOnly
                              />
                            </div>
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
                      </>
                    )}
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

      {/* OTP Pop-up at Bottom Right */}
      {showOtpPopup && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-500">
          <Card className="w-80 border-[6px] border-black shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden rounded-[2rem]">
            <div className="bg-black p-4 flex justify-between items-center text-white">
              <span className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                <Mail className="h-5 w-5 text-green-400" /> New Message
              </span>
              <button onClick={() => setShowOtpPopup(false)} className="hover:bg-white/20 px-3 py-1 bg-white/10 rounded-xl transition-colors">
                <span className="text-xs uppercase font-black">Dismiss</span>
              </button>
            </div>
            <CardContent className="p-6 space-y-4">
              <p className="text-lg font-black uppercase text-center border-b-2 border-slate-100 pb-2">Your Access Code:</p>
              <div className="bg-green-50 p-6 rounded-3xl text-center border-4 border-black">
                <span className="text-5xl font-black tracking-[0.5rem] text-black">{generatedOtp}</span>
              </div>
              <p className="text-xs text-center font-bold text-muted-foreground uppercase leading-tight">Type this 4-digit code into the main screen.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
