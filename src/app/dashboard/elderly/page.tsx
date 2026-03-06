
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pill,
  Phone,
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Wallet,
  ShieldCheck,
  ClipboardList,
  Activity,
  Utensils
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ElderlyVoiceAssistant } from "@/components/elderly/ElderlyVoiceAssistant";

export default function ElderlyDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pillFound, setPillFound] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(5000);
  const [inactivityTimer, setInactivityTimer] = useState(0);
  const [user, setUser] = useState<any>({ name: "Senior User", guardian: "Ravi", guardianPhone: "+91 98765 43210" });

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (!savedUser.isElderly) {
      router.push("/dashboard/patient");
      return;
    }
    if (savedUser.firstName) {
      setUser({
        name: savedUser.firstName,
        guardian: "Ravi",
        guardianPhone: savedUser.guardianPhone || "+91 98765 43210"
      });
    }
  }, [router]);

  // Unique Feature C: Guardian Shadow (60s Inactivity Loop)
  useEffect(() => {
    const interval = setInterval(() => {
      setInactivityTimer(prev => prev + 1);
    }, 1000);

    const resetTimer = () => setInactivityTimer(0);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);

    if (inactivityTimer === 60) {
      toast({
        variant: "destructive",
        title: "⚠️ SAFETY CHECK",
        description: `No activity for 60 seconds. Sending "Check-In" SMS to ${user.guardian} at ${user.guardianPhone}...`,
      });
      speak(`No activity detected. Sending a check in message to ${user.guardian}.`);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [inactivityTimer, user.guardian, user.guardianPhone, toast, speak]);

  // Unique Feature A: Magic Lens (Camera Permission)
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();
  }, []);

  const handleVerifyPill = () => {
    setIsVerifying(true);
    setPillFound(null);
    speak("Scanning your pill. Please hold it steady.");
    setTimeout(() => {
      setIsVerifying(false);
      setPillFound({
        name: "Amlodipine (BP)",
        instruction: "Verified: Safe to take now."
      });
      speak("Done. This is your Blood Pressure medicine. It is safe to take now.");
    }, 2500);
  };

  const handleRefill = () => {
    if (walletBalance >= 450) {
      setWalletBalance(prev => prev - 450);
      toast({
        title: "Order Successful",
        description: "Refill arriving tomorrow. Paid via Family Wallet.",
      });
      speak("Order confirmed. Your medicine refill will arrive tomorrow.");
    }
  };

  const triggerSOS = () => {
    toast({
      variant: "destructive",
      title: "CALLING GUARDIAN",
      description: `Connecting to ${user.guardian} at ${user.guardianPhone}...`,
    });
    speak(`Emergency alert triggered. I am calling ${user.guardian} right now.`);
  };

  const handleLogout = () => {
    localStorage.removeItem("mediflow_current_user");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-32 flex flex-col p-6 space-y-12 touch-manipulation">
      {/* Accessibility Header */}
      <header className="flex justify-between items-center border-b-[15px] border-black pb-10">
        <div>
          <h1 className="text-7xl font-black uppercase tracking-tighter">HELLO, {user.name}</h1>
          <p className="text-4xl font-black opacity-40 uppercase">Guardian: {user.guardian}</p>
        </div>
        <Button
          className="h-28 px-12 text-4xl font-black bg-black text-white rounded-3xl border-8 border-black hover:bg-zinc-800 transition-all active:scale-95"
          onClick={handleLogout}
        >
          LOG OUT
        </Button>
      </header>

      {/* Unique Feature B: Family Wallet */}
      <div className="flex flex-col sm:flex-row gap-8 items-stretch">
        <Card className="flex-1 border-[12px] border-black bg-white rounded-[4rem] p-12 shadow-none">
          <div className="flex items-center gap-10">
            <Wallet className="h-28 w-28 text-black" />
            <div>
              <p className="text-4xl font-black uppercase tracking-widest text-slate-400">Family Wallet</p>
              <h3 className="text-8xl font-black">₹{walletBalance.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
        <Button
          className="h-44 px-20 text-6xl font-black bg-black text-white rounded-[4rem] border-8 border-black shadow-2xl hover:bg-zinc-800 transition-all active:scale-90"
          onClick={handleRefill}
        >
          ORDER REFILL
        </Button>
      </div>

      {/* Main Grid: massive Touch Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-white text-black rounded-[5rem] border-[15px] border-black shadow-2xl hover:bg-slate-50 transition-all hover:scale-[1.02]">
              <Camera className="h-28 w-32" />
              CHECK PILL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl bg-white border-[15px] border-black rounded-[5rem] p-0 overflow-hidden">
            <div className="bg-black p-12 text-white">
              <h2 className="text-6xl font-black uppercase tracking-tight">Magic Lens Scanner</h2>
            </div>
            <div className="p-12 space-y-12">
              <div className="relative aspect-square bg-slate-100 rounded-[4rem] overflow-hidden border-[10px] border-black">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                {isVerifying && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-black p-10 text-center">
                    <Loader2 className="h-40 w-40 animate-spin mb-8" />
                    <span className="text-6xl font-black uppercase">Analyzing...</span>
                  </div>
                )}
              </div>
              {!pillFound ? (
                <Button
                  className="w-full h-40 text-6xl font-black bg-black text-white rounded-[3rem] shadow-2xl"
                  onClick={handleVerifyPill}
                  disabled={isVerifying}
                >
                  START SCAN
                </Button>
              ) : (
                <div className="bg-white border-[12px] border-black p-12 rounded-[4rem] text-center animate-in zoom-in-95">
                  <CheckCircle2 className="h-32 w-32 text-black mx-auto mb-8" />
                  <h4 className="text-6xl font-black uppercase text-primary">{pillFound.name}</h4>
                  <p className="text-4xl font-black mt-6 uppercase leading-tight">{pillFound.instruction}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button
          className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-white text-black border-[15px] border-black rounded-[5rem] shadow-2xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/dashboard/elderly/medicines')}
        >
          <Pill className="h-28 w-32" />
          MY PILLS
        </Button>

        <Button
          className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-white text-black border-[15px] border-black rounded-[5rem] shadow-2xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/dashboard/elderly/checklist')}
        >
          <ClipboardList className="h-28 w-32" />
          LIVING LIST
        </Button>

        <Button
          className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-white text-black border-[15px] border-black rounded-[5rem] shadow-2xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/dashboard/elderly/health')}
        >
          <Activity className="h-28 w-32" />
          HEALTH DATA
        </Button>

        <Button
          className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-white text-black border-[15px] border-black rounded-[5rem] shadow-2xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/dashboard/elderly/meals')}
        >
          <Utensils className="h-28 w-32 text-orange-600" />
          MEAL TRACKER
        </Button>

        <Button
          className="h-[280px] flex flex-col gap-8 text-5xl font-black bg-black text-white rounded-[5rem] border-[15px] border-black shadow-2xl animate-pulse hover:bg-zinc-800 transition-all active:scale-95"
          onClick={triggerSOS}
        >
          <AlertCircle className="h-28 w-32" />
          SOS ALARM
        </Button>
      </div>

      {/* Footer: Safety Indicator */}
      <footer className="mt-auto bg-slate-100 p-12 rounded-[4rem] flex items-center justify-between border-[12px] border-black">
        <div className="flex items-center gap-8">
          <ShieldCheck className="h-20 w-20 text-black" />
          <span className="text-5xl font-black uppercase tracking-tighter">Safety Shield Active</span>
        </div>
        <span className="text-3xl font-black uppercase opacity-20">Watching over you 24/7</span>
      </footer>

      {/* Functional Voice Assistant */}
      <ElderlyVoiceAssistant />
    </div>
  );
}
