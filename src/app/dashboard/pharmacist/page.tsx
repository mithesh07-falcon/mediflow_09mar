
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Search,
  Package,
  CheckCircle2,
  QrCode,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  MessageSquareWarning,
  Send,
  FileText,
  TrendingDown,
  ShoppingBag,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_MEDICINES } from "./mockData";
import { useRoleGuard } from "@/hooks/use-role-guard";

export default function PharmacistDashboard() {
  const { toast } = useToast();
  // CONSTRAINT 10: Only pharmacists can access this portal
  useRoleGuard("pharmacist");
  const [rxId, setRxId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [dispensedIds, setDispensedIds] = useState<string[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [showBill, setShowBill] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{status: string, loginTime: string, screenTimeStr: string} | null>(null);

  // Complaint State
  const [complaintMed, setComplaintMed] = useState("");
  const [complaintUrgency, setComplaintUrgency] = useState("Medium");
  const [complaintNote, setComplaintNote] = useState("");
  const [isComplaining, setIsComplaining] = useState(false);

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const res = await fetch('/api/medicines');
        const data = await res.json();
        setInventory(data.medicines || []);
      } catch (e) {
        console.error("Failed to fetch medicines", e);
      }
    };
    
    // Attendance Tracking
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    const updateAttendance = () => {
      const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const logs = JSON.parse(localStorage.getItem("mediflow_staff_attendance") || "[]");
      const myLog = logs.find((l: any) => l.email === user.email && l.date === todayStr);
      const lastLogin = localStorage.getItem("mediflow_last_login");

      let screenTimeStr = "0h 0m";
      if (lastLogin) {
         const diff = new Date().getTime() - new Date(lastLogin).getTime();
         const hrs = Math.floor(diff / (1000 * 60 * 60));
         const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         screenTimeStr = `${hrs}h ${mins}m`;
      }

      if (myLog) {
         setAttendance({
           status: myLog.status,
           loginTime: myLog.loginTime,
           screenTimeStr
         });
      }
    };

    fetchMeds();
    fetchQueue();
    updateAttendance();

    const intervalSettings = setInterval(() => {
      fetchMeds();
      fetchQueue();
      updateAttendance();
    }, 5000);
    return () => clearInterval(intervalSettings);
  }, []);

  const fetchQueue = () => {
    const allRx = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");
    const dispensedHistory = JSON.parse(localStorage.getItem("mediflow_dispensing_history") || "[]");
    const dispensedIdsList = dispensedHistory.map((h: any) => h.rxId);
    setDispensedIds(dispensedIdsList);
    const pending = allRx.filter((r: any) => r.sentToPharmacy && !dispensedIdsList.includes(r.id));
    setPendingQueue(pending);
  };

  const handleFetch = (idToFetch?: string) => {
    const targetId = idToFetch || rxId;
    if (!targetId) return;
    setFetching(true);
    setActiveOrder(null);
    setTimeout(() => {
      const allRx = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");
      const found = allRx.find((r: any) => r.id === targetId);
      if (found) {
        setActiveOrder(found);
        toast({ title: "Prescription Found", description: `Reviewing records for ${found.patientName}.` });
      } else {
        toast({ variant: "destructive", title: "Record Not Found", description: "The provided RX ID is invalid." });
      }
      setFetching(false);
    }, 1000);
  };

  const handleDispense = async () => {
    if (!activeOrder) return;

    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    // Ensure we have latest prices from inventory
    const currentInventory = inventory;

    let totalBillAmount = 0;
    const itemizedBill: any[] = [];

    const updatedInventory = currentInventory.map((item: any) => {
      const prescribedMatch = activeOrder.medications.find((m: any) =>
        m.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(m.name.toLowerCase())
      );

      if (prescribedMatch) {
        const qtyToDispense = 10; // Simulation
        const currentPrice = item.price; // Fetched from API
        itemizedBill.push({
          name: item.name,
          qty: qtyToDispense,
          unitPrice: currentPrice,
          total: currentPrice * qtyToDispense
        });
        totalBillAmount += (currentPrice * qtyToDispense);

        // Update stock via API
        fetch('/api/medicines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateStock', id: item.id, stock: Math.max(0, item.stock - qtyToDispense) })
        });

        return { ...item, stock: Math.max(0, item.stock - qtyToDispense) };
      }
      return item;
    });

    setInventory(updatedInventory);

    const logEntry = {
      id: `DISP-${Date.now()}`,
      rxId: activeOrder.id,
      patientId: activeOrder.patientId,
      patientName: activeOrder.patientName,
      pharmacistId: user.email,
      pharmacistName: user.firstName,
      date: new Date().toLocaleString(),
      items: itemizedBill,
      totalAmount: totalBillAmount
    };

    const history = JSON.parse(localStorage.getItem("mediflow_dispensing_history") || "[]");
    localStorage.setItem("mediflow_dispensing_history", JSON.stringify([logEntry, ...history]));

    setShowBill(logEntry);
    setActiveOrder(null);
    fetchQueue();
    toast({ title: "Dispensing Verified", description: "Inventory debited and billing generated." });
  };

  const handleRaiseComplaint = () => {
    if (!complaintMed || !complaintNote) return;
    setIsComplaining(true);
    setTimeout(() => {
      const allComplaints = JSON.parse(localStorage.getItem("mediflow_pharmacist_complaints") || "[]");
      const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");

      const targetMed = inventory.find(m => m.name === complaintMed);

      const newComplaint = {
        id: Date.now(),
        pharmacist: user.firstName,
        pharmacistEmail: user.email,
        medicineName: complaintMed,
        currentStock: targetMed ? targetMed.stock : 0,
        urgency: complaintUrgency,
        note: complaintNote,
        timestamp: new Date().toLocaleString(),
        status: "Urgent Action Required"
      };

      localStorage.setItem("mediflow_pharmacist_complaints", JSON.stringify([newComplaint, ...allComplaints]));
      setComplaintMed("");
      setComplaintNote("");
      setIsComplaining(false);
      toast({ title: "Admin Notified", description: `Shortage alert for ${complaintMed} sent successfully.` });
    }, 1200);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="pharmacist" />

      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary mb-1 tracking-tight">Pharmacy System Hub</h1>
            <p className="text-muted-foreground text-lg mb-2">Integrated Clinical Dispensing & Inventory Control.</p>
            {attendance && (
              <div className="flex gap-2">
                <Badge className={`px-3 py-1 font-bold uppercase tracking-widest text-[10px] ${attendance.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                   {attendance.status}: {attendance.loginTime}
                </Badge>
                <Badge variant="outline" className="px-3 py-1 font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-slate-50">
                   Screen Time: {attendance.screenTimeStr}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="h-14 px-8 rounded-2xl font-bold shadow-lg shadow-red-200">
                  <TrendingDown className="h-5 w-5 mr-3" /> Report Shortage
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[3rem] border-4 border-red-100 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase text-red-600">Stock Complaint</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6 font-bold">
                  <div className="space-y-2">
                    <Label>Select Medicine</Label>
                    <Select value={complaintMed} onValueChange={setComplaintMed}>
                      <SelectTrigger className="h-14 rounded-2xl"><SelectValue placeholder="Choose medicine..." /></SelectTrigger>
                      <SelectContent>
                        {inventory.map(m => <SelectItem key={m.id} value={m.name}>{m.name} (Stock: {m.stock})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Urgency Level</Label>
                    <Select value={complaintUrgency} onValueChange={setComplaintUrgency}>
                      <SelectTrigger className="h-14 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low - Reminder</SelectItem>
                        <SelectItem value="Medium">Medium - Critical Soon</SelectItem>
                        <SelectItem value="High">High - Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pharmacist Notes</Label>
                    <Textarea
                      placeholder="Add specific details for admin review..."
                      className="rounded-2xl min-h-[100px]"
                      value={complaintNote}
                      onChange={e => setComplaintNote(e.target.value)}
                    />
                  </div>
                  <Button className="w-full h-16 rounded-2xl text-lg bg-red-600 hover:bg-red-700" onClick={handleRaiseComplaint} disabled={isComplaining || !complaintMed}>
                    {isComplaining ? <Loader2 className="h-5 w-5 animate-spin" /> : "Dispatch Complaint"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold bg-white" onClick={() => window.location.href = '/dashboard/pharmacist/history'}>
              <History className="h-5 w-5 mr-3" /> Dispense History
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Queue & Lookup */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl">Live RX Queue</CardTitle>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-4">{pendingQueue.length} Pending</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {pendingQueue.length === 0 ? (
                  <div className="p-16 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground italic text-sm">No clinical orders awaiting fulfillment.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {pendingQueue.map((item) => (
                      <button key={item.id} onClick={() => handleFetch(item.id)} className="w-full text-left p-8 hover:bg-primary/5 transition-all group border-l-4 border-transparent hover:border-primary">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-lg group-hover:text-primary transition-colors">{item.patientName}</h4>
                          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold uppercase">{item.date}</span>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase opacity-60">ID: {item.id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[3rem] border-none shadow-xl bg-primary text-white p-8">
              <div className="space-y-6">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <FileText className="h-6 w-6" /> Manual Verification
                  </CardTitle>
                  <p className="text-white/70 text-sm mt-2 font-medium">Enter paper RX ID for digital sync.</p>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter RX-ID..."
                    className="rounded-2xl h-16 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xl font-bold"
                    value={rxId}
                    onChange={(e) => setRxId(e.target.value)}
                  />
                  <Button className="h-16 w-16 rounded-2xl bg-white text-primary hover:bg-slate-100" onClick={() => handleFetch()} disabled={fetching}>
                    {fetching ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-7 w-7" />}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Prescription Review & Action */}
          <div className="lg:col-span-8">
            <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white h-full flex flex-col overflow-hidden">
              <CardHeader className="p-10 border-b bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-black uppercase text-primary tracking-tight">Record Verification Desk</CardTitle>
                    <CardDescription className="text-lg mt-1 font-medium italic">Clinical review before pharmaceutical commitment.</CardDescription>
                  </div>
                  {activeOrder && (
                    <Badge className="h-10 px-6 rounded-full bg-green-100 text-green-800 text-sm font-black uppercase border-none">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-10">
                {!activeOrder && !fetching ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20 py-32">
                    <Package className="h-32 w-32" />
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black uppercase">Station Idle</h3>
                      <p className="text-xl font-bold">Select a record from the queue to start processing.</p>
                    </div>
                  </div>
                ) : fetching ? (
                  <div className="h-full flex flex-col items-center justify-center py-40 gap-6">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                    <p className="text-2xl font-black text-primary animate-pulse tracking-widest uppercase">Fetching Records...</p>
                  </div>
                ) : activeOrder && (
                  <div className="space-y-12 animate-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                        <p className="text-xs font-black uppercase text-slate-400 mb-2">Recipient</p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{activeOrder.patientName}</h4>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                        <p className="text-xs font-black uppercase text-slate-400 mb-2">Prescribing MD</p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{activeOrder.doctorName}</h4>
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                        <p className="text-xs font-black uppercase text-slate-400 mb-2">Timestamp</p>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{activeOrder.date}</h4>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h5 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Clinical Regimen Details</h5>
                      <div className="space-y-4">
                        {activeOrder.medications.map((m: any, i: number) => {
                          const inventoryItem = inventory.find(inv => inv.name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(inv.name.toLowerCase()));
                          const unitPrice = inventoryItem ? inventoryItem.price : 0;
                          const qty = 10; // Simulation
                          const total = unitPrice * qty;

                          return (
                            <div key={i} className="flex justify-between items-center p-8 bg-white rounded-[2rem] border-2 shadow-sm hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center">
                                  <Package className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <p className="font-black text-2xl uppercase tracking-tight">{m.name}</p>
                                  <p className="text-sm font-bold text-muted-foreground mt-1 uppercase italic">{m.dosage} • {m.timeLabel} • {m.duration}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-12 text-right">
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Unit Price</p>
                                  <p className="font-bold text-lg">₹{unitPrice}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Qty</p>
                                  <p className="font-bold text-lg">x{qty}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-primary uppercase mb-1">Total</p>
                                  <p className="font-black text-2xl text-primary tracking-tighter">₹{total}</p>
                                </div>
                                <Badge variant="secondary" className="font-black px-6 py-2 rounded-xl bg-primary/10 text-primary border-none text-[10px] uppercase tracking-widest hidden xl:block">
                                  In Stock
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-8 mt-auto border-t-2 border-dashed">
                      <Button
                        className="w-full h-24 text-3xl font-black rounded-[2.5rem] shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-6"
                        onClick={handleDispense}
                      >
                        VERIFY & DISPENSE NOW <ArrowRight className="h-10 w-10" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Itemized Bill Overlay */}
        {showBill && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <Card className="max-w-xl w-full rounded-[4rem] border-primary border-[12px] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
              <CardHeader className="text-center pt-12 pb-8 bg-slate-50">
                <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">
                  <CheckCircle2 className="h-14 w-14" />
                </div>
                <CardTitle className="text-4xl font-black uppercase tracking-tight">Digital Settlement</CardTitle>
                <CardDescription className="text-lg font-bold">Transaction Confirmed: {showBill.id}</CardDescription>
              </CardHeader>
              <CardContent className="p-12 space-y-10">
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Itemized Description</p>
                  <div className="space-y-3">
                    {showBill.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center font-bold text-lg border-b pb-2">
                        <span>{item.name} (x{item.qty})</span>
                        <span className="text-primary tracking-tight">₹{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-end border-t-4 border-black pt-8">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest opacity-40">Total Amount Due</p>
                    <h2 className="text-7xl font-black text-primary tracking-tighter">₹{showBill.totalAmount.toLocaleString()}</h2>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border-2">
                    <QrCode className="h-24 w-24" />
                  </div>
                </div>

                <Button className="w-full h-20 rounded-[2rem] text-2xl font-black bg-black text-white hover:bg-zinc-800 transition-all shadow-xl" onClick={() => setShowBill(null)}>
                  PRINT & CLOSE RECORD
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
