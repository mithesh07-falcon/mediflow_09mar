
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
import { GlobalSync } from "@/lib/sync-service";
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
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [ageError, setAgeError] = useState("");

  // OTP for Elderly
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userOtp, setUserOtp] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const isElderly = parseInt(age) >= 60;

  // Feature 1 & 2 states
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("+91 ");
  const [guardianPhoneError, setGuardianPhoneError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const languages = [
    { name: "English", native: "English" },
    { name: "Hindi", native: "हिन्दी" },
    { name: "Tamil", native: "தமிழ்" },
    { name: "Telugu", native: "తెలుగు" },
    { name: "Kannada", native: "ಕನ್ನಡ" },
    { name: "Bengali", native: "বাংলা" },
    { name: "Marathi", native: "मराठी" },
  ];

  const checkEmailUnique = async (val: string) => {
    if (!val || !val.includes("@")) return;
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.exists) {
        setEmailError("This email is already registered. Please use a different email.");
      } else {
        setEmailError("");
      }
    } catch (e) {
      console.error("Email check failed", e);
    }
  };

  const handlePhoneInput = (val: string) => {
    // Keep prefix, allow only 10 digits
    if (!val.startsWith("+91")) {
      setPhone("+91 ");
      return;
    }
    let digits = val.slice(3).replace(/\D/g, "").slice(0, 10);
    setPhone("+91 " + digits);

    if (digits.length > 0 && !/^[6-9]/.test(digits)) {
      setPhoneError("Phone number must start with 6, 7, 8, or 9");
    } else if (digits.length > 0 && digits.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else {
      setPhoneError("");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailLower = email.toLowerCase();
    const phoneClean = phone.replace(/\s/g, '');

    // CONSTRAINT 12: Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailLower)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email format (e.g., example@gmail.com)." });
      setLoading(false);
      return;
    }

    // CONSTRAINT 11: Password strength
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 8 characters with one uppercase, one lowercase, one number, and one special character." });
      setLoading(false);
      return;
    }

    // CONSTRAINT 4: Age validation
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 100) {
      toast({ variant: "destructive", title: "Invalid Age", description: "Age must be between 0 and 100." });
      setLoading(false);
      return;
    }

    // CONSTRAINT 2: Phone check
    if (!phoneClean.startsWith("+91") || phoneClean.length !== 13 || !['6', '7', '8', '9'].includes(phoneClean[3])) {
      toast({
        variant: "destructive",
        title: "Invalid Phone Format",
        description: "Please enter exactly 10 digits starting with 6, 7, 8, or 9 after the +91 prefix.",
      });
      setLoading(false);
      return;
    }

    // --- GLOBAL DUPLICATE PROTECTION ---
    try {
      // 1. Pull latest cloud data to ensure we have accounts from other devices/sessions
      await GlobalSync.pullPatients();
      await GlobalSync.pullStaff();
      
      const localPool = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
      const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
      const isDuplicate = localPool.some((p: any) => p.email.toLowerCase() === emailLower) || localStaff.some((s: any) => s.email.toLowerCase() === emailLower);
      
      if (isDuplicate) {
        toast({ variant: "destructive", title: "Registration Blocked", description: "An account with this email address already exists in the MediFlow system. Try logging in instead." });
        setLoading(false);
        return;
      }
    } catch(e) {}

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
          guardianName,
          guardianPhone: guardianPhone.replace(/\s/g, ''),
          guardianRelationship,
          language: selectedLanguage
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
        guardianName,
        guardianPhone: guardianPhone.replace(/\s/g, ''),
        guardianRelationship,
        language: selectedLanguage
      });
      localStorage.setItem("mediflow_patients", JSON.stringify(saved));
      
      // --- GLOBAL CLOUD SYNC ---
      GlobalSync.pushPatients();

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
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                    </div>
                    {s < 3 && <div className={`h-1 w-12 rounded-full ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>
              <CardTitle className="text-2xl font-headline font-bold">
                {step === 1 ? "Personal Details" : step === 2 ? "Safety & Language" : "Secure Your Account"}
              </CardTitle>
              <CardDescription>
                {step === 1 ? "Provide your regional clinical identity." : step === 2 ? "Configure your guardian and language preference." : "Set up your secure access credentials."}
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
                          onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Last Name</Label>
                        <Input
                          placeholder="Johnson"
                          required
                          className="h-12 rounded-xl"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
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
                            className={`h-12 pl-10 rounded-xl font-bold ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            value={phone}
                            onChange={(e) => handlePhoneInput(e.target.value)}
                          />
                        </div>
                        {phoneError ? (
                          <p className="text-[10px] text-red-500 font-bold italic pl-1">{phoneError}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic pl-1">Format: +91 10-digits</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Age</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Age"
                            required
                            className={`h-12 pl-10 rounded-xl ${ageError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            value={age}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAge(val);
                              if (val !== '') {
                                const num = parseInt(val);
                                if (num < 0 || num > 100) {
                                  setAgeError("Age is not acceptable. Enter a valid age.");
                                } else {
                                  setAgeError("");
                                }
                              } else {
                                setAgeError("");
                              }
                            }}
                          />
                        </div>
                        {ageError && <p className="text-[10px] text-red-500 font-bold italic pl-1">{ageError}</p>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        // CONSTRAINT 8: Cannot proceed without filling data fields
                        const phoneClean = phone.replace(/\s/g, '');
                        if (!firstName.trim() || !lastName.trim() || phoneClean.length !== 13 || !age) {
                          toast({
                            variant: "destructive",
                            title: "Incomplete Fields",
                            description: "Please fill all the data fields (Name, Phone, Age) before moving to the next page.",
                          });
                          return;
                        }
                        if (phoneError || ageError) {
                          toast({
                            variant: "destructive",
                            title: "Invalid Input",
                            description: "Please enter a valid format for phone number and age.",
                          });
                          return;
                        }
                        // CONSTRAINT 12: Email format not relevant here yet, checked at step 3
                        if (isElderly) {
                          const code = Math.floor(100000 + Math.random() * 900000).toString();
                          setGeneratedOtp(code);
                          setShowOtpPopup(true);
                          setStep(1.5); // New step for OTP
                        } else {
                          setStep(2);
                        }
                      }}
                      className="w-full h-14 text-lg font-bold rounded-xl mt-4"
                    >
                      Next Step <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                ) : step === 1.5 ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center space-y-4">
                      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold">Elderly Verification</h2>
                      <p className="text-sm text-muted-foreground">We've sent a 6-digit verification code to your phone for extra safety.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <Input
                        type="text"
                        placeholder="ENTER 6-DIGIT CODE"
                        max={6}
                        className="h-16 text-center text-2xl font-black tracking-widest rounded-xl border-2 border-primary"
                        value={userOtp}
                        onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (userOtp === generatedOtp) {
                            setIsOtpVerified(true);
                            setStep(2);
                            toast({
                              title: "Identity Verified",
                              description: "Your safe registration continues.",
                            });
                          } else {
                            toast({
                              variant: "destructive",
                              title: "Invalid Code",
                              description: "The code you entered is incorrect.",
                            });
                          }
                        }}
                        className="h-14 flex-[2] text-lg font-bold rounded-xl"
                        disabled={userOtp.length !== 6}
                      >
                        Verify & Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : step === 2 ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <Label className="text-lg font-bold">Who is your Primary Guardian?</Label>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Guardian Full Name</Label>
                          <Input
                            placeholder="Ramesh Kumar"
                            required
                            className="h-12 rounded-xl"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Guardian Phone (SOS Emergency Contact)</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="tel"
                              placeholder="+91 00000 00000"
                              required
                              className={`h-12 pl-10 rounded-xl font-bold ${guardianPhoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                              value={guardianPhone}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val.startsWith("+91")) {
                                  setGuardianPhone("+91 ");
                                  return;
                                }
                                let digits = val.slice(3).replace(/\D/g, "").slice(0, 10);
                                setGuardianPhone("+91 " + digits);
                                
                                if (digits.length > 0 && !/^[6-9]/.test(digits)) {
                                  setGuardianPhoneError("Phone number must start with 6, 7, 8, or 9");
                                } else if (digits.length > 0 && digits.length !== 10) {
                                  setGuardianPhoneError("Phone number must be exactly 10 digits");
                                } else {
                                  setGuardianPhoneError("");
                                }
                              }}
                            />
                          </div>
                          {guardianPhoneError ? (
                            <p className="text-[10px] text-red-500 font-bold italic pl-1">{guardianPhoneError}</p>
                          ) : (
                            <p className="text-[10px] text-red-500 font-bold italic pl-1">CRITICAL: This number will be used for SOS emergency alerts.</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Relationship / Reason</Label>
                          <Input
                            placeholder="Son / Caretaker"
                            required
                            className="h-12 rounded-xl"
                            value={guardianRelationship}
                            onChange={(e) => setGuardianRelationship(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-bold">Select Regional Language</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {languages.map((lang) => (
                          <button
                            key={lang.name}
                            type="button"
                            onClick={() => setSelectedLanguage(lang.name)}
                            className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${selectedLanguage === lang.name ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-muted hover:border-primary/50'}`}
                          >
                            <span className="text-sm font-bold">{lang.name}</span>
                            <span className="text-xs opacity-50 font-sans">{lang.native}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button type="button" onClick={() => {
                        // CONSTRAINT 8: Cannot proceed without filling data fields
                        if (!guardianName.trim() || !guardianRelationship.trim() || guardianPhone.replace(/\s/g, '').length !== 13) {
                          toast({
                            variant: "destructive",
                            title: "Incomplete Fields",
                            description: "Please fill all guardian details (Name, Phone, Relationship) before moving to the next page.",
                          });
                          return;
                        }
                        if (guardianPhoneError) {
                          toast({
                            variant: "destructive",
                            title: "Invalid Guardian Phone",
                            description: "Please enter a valid phone number starting with 6, 7, 8, or 9.",
                          });
                          return;
                        }
                        setStep(3);
                      }} className="h-14 flex-[2] text-lg font-bold rounded-xl">
                        Next Step <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
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
                          className={`h-12 pl-10 rounded-xl ${email && emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            checkEmailUnique(e.target.value);
                          }}
                        />
                      </div>
                      {email && emailError && (
                        <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">
                          {emailError}
                        </p>
                      )}
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

                      {/* Password Constraints Checklist */}
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Security Requirements</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                            <span className={`text-[11px] font-bold ${password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>At least 8 characters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                            <span className={`text-[11px] font-bold ${/[0-9]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}`}>Contains a number</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                            <span className={`text-[11px] font-bold ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}`}>Upper & Lowercase</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                            <span className={`text-[11px] font-bold ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}`}>Special character (!@#$%^&*)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-14 flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="h-14 flex-[2] text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
                        disabled={loading || !!emailError || password.length < 8 || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password) || !/[A-Z]/.test(password) || !/[a-z]/.test(password)}
                      >
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

      {/* OTP Pop-up at Bottom Right */}
      {showOtpPopup && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-500">
          <Card className="w-80 border-2 border-primary shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="bg-primary p-3 flex justify-between items-center text-white">
              <span className="font-bold text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" /> New Message
              </span>
              <button onClick={() => setShowOtpPopup(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                <span className="text-xs uppercase font-bold">Dismiss</span>
              </button>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Your MediFlow Registration OTP is:</p>
              <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl text-center border-2 border-dashed border-primary/30">
                <span className="text-3xl font-black tracking-[0.5rem] text-primary">{generatedOtp}</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Use this code to verify your clinical identity. Valid for 10 minutes.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
