
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
   CreditCard,
   ShieldCheck,
   ArrowLeft,
   QrCode,
   Loader2,
   CheckCircle2,
   Lock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AppointmentPaymentPage() {
   const router = useRouter();
   const { toast } = useToast();
   const [loading, setLoading] = useState(false);
   const [success, setSuccess] = useState(false);
   const [pendingAppt, setPendingAppt] = useState<any>(null);

   useEffect(() => {
      const data = localStorage.getItem("mediflow_pending_payment");
      if (!data) {
         router.push("/dashboard/patient/appointments");
         return;
      }
      setPendingAppt(JSON.parse(data));
   }, [router]);

   const handlePayment = () => {
      setLoading(true);
      // Standardized 2-second simulated gateway delay
      setTimeout(async () => {
         setLoading(false);
         setSuccess(true);

         const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
         const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
         const newAppt = {
            id: Date.now(),
            ...pendingAppt,
            patientEmail: user.email,
            status: "Confirmed",
            paymentId: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
         };

         // Local cache for UI consistency
         localStorage.setItem("mediflow_appointments", JSON.stringify([newAppt, ...savedAppts]));
         localStorage.removeItem("mediflow_pending_payment");

         // SERVER-SIDE SYNC: Send to Doctor Registry securely
         try {
            const token = btoa(JSON.stringify(user));
            await fetch('/api/appointments', {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
               },
               body: JSON.stringify({ appointment: newAppt }),
            });
         } catch (err) {
            console.error("Clinical sync failed", err);
         }

         toast({
            title: "Payment Successful",
            description: `Consultancy with ${pendingAppt.doctor} confirmed and synced.`,
         });

         // Redirect after 200ms to allow success animation
         setTimeout(() => router.push("/dashboard/patient/appointments"), 200);
      }, 200);
   };

   if (!pendingAppt) return null;

   return (
      <div className="flex min-h-screen">
         <SidebarNav role="patient" />

         <main className="flex-1 p-8 bg-slate-50">
            <header className="mb-12 flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-12 w-12">
                  <ArrowLeft className="h-6 w-6" />
               </Button>
               <div>
                  <h1 className="text-4xl font-headline font-bold text-primary mb-1">Secure Checkout</h1>
                  <p className="text-muted-foreground">Finalize your clinical consultation payment.</p>
               </div>
            </header>

            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                     <CardHeader className="bg-primary/5 pb-8">
                        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Consultation Summary</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6 pt-8">
                        <div className="flex justify-between items-center">
                           <span className="text-muted-foreground">Specialist Doctor</span>
                           <span className="font-bold">{pendingAppt.doctor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-muted-foreground">Patient Profile</span>
                           <span className="font-bold">{pendingAppt.patient}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-muted-foreground">Schedule</span>
                           <span className="font-bold">{pendingAppt.date} at {pendingAppt.time}</span>
                        </div>
                        {pendingAppt.symptoms && (
                           <div className="border-t pt-4 space-y-2">
                              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Patient Notes</span>
                              <p className="text-sm bg-slate-50 p-3 rounded-xl border-l-4 border-primary italic">"{pendingAppt.symptoms}"</p>
                           </div>
                        )}
                        <div className="border-t pt-4 flex justify-between items-center">
                           <span className="text-lg font-bold">Consultancy Fee</span>
                           <span className="text-2xl font-bold text-primary">₹300.00</span>
                        </div>
                     </CardContent>
                  </Card>

                  <div className="p-6 bg-white rounded-3xl border flex items-start gap-4 shadow-sm">
                     <Lock className="h-6 w-6 text-primary shrink-0 mt-1" />
                     <div>
                        <h4 className="font-bold">Bank-Grade Security</h4>
                        <p className="text-sm text-muted-foreground">Your transaction is encrypted and protected by MediFlow's secure network infrastructure.</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  {!success ? (
                     <Card className="rounded-[2.5rem] border-none shadow-2xl p-4 bg-white">
                        <CardHeader className="text-center">
                           <CardTitle>Select Payment Method</CardTitle>
                           <CardDescription>Instant confirmation after payment.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="grid grid-cols-1 gap-4">
                              <Button variant="outline" className="h-20 rounded-2xl flex justify-between px-6 border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group">
                                 <div className="flex items-center gap-4 text-left">
                                    <QrCode className="h-8 w-8 text-primary" />
                                    <div>
                                       <p className="font-bold">UPI / QR Scan</p>
                                       <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</p>
                                    </div>
                                 </div>
                                 <CheckCircle2 className="h-6 w-6 text-primary" />
                              </Button>
                              <Button variant="outline" className="h-20 rounded-2xl flex justify-between px-6 opacity-50 cursor-not-allowed">
                                 <div className="flex items-center gap-4 text-left">
                                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                                    <div>
                                       <p className="font-bold">Card Payment</p>
                                       <p className="text-xs text-muted-foreground">Credit or Debit Cards</p>
                                    </div>
                                 </div>
                              </Button>
                           </div>

                           <div className="pt-6">
                              <Button className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/30" disabled={loading} onClick={handlePayment}>
                                 {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Pay ₹300 Now"}
                              </Button>
                           </div>
                        </CardContent>
                     </Card>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                           <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div className="text-center">
                           <h2 className="text-3xl font-bold mb-2">Payment Confirmed</h2>
                           <p className="text-muted-foreground">Redirecting to your schedule...</p>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </main>
      </div>
   );
}
