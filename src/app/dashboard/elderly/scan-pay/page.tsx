"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, QrCode, ArrowLeft, Loader2, CheckCircle2, Wallet, ShieldCheck, AlertCircle, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ElderScanPayPage() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<"initial" | "scanning" | "confirm" | "success">("initial");
  const [shopName, setShopName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(5000);
  const [userLang, setUserLang] = useState("English");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    setUserLang(user.language || "English");
    
    const balance = localStorage.getItem("mediflow_family_wallet_balance") || "5000";
    setWalletBalance(parseInt(balance));
  }, []);

  const startCamera = async () => {
    setStep("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      // Simulate finding a QR code after 3 seconds
      setTimeout(() => {
        setShopName("City Pharmacy");
        setAmount(450);
        setStep("confirm");
        speakConfirmation("City Pharmacy", 450);
        if (stream) stream.getTracks().forEach(t => t.stop());
      }, 3000);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not open camera." });
      setStep("initial");
    }
  };

  const speakConfirmation = (name: string, amt: number) => {
    if (!window.speechSynthesis) return;
    const msgSnippet = userLang === "Hindi" 
        ? `${name} को ${amt} रुपये देने हैं?` 
        : `Pay ${amt} Rupees to ${name}?`;
    const utterance = new SpeechSynthesisUtterance(msgSnippet);
    utterance.lang = userLang === "Hindi" ? "hi-IN" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handlePay = () => {
    if (amount > 2000) {
        toast({ 
            title: "Security Check", 
            description: "Bill is over ₹2000. Verification sent to your family member's phone." 
        });
        // Logic for guardian approval would go here
        return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const newBalance = walletBalance - amount;
      setWalletBalance(newBalance);
      localStorage.setItem("mediflow_family_wallet_balance", newBalance.toString());
      
      // Notify guardian (simulate)
      localStorage.setItem("mediflow_last_transaction", JSON.stringify({
        shop: shopName,
        amount: amount,
        time: new Date().toISOString()
      }));

      setIsProcessing(false);
      setStep("success");
      
      // Play success sound (simulate with speech)
      if (window.speechSynthesis) {
          const successMsg = userLang === "Hindi" ? "भुगतान सफल रहा!" : "Payment Successful!";
          const u = new SpeechSynthesisUtterance(successMsg);
          u.lang = userLang === "Hindi" ? "hi-IN" : "en-US";
          window.speechSynthesis.speak(u);
      }
    }, 1500);
  };

  if (step === "success") {
    return (
        <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-12 text-center text-white animate-in fade-in duration-500">
            <div className="h-64 w-64 bg-white/20 rounded-full flex items-center justify-center mb-10 shadow-2xl animate-bounce">
                <CheckCircle2 className="h-40 w-40 text-white" />
            </div>
            <h1 className="text-9xl font-black uppercase mb-6 tracking-tighter">Paid!</h1>
            <p className="text-5xl font-bold opacity-80 uppercase leading-tight mb-16">
                ₹{amount} sent to {shopName}
            </p>
            <Button 
                className="h-32 px-20 text-5xl font-black bg-white text-green-600 rounded-[3rem] border-8 border-white hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
                onClick={() => router.push('/dashboard/elderly')}
            >
                DONE
            </Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col space-y-12 touch-manipulation">
      <header className="flex items-center justify-between border-b-8 border-black pb-8">
        <Button 
            className="h-28 px-12 text-4xl font-black bg-black text-white rounded-3xl border-8 border-black flex items-center gap-6"
            onClick={() => router.push('/dashboard/elderly')}
        >
          <ArrowLeft className="h-14 w-14" /> BACK
        </Button>
        <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-3xl border-4 border-black">
            <Wallet className="h-12 w-12 text-slate-400" />
            <span className="text-4xl font-black">₹{walletBalance.toLocaleString()}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        {step === "initial" && (
            <div className="text-center space-y-12">
                <div className="relative group mx-auto">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 scale-150 animate-pulse" />
                    <div className="relative h-72 w-72 bg-white rounded-full border-[15px] border-blue-600 flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 transition-transform" onClick={startCamera}>
                        <QrCode className="h-40 w-40 text-blue-600" />
                    </div>
                </div>
                <div>
                   <h1 className="text-8xl font-black uppercase tracking-tighter mb-4">Scan to Pay</h1>
                   <p className="text-4xl font-bold text-slate-400 uppercase">Point your camera at a QR code</p>
                </div>
                <Button 
                    className="w-full max-w-2xl h-44 text-7xl font-black bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] border-[15px] border-blue-800 shadow-2xl transition-all active:translate-y-4"
                    onClick={startCamera}
                >
                    START SCANNER
                </Button>
            </div>
        )}

        {step === "scanning" && (
            <div className="w-full max-w-4xl space-y-10">
                <div className="relative aspect-square bg-black rounded-[5rem] overflow-hidden border-[20px] border-black shadow-2xl ring-[20px] ring-blue-500/20">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-blue-500 animate-[scan_2s_infinite]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <p className="text-4xl font-black text-white uppercase tracking-widest bg-blue-600 px-8 py-3 rounded-2xl">Searching for QR...</p>
                    </div>
                </div>
                <Button 
                    variant="destructive" 
                    className="w-full h-32 text-5xl font-black rounded-[3rem] border-8 border-black" 
                    onClick={() => setStep("initial")}
                >
                    STOP CAMERA
                </Button>
            </div>
        )}

        {step === "confirm" && (
            <div className="w-full max-w-4xl bg-white border-[15px] border-black rounded-[5rem] p-12 shadow-2xl space-y-12 text-center animate-in zoom-in-95 duration-300">
                <div className="h-40 w-40 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-8 border-black shadow-lg">
                    <ShoppingCart className="h-20 w-20 text-slate-400" />
                </div>
                <div className="space-y-4">
                    <p className="text-4xl font-black text-slate-400 uppercase tracking-widest">Paying to:</p>
                    <h2 className="text-8xl font-black uppercase text-black italic underline decoration-blue-500 underline-offset-8 leading-none">
                        {shopName}
                    </h2>
                </div>

                <div className="p-10 bg-slate-50 border-8 border-dashed border-slate-200 rounded-[3rem]">
                   <p className="text-3xl font-black text-slate-400 uppercase mb-2">Total Bill:</p>
                   <h3 className="text-9xl font-black text-black">₹{amount}</h3>
                </div>

                <div className="space-y-6 pt-6">
                    <Button 
                        className="w-full h-48 text-7xl font-black bg-green-600 hover:bg-green-700 text-white rounded-[4rem] border-[15px] border-green-800 shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-8"
                        onClick={handlePay}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="h-24 w-24 animate-spin text-white" /> : <><ShieldCheck className="h-24 w-24" /> APPROVE</>}
                    </Button>
                    <Button 
                        variant="outline" 
                        className="w-full h-32 text-4xl font-black rounded-[3rem] border-8 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500 transition-all"
                        onClick={() => setStep("initial")}
                    >
                        CANCEL / NO
                    </Button>
                </div>

                {amount > 2000 && (
                    <div className="bg-yellow-100 border-4 border-yellow-400 p-6 rounded-3xl flex items-center gap-6">
                        <AlertCircle className="h-12 w-12 text-yellow-600 shrink-0" />
                        <p className="text-2xl font-bold text-yellow-800 text-left">Safety Rule: Large bills need family approval on their phone.</p>
                    </div>
                )}
            </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-150%); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(150%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
