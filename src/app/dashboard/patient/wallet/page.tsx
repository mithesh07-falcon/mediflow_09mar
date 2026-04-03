"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, Heart, User, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function FamilyWalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [balance, setBalance] = useState(5000); // Default shared balance
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    setUser(savedUser);
    
    // SECURITY CHECK: Redirect if not a guardian
    const savedMembers = JSON.parse(localStorage.getItem("mediflow_family_members") || "[]");
    const currentEmail = savedUser.email || "default";
    const userMembers = savedMembers.filter((m: any) => m.userId === currentEmail);
    const hasElderly = userMembers.some((m: any) => 
      (m.relation === "Grandpa" || m.relation === "Grandma" || m.relation === "Father" || m.relation === "Mother" || m.relation === "Elderly" || (m.age && parseInt(m.age) >= 60))
    );

    if (!hasElderly) {
      router.push("/dashboard/patient");
      return;
    }
    
    // Simulate fetching actual shared wallet balance
    const savedBalance = localStorage.getItem("mediflow_family_wallet_balance");
    if (savedBalance) setBalance(parseInt(savedBalance));
  }, [router]);

  const handleAddMoney = () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
      return;
    }

    setIsProcessing(true);
    // Simulate payment gateway delay
    setTimeout(() => {
      const newBalance = balance + numAmount;
      setBalance(newBalance);
      localStorage.setItem("mediflow_family_wallet_balance", newBalance.toString());
      
      // Update the sync-service if needed, but for now we use localStorage as source of truth
      toast({
        title: "Recharge Successful! 🎉",
        description: `₹${numAmount} added to the Elder's Family Wallet. Their medicine and bills will be auto-paid.`,
      });
      setAmount("");
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav role="patient" />
      
      <main className="flex-1 p-8 md:p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">Elderly Care Wallet</h1>
          <p className="text-xl text-slate-500 font-medium">Manage the shared funds for your elderly family members.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Wallet Card */}
          <div className="lg:col-span-12">
            <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-900 to-black text-white p-2">
                <CardContent className="p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Wallet className="h-64 w-64 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 space-y-12">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <Heart className="h-8 w-8 text-red-400" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-widest text-indigo-200">Shared Family Wallet</h2>
                        </div>

                        <div>
                            <p className="text-xl font-bold text-white/50 uppercase tracking-widest mb-2">Available Balance</p>
                            <h3 className="text-9xl font-black tracking-tighter">₹{balance.toLocaleString()}</h3>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="px-6 py-3 bg-white/10 rounded-full border border-white/10 flex items-center gap-3">
                                <Check className="h-5 w-5 text-green-400" />
                                <span className="text-lg font-bold uppercase tracking-tight">Medicine Auto-Pay Enabled</span>
                            </div>
                            <div className="px-6 py-3 bg-white/10 rounded-full border border-white/10 flex items-center gap-3">
                                <Check className="h-5 w-5 text-green-400" />
                                <span className="text-lg font-bold uppercase tracking-tight">Doctor Fee Enabled</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Add Money Input Section */}
          <div className="lg:col-span-7">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white p-2 h-full">
                <CardHeader className="p-10 pb-0">
                    <CardTitle className="text-3xl font-black uppercase text-slate-800 flex items-center gap-3">
                        <Plus className="h-8 w-8 text-primary" /> Recharge Wallet
                    </CardTitle>
                    <CardDescription className="text-lg font-medium text-slate-500">
                        Funds added here will be immediately available for the Elder Patient Portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-4">
                        <label className="text-sm font-black uppercase tracking-widest text-slate-400">Enter Amount (₹)</label>
                        <Input 
                            type="number" 
                            placeholder="e.g. 2000"
                            className="h-24 text-5xl font-black rounded-3xl border-slate-200 focus:border-primary px-8"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {[500, 1000, 2000, 5000].map((val) => (
                            <Button 
                                key={val}
                                variant="outline"
                                className="h-16 rounded-2xl text-xl font-bold border-2 hover:bg-slate-50 transition-all hover:border-black"
                                onClick={() => setAmount(val.toString())}
                            >
                                +₹{val}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-black uppercase tracking-widest text-slate-400">Select Payment Method</label>
                        <div className="grid grid-cols-3 gap-4">
                            {['UPI', 'Card', 'Banking'].map((method) => (
                                <Button
                                    key={method}
                                    variant={paymentMethod === method ? "default" : "outline"}
                                    className={cn(
                                        "h-16 rounded-2xl text-lg font-black border-2 transition-all",
                                        paymentMethod === method ? "bg-black text-white border-black" : "border-slate-200"
                                    )}
                                    onClick={() => setPaymentMethod(method)}
                                >
                                    {method}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Button 
                        className="w-full h-24 text-3xl font-black rounded-[2rem] shadow-xl shadow-primary/20 flex items-center justify-center gap-4 transition-all active:scale-95 bg-primary hover:bg-primary/90"
                        onClick={handleAddMoney}
                        disabled={isProcessing || !amount || !paymentMethod}
                    >
                        {isProcessing ? <Loader2 className="h-10 w-10 animate-spin" /> : <><Wallet className="h-8 w-8" /> RECHARGE NOW</>}
                    </Button>
                </CardContent>
            </Card>
        </div>

          {/* Security & Info */}
          <div className="lg:col-span-5">
            <Card className="rounded-[3rem] border-none shadow-xl bg-primary text-white p-2 h-full">
                <CardHeader className="p-10 pb-4">
                    <CardTitle className="text-3xl font-black uppercase flex items-center gap-3">
                        <Sparkles className="h-8 w-8" /> Why use Wallet?
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    <div className="flex gap-6">
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase">Elderly Independence</h4>
                            <p className="text-indigo-100 font-medium opacity-80 leading-snug">Seniors can order medicines and book appointments without needing to handle complex UPI or Cards.</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase">Low Balance Alerts</h4>
                            <p className="text-indigo-100 font-medium opacity-80 leading-snug">You will be notified when the wallet falls below ₹500 to ensure their care never stops.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
