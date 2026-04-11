
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
    Heart,
    Activity,
    Pill,
    Clock,
    ShieldCheck,
    Thermometer,
    Droplets,
    Camera,
    CheckCircle2,
    AlertTriangle,
    User,
    Utensils,
    Wallet,
    PlusCircle,
    BellRing
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { findLinkedElderlyForGuardian } from "@/lib/guardian-access";

export default function GuardianDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const [elderlyUser, setElderlyUser] = useState<any>(null);
    const [isLinkCheckComplete, setIsLinkCheckComplete] = useState(false);
    const [healthData, setHealthData] = useState({
        glucose: 142,
        bp: "138/88",
        weight: "68 kg",
        temp: "98.4 F"
    });

    const [adherence, setAdherence] = useState([
        { name: "Amlodipine", taken: true, total: 30, current: 13, time: "08:00 AM" },
        { name: "Metformin", taken: false, total: 15, current: 4, time: "01:00 PM" },
        { name: "Atorvastatin", taken: false, total: 60, current: 45, time: "08:00 PM" },
    ]);

    const [recentMeals, setRecentMeals] = useState([
        { name: "Breakfast", time: "09:30 AM", photo: "https://picsum.photos/seed/oats/400/300", dish: "Oats with Honey" },
        { name: "Lunch", time: "01:30 PM", photo: "https://picsum.photos/seed/dal/400/300", dish: "Dal Tadka & Rice" },
    ]);

    const [walletBalance, setWalletBalance] = useState(5000);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (!currentUser?.email) {
            router.replace("/login");
            return;
        }

        const allUsers = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
        const linkedElderly = findLinkedElderlyForGuardian(currentUser.email, allUsers);

        if (linkedElderly) {
            setElderlyUser(linkedElderly);
        } else {
            setElderlyUser(null);
            toast({
                variant: "destructive",
                title: "Guardian Access Not Active",
                description: "Guardian Monitoring appears after an elderly user links your patient email.",
            });
            router.replace("/dashboard/patient");
        }

        const savedBalance = localStorage.getItem("mediflow_family_wallet_balance");
        if (savedBalance) setWalletBalance(parseInt(savedBalance));

        const savedNotifications = JSON.parse(localStorage.getItem("mediflow_guardian_notifications") || "[]");
        setNotifications(savedNotifications);
        setIsLinkCheckComplete(true);
    }, [router, toast]);

    if (!isLinkCheckComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Checking guardian link...</div>
            </div>
        );
    }

    if (!elderlyUser) {
        return null;
    }

    return (
        <div className="flex min-h-screen">
            <SidebarNav role="patient" /> {/* Use patient sidebar but with guardian context */}

            <main className="flex-1 p-8 bg-slate-50">
                <header className="mb-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 font-bold">GUARDIAN PORTAL</Badge>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 font-bold flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> SECURE ACCESS
                            </Badge>
                        </div>
                        <h1 className="text-4xl font-headline font-bold text-primary">
                            Monitoring: {elderlyUser?.firstName || "Senior User"}
                        </h1>
                        <p className="text-muted-foreground">Real-time clinical visibility into daily adherence and health metrics.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Patient Health Score</p>
                            <p className="text-xl font-black text-green-600">Stable (92%)</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Adherence Trackers */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white pb-8">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-2xl flex items-center gap-2">
                                            <Pill className="h-6 w-6" /> Medication Adherence
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">Tracked vs Prescribed Dosage</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-white border-white/20">Syncing Live</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-8">
                                {adherence.map((med, i) => (
                                    <div key={i} className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${med.taken ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {med.taken ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-lg">{med.name} <span className="text-xs text-muted-foreground font-normal ml-2">Next at {med.time}</span></h4>
                                                <span className="text-sm font-black">{med.current} / {med.total} Days</span>
                                            </div>
                                            <Progress value={(med.current / med.total) * 100} className="h-3 rounded-full" />
                                        </div>
                                        <Badge variant={med.taken ? 'default' : 'secondary'} className="rounded-xl px-4 py-2">
                                            {med.taken ? "Taken" : "Scheduled"}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Heart className="h-5 w-5 text-red-500" /> Vital Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-red-50 rounded-3xl border border-red-100">
                                        <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Blood Pressure</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black">{healthData.bp}</span>
                                            <span className="text-[10px] font-bold opacity-40">mmHg</span>
                                        </div>
                                        <Badge className="bg-orange-500 mt-2 text-[8px]">Elevated</Badge>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-3xl border border-blue-100">
                                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Blood Sugar</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black">{healthData.glucose}</span>
                                            <span className="text-[10px] font-bold opacity-40">mg/dL</span>
                                        </div>
                                        <Badge className="bg-green-600 mt-2 text-[8px]">Healthy</Badge>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-3xl border">
                                        <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Body Temp</p>
                                        <span className="text-2xl font-black">{healthData.temp}</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-3xl border">
                                        <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Weight</p>
                                        <span className="text-2xl font-black">{healthData.weight}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Utensils className="h-5 w-5 text-orange-500" /> Recent Meals
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {recentMeals.map((meal, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                                                <div className="h-20 w-20 rounded-2xl overflow-hidden relative border shadow-sm shrink-0">
                                                    <img src={meal.photo} alt={meal.name} className="object-cover w-full h-full" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{meal.name}</p>
                                                    <p className="text-xs text-muted-foreground">{meal.dish}</p>
                                                    <p className="text-[10px] uppercase font-bold opacity-40 mt-1">{meal.time}</p>
                                                </div>
                                                <Badge variant="outline" className="ml-auto text-[8px] rounded-lg">Verified</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Interaction & Log */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-primary text-white p-2">
                            <CardContent className="pt-8 space-y-6">
                                <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="h-10 w-10 text-white animate-pulse" />
                                </div>
                                <div className="text-center px-4">
                                    <h3 className="text-2xl font-bold mb-2">Safety Status</h3>
                                    <p className="text-sm text-white/70 mb-6">No emergency triggers in the last 24 hours. Vital signs are within normal deviation range.</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/10 rounded-2xl p-3 text-center">
                                            <p className="text-[8px] uppercase font-bold text-white/50 mb-1">Last Sync</p>
                                            <p className="text-xs font-bold">2 mins ago</p>
                                        </div>
                                        <div className="bg-white/10 rounded-2xl p-3 text-center">
                                            <p className="text-[8px] uppercase font-bold text-white/50 mb-1">Check-ins</p>
                                            <p className="text-xs font-bold">04 Today</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {elderlyUser && (
                         <Card className="rounded-[2.5rem] border-none shadow-2xl bg-black text-white p-2">
                              <CardContent className="pt-8 space-y-6">
                                  <div className="flex items-center gap-4 px-4">
                                      <Wallet className="h-10 w-10 text-indigo-400" />
                                      <div>
                                          <p className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Elder's Family Wallet</p>
                                          <h3 className="text-4xl font-black italic tracking-tighter">₹{walletBalance.toLocaleString()}</h3>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => router.push('/dashboard/patient/wallet')}
                                      className="w-full h-16 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-tight"
                                  >
                                      <PlusCircle className="h-5 w-5" /> RECHARGE NOW
                                  </button>
                              </CardContent>
                         </Card>
                        )}

                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white">
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <BellRing className="h-4 w-4" /> Guardian Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-3">
                                {notifications.length === 0 ? (
                                    <p className="text-sm text-slate-500">No active alerts right now.</p>
                                ) : (
                                    notifications.slice(0, 4).map((item) => (
                                        <div key={item.id} className="p-3 rounded-xl border bg-slate-50">
                                            <p className="text-xs font-black uppercase">{String(item.type || "alert").replaceAll("_", " ")}</p>
                                            <p className="text-sm text-slate-600 mt-1">{item.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white">
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Recent Activity Log</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                    <div className="flex gap-4 relative">
                                        <div className="h-5 w-5 rounded-full bg-green-500 border-4 border-white shadow-sm z-10 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-tight">Medicine Taken</p>
                                            <p className="text-sm text-slate-600">Amlodipine (5mg) marked at 08:15 AM</p>
                                            <p className="text-[10px] text-muted-foreground">Sat, Mar 7 • 08:15 AM</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className="h-5 w-5 rounded-full bg-orange-500 border-4 border-white shadow-sm z-10 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-tight">Health Reading</p>
                                            <p className="text-sm text-slate-600">Blood Pressure: 138/88 (Slightly High)</p>
                                            <p className="text-[10px] text-muted-foreground">Sat, Mar 7 • 07:30 AM</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className="h-5 w-5 rounded-full bg-blue-500 border-4 border-white shadow-sm z-10 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-tight">Portal Activity</p>
                                            <p className="text-sm text-slate-600">Patient checked in to "Daily List"</p>
                                            <p className="text-[10px] text-muted-foreground">Sat, Mar 7 • 07:02 AM</p>
                                        </div>
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
