"use client";
import { GlobalSync } from "@/lib/sync-service";

import { useState, useEffect, useCallback } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Package,
  Calendar,
  UserPlus,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Loader2,
  Copy,
  Search,
  MessageSquareWarning,
  CheckCircle2,
  Key,
  ShieldCheck,
  Pill,
  CheckCircle,
  XCircle,
  FileText,
  Filter,
  Edit,
  ArrowRight,
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoleGuard } from "@/hooks/use-role-guard";

const TIME_SLOTS_PRESET = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM"
];

export default function FormalAdminDashboard() {
  const { toast } = useToast();
  // CONSTRAINT 10: Only admins can access this portal
  useRoleGuard("admin");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    doctors: 0,
    pharmacists: 0,
    pendingComplaints: 0,
    pendingSlots: 0
  });

  // Registry States
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "doctor", specialization: "", license: "", phone: "+91 " });
  const [generatedCreds, setGeneratedCreds] = useState<any>(null);

  // Complaints State
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintFilters, setComplaintFilters] = useState({ type: "all", status: "all" });
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [emailError, setEmailError] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [pendingSlots, setPendingSlots] = useState<any[]>([]);

  const checkEmailUnique = async (val: string) => {
    if (!val || !val.includes("@")) return;
    try {
      // 1. Check Local Sync Pool (Client-Side)
      const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
      const localPatients = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
      const inLocalStaff = localStaff.find((s: any) => s.email.toLowerCase() === val.toLowerCase());
      const inLocalPatients = localPatients.find((p: any) => p.email.toLowerCase() === val.toLowerCase());
      
      if (inLocalStaff || inLocalPatients) {
        const found = inLocalStaff || inLocalPatients;
        setEmailError(`Existing Account (Local): ${found.name || (found.firstName + " " + found.lastName)} (${found.role || "Staff"}). Duplicate blocked.`);
        return;
      }

      // 2. Check Cloud/Server API
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.exists) {
        setEmailError(`Existing Account (Global): ${data.data?.name || "User"} (${data.data?.role || "Staff"}). Duplicate blocked.`);
      } else if (!val.toLowerCase().endsWith("@mediflow.com")) {
        setEmailError("invalid type: Staff registry strictly restricted to @mediflow.com domains.");
      } else {
        setEmailError("");
      }
    } catch (e) {
      console.error("Email check failed", e);
    }
  };

  const updateMedicinePrice = async (id: string, price: number) => {
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePrice', id, price })
      });
      if (res.ok) {
        fetchMedicines();
        toast({ title: "Price Updated", description: "The medicine price has been synced across the network." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not update price." });
    }
  };

  const fetchMedicines = async () => {
    const res = await fetch('/api/medicines');
    const data = await res.json();
    setMedicines(data.medicines || []);
  };

  // Schedule Editor State
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [newSlotValue, setNewSlotValue] = useState("");

  // ── Medication Time Slot Configurator ─────────────────────────────────────
  interface MedSlot { label: string; display: string; hour: number; minute: number; }
  const DEFAULT_MED_SLOTS: MedSlot[] = [
    { label: "Morning", display: "Morning (8 AM)", hour: 8, minute: 0 },
    { label: "Afternoon", display: "Afternoon (1 PM)", hour: 13, minute: 0 },
    { label: "Evening", display: "Evening (6 PM)", hour: 18, minute: 0 },
    { label: "Night", display: "Night (9 PM)", hour: 21, minute: 0 },
  ];
  const loadMedSlots = (): MedSlot[] => {
    try {
      const s = localStorage.getItem("mediflow_med_time_slots");
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
    } catch { }
    return DEFAULT_MED_SLOTS;
  };
  const [medSlots, setMedSlots] = useState<MedSlot[]>(DEFAULT_MED_SLOTS);
  const [newMedLabel, setNewMedLabel] = useState("");
  const [newMedTime, setNewMedTime] = useState("08:00"); // 24h format input

  useEffect(() => { setMedSlots(loadMedSlots()); }, []);

  const saveMedSlots = (updated: MedSlot[]) => {
    setMedSlots(updated);
    localStorage.setItem("mediflow_med_time_slots", JSON.stringify(updated));
    toast({ title: "✅ Time Slots Saved", description: "Doctors will see the updated slots in their prescription writer." });
  };

  const addMedSlot = () => {
    if (!newMedLabel.trim() || !newMedTime) return;
    const [h, m] = newMedTime.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const display = `${newMedLabel.trim()} (${h12}:${String(m).padStart(2, "0")} ${ampm})`;
    const slug = newMedLabel.trim().replace(/\s+/g, "_");
    const existing = medSlots.find(s => s.label.toLowerCase() === slug.toLowerCase());
    if (existing) { toast({ variant: "destructive", title: "Duplicate", description: "A slot with this label already exists." }); return; }
    saveMedSlots([...medSlots, { label: slug, display, hour: h, minute: m }]);
    setNewMedLabel("");
    setNewMedTime("08:00");
  };

  const removeMedSlot = (label: string) => {
    saveMedSlots(medSlots.filter(s => s.label !== label));
  };
  // ──────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      // --- GLOBAL CLOUD SYNC ---
      await GlobalSync.pullStaff();
      await GlobalSync.pullPatients();

      // 1. Fetch Staff (Unified endpoint for admin)
      const staffRes = await fetch('/api/admin/staff');
      const staffData = await staffRes.json();
      setStaff(staffData.staff || []);

      // 2. Fetch Complaints with filters
      const compRes = await fetch(`/api/admin/complaints?type=${complaintFilters.type}&status=${complaintFilters.status}`);
      const compData = await compRes.json();
      setComplaints(compData.complaints || []);

      // 3. Fetch Patients
      const patientRes = await fetch('/api/patients');
      const patientData = await patientRes.json();
      setPatients(patientData.patients || []);

      // 4. Fetch Medicines
      fetchMedicines();

      // 5. Update Metrics
      const docs = staffData.staff?.filter((s: any) => s.role === 'doctor').length || 0;
      const pharms = staffData.staff?.filter((s: any) => s.role === 'pharmacist').length || 0;
      const pending = compData.complaints?.filter((c: any) => c.status === 'unresolved').length || 0;

      const slotsRes = await fetch('/api/admin/schedule?status=pending');
      const slotsData = await slotsRes.json();
      setPendingSlots(slotsData.slots || []);
      const pendingSlotsCount = slotsData.slots?.length || 0;

      setMetrics({ doctors: docs, pharmacists: pharms, pendingComplaints: pending, pendingSlots: pendingSlotsCount });

    } catch (err) {
      toast({ variant: "destructive", title: "API Sync Failure", description: "Database connection intermittent." });
    }
  }, [complaintFilters, toast]);

  useEffect(() => {
    fetchData();
    // Auto-Sync for Live Requests (Interval: 3s)
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStaffPhoneInput = (val: string) => {
    if (!val.startsWith("+91")) {
      setNewStaff({ ...newStaff, phone: "+91 " });
      return;
    }
    let digits = val.slice(3).replace(/\D/g, "").slice(0, 10);
    digits = digits.replace(/^[^6-9]+/, "");
    setNewStaff({ ...newStaff, phone: "+91 " + digits });
  };

  const handleOnboardStaff = async () => {
    const cleanPhone = newStaff.phone.replace(/\s/g, '');
    // CONSTRAINT 7: Name must be letters only
    if (!newStaff.name.trim() || /[^a-zA-Z\s.]/.test(newStaff.name)) {
      toast({ variant: "destructive", title: "Invalid Name", description: "Name must contain only letters, spaces, and periods." });
      return;
    }
    // --- CONSTRAINT: Must be @mediflow.com domain ---
    if (!newStaff.email.toLowerCase().endsWith("@mediflow.com")) {
      toast({ 
        variant: "destructive", 
        title: "invalid type", 
        description: "Official staff access restricted to @mediflow.com domains only. Gmail/Outlook accounts are for patients." 
      });
      return;
    }

    // CONSTRAINT 12: Email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newStaff.email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email format (e.g., example@gmail.com)." });
      return;
    }
    // CONSTRAINT 2: Phone validation
    if (cleanPhone.length !== 13 || !['6', '7', '8', '9'].includes(cleanPhone[3])) {
      toast({ variant: "destructive", title: "Invalid Phone", description: "Phone number must be 10 digits starting with 6, 7, 8, or 9." });
      return;
    }
    // CONSTRAINT 11: Password strength
    if (newStaff.password.length < 8 || !/[A-Z]/.test(newStaff.password) || !/[a-z]/.test(newStaff.password) || !/[0-9]/.test(newStaff.password) || !/[!@#$%^&*]/.test(newStaff.password)) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password must have at least 8 characters with uppercase, lowercase, number, and special character." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStaff,
          phone: newStaff.phone.replace(/\s/g, '')
        })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCreds(data.credentials);
        
        // --- FALLBACK FOR VERCEL EPHEMERAL MEMORY ---
        // Save to localStorage so admin and doctor testing on the same browser can login 
        // even if Vercel serverless function memory resets.
        try {
          const localStaff = JSON.parse(localStorage.getItem("mediflow_staff") || "[]");
          if (!localStaff.some((s: any) => s.email.toLowerCase() === newStaff.email.toLowerCase())) {
            localStaff.push({
              ...newStaff,
              id: Date.now(),
              passwordPlain: newStaff.password,
              password: newStaff.password
            });
            localStorage.setItem("mediflow_staff", JSON.stringify(localStaff));
            
            // --- GLOBAL CLOUD SYNC ---
            // Push to cloud so other devices can access these credentials
            GlobalSync.pushStaff();
          }
        } catch(e) {}
        
        setNewStaff({ name: "", email: "", password: "", role: "doctor", specialization: "", license: "", phone: "+91 " });
        fetchData();
        toast({ title: "Success", description: `Credential generated and securely hashed in registry.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to onboard staff." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: "Could not write to secure staff registry." });
    }
    setLoading(false);
  };

  const handleResolveComplaint = async (id: number) => {
    try {
      const res = await fetch('/api/admin/complaints', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: "resolved", note: resolutionNote })
      });
      if (res.ok) {
        fetchData();
        setResolvingId(null);
        setResolutionNote("");
        toast({ title: "Resolved", description: "The complaint has been archived." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: "Could not update complaint status." });
    }
  };

  const fetchSlots = async (email: string, date: string) => {
    const res = await fetch(`/api/admin/schedule?docEmail=${email}&date=${date}`);
    const data = await res.json();
    setActiveSlots(data.slots || []);
  };

  const manipulateSlot = async (action: string, extra: any = {}) => {
    setLoading(true);
    await fetch('/api/admin/schedule', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docEmail: selectedDoctor, date: selectedDate, action, ...extra })
    });
    fetchSlots(selectedDoctor, selectedDate);
    setLoading(false);
  };

  const handleApproveSlot = async (id: number) => {
    await fetch('/api/admin/schedule', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "approve", id })
    });
    fetchData();
    toast({ title: "Slot Approved", description: "This slot is now available for patients." });
  };

  const handleRejectSlot = async (id: number) => {
    await fetch('/api/admin/schedule', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "reject", id })
    });
    fetchData();
    toast({ variant: "destructive", title: "Slot Rejected", description: "The slot request has been removed." });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav role="admin" />

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ADMINISTRATIVE PORTAL</h1>
            <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-1">Hospital Multi-Tenant Hub</p>
          </div>
          <div className="flex gap-4">
            <Card className="p-4 rounded-2xl border-none bg-slate-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black">
                {metrics.doctors}
              </div>
              <p className="text-[10px] font-black uppercase text-zinc-500">Docs</p>
            </Card>
            <Card className="p-4 rounded-2xl border-none bg-slate-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black">
                {metrics.pharmacists}
              </div>
              <p className="text-[10px] font-black uppercase text-zinc-500">Pharma</p>
            </Card>
            <Card className="p-4 rounded-2xl border-none bg-orange-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-orange-600">
                {(metrics as any).pendingSlots || 0}
              </div>
              <p className="text-[10px] font-black uppercase text-orange-700">Slots</p>
            </Card>
            <Card className="p-4 rounded-2xl border-none bg-red-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-red-600">
                {metrics.pendingComplaints}
              </div>
              <p className="text-[10px] font-black uppercase text-red-700">Alerts</p>
            </Card>
          </div>
        </header>

        <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
          <TabsList className="bg-white p-1 rounded-2xl border h-16 shadow-lg inline-flex">
            <TabsTrigger value="overview" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">Dashboard</TabsTrigger>
            <TabsTrigger value="staff" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">Credentials</TabsTrigger>
            <TabsTrigger value="medicines" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">Medicines</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">Schedules</TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">
              Approvals
              {pendingSlots.length > 0 && <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-[8px]">{pendingSlots.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="complaints" className="rounded-xl px-10 h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white font-black text-xs uppercase tracking-widest">Complaints</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden lg:col-span-3">
                <header className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase font-headline">Registered Patients</h2>
                  <Badge variant="outline">{patients.length} Enrolled</Badge>
                </header>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto scrollbar-hide">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="pl-8">NAME</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead>PHONE</TableHead>
                        <TableHead className="text-right pr-8">REG. DATE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map(p => (
                        <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="pl-8 font-bold py-6">{p.firstName} {p.lastName}</TableCell>
                          <TableCell>{p.email}</TableCell>
                          <TableCell>{p.phone}</TableCell>
                          <TableCell className="text-right pr-8 font-mono text-[10px]">{new Date(p.registeredAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
                <header className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase font-headline">Clinical Staff (Doctors)</h2>
                  <Badge variant="outline">{metrics.doctors} Registered</Badge>
                </header>
                <CardContent className="p-0 max-h-[500px] overflow-y-auto scrollbar-hide">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="pl-8">NAME</TableHead>
                        <TableHead>SPECIALTY</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead className="text-right pr-8">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.filter(s => s.role === 'doctor').map(d => {
                        const logs = JSON.parse(localStorage.getItem("mediflow_staff_attendance") || "[]");
                        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        const myLog = logs.find((l: any) => l.email === d.email && l.date === todayStr);
                        
                        let screenTimeStr = "Offline";
                        if (myLog?.timestamp) {
                          const diff = new Date().getTime() - new Date(myLog.timestamp).getTime();
                          const hrs = Math.floor(diff / (1000 * 60 * 60));
                          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          screenTimeStr = `${hrs}h ${mins}m`;
                        }

                        return (
                          <TableRow key={d.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="pl-8 font-bold py-6">{d.name}</TableCell>
                            <TableCell>{d.specialization}</TableCell>
                            <TableCell className="text-xs">{d.email}</TableCell>
                            <TableCell className="text-right pr-8">
                              {myLog ? (
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={myLog.status === 'Present' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                                    {myLog.status} ({myLog.loginTime})
                                  </Badge>
                                  <span className="text-[9px] font-bold text-muted-foreground">Online: {screenTimeStr}</span>
                                </div>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500">AWAY</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
                <header className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase font-headline">Lead Pharmacists</h2>
                  <Badge variant="outline">{metrics.pharmacists} Registered</Badge>
                </header>
                <CardContent className="p-0 max-h-[500px] overflow-y-auto scrollbar-hide">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="pl-8">NAME</TableHead>
                        <TableHead>OFFICE</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead className="text-right pr-8">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.filter(s => s.role === 'pharmacist').map(p => {
                        const logs = JSON.parse(localStorage.getItem("mediflow_staff_attendance") || "[]");
                        const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        const myLog = logs.find((l: any) => l.email === p.email && l.date === todayStr);
                        
                        let screenTimeStr = "Offline";
                        if (myLog?.timestamp) {
                           const diff = new Date().getTime() - new Date(myLog.timestamp).getTime();
                           const hrs = Math.floor(diff / (1000 * 60 * 60));
                           const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                           screenTimeStr = `${hrs}h ${mins}m`;
                        }

                        return (
                          <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="pl-8 font-bold py-6">{p.name}</TableCell>
                            <TableCell>{p.pharmacyId || "Global Warehouse"}</TableCell>
                            <TableCell className="text-xs">{p.email}</TableCell>
                            <TableCell className="text-right pr-8">
                              {myLog ? (
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={myLog.status === 'Present' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                                    {myLog.status} ({myLog.loginTime})
                                  </Badge>
                                  <span className="text-[9px] font-bold text-muted-foreground">Online: {screenTimeStr}</span>
                                </div>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500">AWAY</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <Card className="lg:col-span-5 rounded-[3rem] border-none shadow-2xl p-10 space-y-6">
                <div className="bg-zinc-900 -mx-10 -mt-10 p-10 mb-6 text-white text-center">
                  <h3 className="text-2xl font-black tracking-tighter uppercase font-headline">Credential Vault</h3>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Secure Hashing Emulation Active</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Name</Label>
                    <Input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value.replace(/[^a-zA-Z\s.]/g, '') })} placeholder="Dr. Sarah Johnson" className="h-14 rounded-2xl border-2 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Official ID (Must end in @mediflow.com)</Label>
                    <Input
                      value={newStaff.email}
                      onBlur={() => {
                        if (newStaff.email && !newStaff.email.toLowerCase().endsWith("@mediflow.com")) {
                           toast({ variant: "destructive", title: "invalid type", description: "All staff IDs MUST end in @mediflow.com. Gmail/Other domains are for patients only." });
                        }
                      }}
                      onChange={e => {
                        setNewStaff({ ...newStaff, email: e.target.value.toLowerCase() });
                        checkEmailUnique(e.target.value);
                      }}
                      placeholder="e.g. j.doe@mediflow.com"
                      className={`h-14 rounded-2xl border-2 font-bold ${emailError ? 'border-red-500' : (newStaff.email && !newStaff.email.toLowerCase().endsWith("@mediflow.com") ? 'border-amber-500' : '')}`}
                    />
                    {emailError && <p className="text-[10px] text-red-600 font-bold ml-1">{emailError}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Initial Password</Label>
                      </div>
                      <Input type="password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} className="h-14 rounded-2xl border-2 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Portal Role</Label>
                      <Select value={newStaff.role} onValueChange={v => setNewStaff({ ...newStaff, role: v })}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          <SelectItem value="doctor">Medical Doctor</SelectItem>
                          <SelectItem value="pharmacist">Lead Pharmacist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Password Rules Hint */}
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed space-y-1">
                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-1">Password Requirements</p>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${newStaff.password.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold ${newStaff.password.length >= 8 ? 'text-green-700' : 'text-slate-400'}`}>8+ Characters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(newStaff.password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold ${/[0-9]/.test(newStaff.password) ? 'text-green-700' : 'text-slate-400'}`}>One Number</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(newStaff.password) && /[a-z]/.test(newStaff.password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold ${/[A-Z]/.test(newStaff.password) && /[a-z]/.test(newStaff.password) ? 'text-green-700' : 'text-slate-400'}`}>Upper & Lowercase</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${/[!@#$%^&*]/.test(newStaff.password) ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold ${/[!@#$%^&*]/.test(newStaff.password) ? 'text-green-700' : 'text-slate-400'}`}>One Special Char</span>
                    </div>
                  </div>

                  {newStaff.role === 'doctor' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Specialization</Label>
                      <Input value={newStaff.specialization} onChange={e => setNewStaff({ ...newStaff, specialization: e.target.value })} className="h-14 rounded-2xl border-2 font-bold" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Phone Number (India)</Label>
                    <Input
                      value={newStaff.phone}
                      onChange={e => handleStaffPhoneInput(e.target.value)}
                      placeholder="+91 00000 00000"
                      className="h-14 rounded-2xl border-2 font-bold"
                    />
                    <p className="text-[9px] text-muted-foreground italic ml-1">Format: +91 followed by 10 digits</p>
                  </div>

                  <Button
                    className="w-full h-16 rounded-[2rem] bg-zinc-900 text-lg font-black tracking-tighter shadow-2xl shadow-zinc-200 mt-4"
                    onClick={handleOnboardStaff}
                    disabled={loading || !!emailError || newStaff.password.length < 8 || !/[0-9]/.test(newStaff.password) || !/[!@#$%^&*]/.test(newStaff.password) || !/[A-Z]/.test(newStaff.password) || !/[a-z]/.test(newStaff.password)}
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "GENERATE & SYNC CREDS"}
                  </Button>
                </div>
              </Card>

              <div className="lg:col-span-7">
                {generatedCreds ? (
                  <Card className="rounded-[3rem] border-[10px] border-zinc-900 bg-white p-10 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95">
                    <CheckCircle2 className="h-20 w-20 text-green-600" />
                    <div className="text-center space-y-2">
                      <h3 className="text-3xl font-black uppercase tracking-tighter font-headline text-slate-900 underline decoration-slate-200 decoration-8 underline-offset-8 mb-4">Account Provisioned</h3>
                      <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Share these with the clinician immediately</p>
                    </div>
                    <div className="w-full max-w-sm space-y-4">
                      <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedCreds.email); toast({ title: "Copied ID" }); }}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Clinical ID</p>
                          <p className="text-xl font-bold">{generatedCreds.email}</p>
                        </div>
                        <Copy className="h-5 w-5 opacity-20 group-hover:opacity-100" />
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedCreds.password); toast({ title: "Copied Password" }); }}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Secret key</p>
                          <p className="text-xl font-bold tracking-widest">{generatedCreds.password}</p>
                        </div>
                        <Copy className="h-5 w-5 opacity-20 group-hover:opacity-100" />
                      </div>
                    </div>
                    <Button variant="outline" className="h-16 w-full max-w-sm rounded-2xl border-2 font-black" onClick={() => setGeneratedCreds(null)}>DONE</Button>
                  </Card>
                ) : (
                  <Card className="h-full rounded-[3rem] border-none shadow-sm flex flex-col items-center justify-center opacity-30 text-center p-12 space-y-6">
                    <ShieldCheck className="h-32 w-32" />
                    <div className="space-y-2">
                      <p className="text-3xl font-black uppercase tracking-tighter">Ready to Onboard</p>
                      <p className="font-bold">Credential generation results will appear here.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="medicines" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
              <header className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase font-headline tracking-tighter">Pharmacy Price Control</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Unit Pricing & Stock propagation</p>
                </div>
                <Badge variant="outline" className="h-10 px-6 rounded-xl font-black">{medicines.length} Stocked Items</Badge>
              </header>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-10 py-6 uppercase tracking-widest text-[10px] font-bold">Medicine Name</TableHead>
                      <TableHead className="uppercase tracking-widest text-[10px] font-bold">Category</TableHead>
                      <TableHead className="uppercase tracking-widest text-[10px] font-bold">Current Price (Unit)</TableHead>
                      <TableHead className="uppercase tracking-widest text-[10px] font-bold">Update Pricing</TableHead>
                      <TableHead className="text-right pr-10 uppercase tracking-widest text-[10px] font-bold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map(med => (
                      <TableRow key={med.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="pl-10 py-6">
                          <p className="font-bold text-lg">{med.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black">{med.manufacturer}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="rounded-lg">{med.category}</Badge></TableCell>
                        <TableCell className="text-2xl font-black text-primary">₹{med.price}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              defaultValue={med.price}
                              className="w-24 h-10 rounded-xl font-bold"
                              onBlur={(e) => {
                                if (Number(e.target.value) !== med.price) {
                                  updateMedicinePrice(med.id, Number(e.target.value));
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <Button variant="outline" className="rounded-xl font-bold h-10 px-4">Update</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <Card className="lg:col-span-4 rounded-[3rem] shadow-2xl p-10 bg-white space-y-8 h-fit">
                <h3 className="text-2xl font-black font-headline uppercase tracking-tighter border-b-8 border-slate-100 pb-4">Slot Manager</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Select Practitioner</Label>
                    <Select value={selectedDoctor} onValueChange={v => { setSelectedDoctor(v); if (selectedDate) fetchSlots(v, selectedDate); }}>
                      <SelectTrigger className="h-16 rounded-2xl border-2 text-lg font-bold">
                        <SelectValue placeholder="Which Doctor?" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2">
                        {staff.filter(s => s.role === 'doctor').map(d => (
                          <SelectItem key={d.email} value={d.email} className="py-3 font-bold">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Select Clinic Date</Label>
                    <Input
                      type="date"
                      className="h-16 rounded-2xl border-2 text-lg font-bold"
                      value={selectedDate}
                      onChange={e => { setSelectedDate(e.target.value); if (selectedDoctor) fetchSlots(selectedDoctor, e.target.value); }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </Card>

              <div className="lg:col-span-8">
                <Card className="rounded-[3rem] border-none shadow-xl bg-white min-h-[500px] flex flex-col">
                  <header className="p-10 border-b bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Active Time Matrix</h3>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Live scheduling synchronization</p>
                    </div>
                    {(selectedDoctor && selectedDate) && (
                      <Button className="rounded-2xl h-12 px-6 font-black flex gap-2" onClick={() => setEditingSlot("new")}>
                        <Plus className="h-4 w-4" /> ADD SLOT
                      </Button>
                    )}
                  </header>

                  <div className="flex-1 p-10">
                    {(!selectedDoctor || !selectedDate) ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-10 space-y-6">
                        <Clock className="h-32 w-32" />
                        <p className="text-2xl font-semibold uppercase">Pending Session Selection</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {activeSlots.length === 0 ? (
                          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-4">
                            <AlertTriangle className="h-12 w-12 text-slate-300" />
                            <p className="font-bold text-slate-400 capitalize">No clinical slots active for this date range.</p>
                            <Button variant="outline" className="rounded-xl font-black" onClick={() => manipulateSlot("update_all", { slots: TIME_SLOTS_PRESET.slice(0, 5) })}>AUTO-POPULATE (9-12 AM)</Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeSlots.map(slot => (
                              <div key={slot} className="p-6 rounded-[2rem] border-4 border-slate-100 bg-white flex justify-between items-center group hover:border-zinc-900 transition-all">
                                <span className="text-2xl font-black tracking-tighter">{slot}</span>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-slate-100" onClick={() => { setEditingSlot(slot); setNewSlotValue(slot); }}>
                                    <Edit className="h-4 w-4 text-slate-400" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-red-50 hover:text-red-600" onClick={() => manipulateSlot("delete_slot", { slotToEdit: slot })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {editingSlot && (
                          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                            <Card className="w-full max-w-md rounded-[3rem] p-10 space-y-6">
                              <h3 className="text-2xl font-black uppercase tracking-tighter text-center">{editingSlot === 'new' ? 'New Slot Entry' : 'Manual Slot Override'}</h3>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-black">Entry Type</Label>
                                  <Select value={newSlotValue || editingSlot} onValueChange={setNewSlotValue}>
                                    <SelectTrigger className="h-14 rounded-2xl border-2 font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {TIME_SLOTS_PRESET.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-4">
                                  <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black" onClick={() => setEditingSlot(null)}>CANCEL</Button>
                                  <Button className="flex-1 h-14 rounded-2xl bg-zinc-900 font-black shadow-xl" onClick={() => {
                                    if (editingSlot === 'new') manipulateSlot("add_slot", { newSlot: newSlotValue });
                                    else manipulateSlot("edit_slot", { slotToEdit: editingSlot, newSlot: newSlotValue });
                                    setEditingSlot(null);
                                  }}>CONFIRM</Button>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* ── Medication Time Slots Configurator ───────────────────────── */}
            <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
              <header className="p-8 border-b bg-emerald-50 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter font-headline flex items-center gap-3">
                    <Pill className="h-6 w-6 text-emerald-600" />
                    Medication Time Slots
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
                    Define when doctors can schedule patient medication throughout the day
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 rounded-xl font-black">
                  {medSlots.length} Slots Active
                </Badge>
              </header>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Existing slots list */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Current Slots</p>
                    {medSlots.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed rounded-2xl text-muted-foreground italic text-sm">
                        No slots configured. Add one using the form.
                      </div>
                    ) : (
                      medSlots.map((slot) => (
                        <div key={slot.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all">
                          <div>
                            <p className="font-black text-lg">{slot.display}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">ID: {slot.label}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => removeMedSlot(slot.label)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: Add new slot */}
                  <div className="space-y-6 p-8 bg-slate-50 rounded-3xl border-2 border-dashed">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add New Slot</p>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Slot Label</Label>
                      <Input
                        placeholder='e.g. "Before Breakfast" or "With Lunch"'
                        className="h-12 rounded-xl border-2 font-bold"
                        value={newMedLabel}
                        onChange={(e) => setNewMedLabel(e.target.value)}
                      />
                      <p className="text-[9px] text-muted-foreground italic ml-1">This label appears in the doctor's prescription dropdown</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Time (24h Format)</Label>
                      <Input
                        type="time"
                        className="h-12 rounded-xl border-2 font-bold text-lg"
                        value={newMedTime}
                        onChange={(e) => setNewMedTime(e.target.value)}
                      />
                      <p className="text-[9px] text-muted-foreground italic ml-1">This is when the medication reminder will trigger for the patient</p>
                    </div>
                    <Button
                      className="w-full h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2"
                      onClick={addMedSlot}
                      disabled={!newMedLabel.trim() || !newMedTime}
                    >
                      <Plus className="h-4 w-4" />
                      Add Slot
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="approvals" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="rounded-[3rem] border-none shadow-xl bg-white overflow-hidden">
              <header className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase font-headline tracking-tighter">Doctor Slot Requests</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending approval for live portal synchronization</p>
                </div>
              </header>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-10 py-6 uppercase tracking-widest text-[10px] font-bold">Doctor</TableHead>
                      <TableHead className="uppercase tracking-widest text-[10px] font-bold">Date</TableHead>
                      <TableHead className="uppercase tracking-widest text-[10px] font-bold">Time Slot</TableHead>
                      <TableHead className="text-right pr-10 uppercase tracking-widest text-[10px] font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSlots.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-zinc-400 italic">No pending slot requests.</TableCell></TableRow>
                    ) : (
                      pendingSlots.map(slot => (
                        <TableRow key={slot.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="pl-10 py-6 font-bold">{slot.docEmail}</TableCell>
                          <TableCell className="font-medium text-slate-600">{slot.date}</TableCell>
                          <TableCell><Badge className="text-xl font-black bg-slate-100 text-black border-none">{slot.slot}</Badge></TableCell>
                          <TableCell className="text-right pr-10 space-x-2">
                            <Button className="rounded-xl bg-green-600 hover:bg-green-700 h-12 px-6 font-black" onClick={() => handleApproveSlot(slot.id)}>APPROVE</Button>
                            <Button variant="outline" className="rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 h-12 px-6 font-black" onClick={() => handleRejectSlot(slot.id)}>REJECT</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complaints" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <Card className="rounded-[4rem] border-none shadow-3xl overflow-hidden bg-white">
              <header className="bg-zinc-900 p-10 text-white flex justify-between items-center">
                <div className="space-y-2">
                  <h3 className="text-4xl font-headline font-black uppercase tracking-tighter">Unified Feedback Registry</h3>
                  <p className="text-white/40 font-black uppercase text-xs tracking-widest">Filter: {complaintFilters.type} / {complaintFilters.status}</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/20">
                    <Filter className="h-5 w-5 opacity-40" />
                    <Select value={complaintFilters.type} onValueChange={v => setComplaintFilters({ ...complaintFilters, type: v })}>
                      <SelectTrigger className="bg-transparent border-none text-white font-bold h-8 focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Actors</SelectItem>
                        <SelectItem value="patient">Patients Only</SelectItem>
                        <SelectItem value="doctor">Doctors Only</SelectItem>
                        <SelectItem value="pharmacist">Pharmacists Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/20">
                    <Select value={complaintFilters.status} onValueChange={v => setComplaintFilters({ ...complaintFilters, status: v })}>
                      <SelectTrigger className="bg-transparent border-none text-white font-bold h-8 focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">Any Status</SelectItem>
                        <SelectItem value="unresolved">Unresolved</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </header>

              <div className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-10 font-black py-8 uppercase text-[10px] tracking-widest">Reporter</TableHead>
                      <TableHead className="font-black py-8 uppercase text-[10px] tracking-widest">Message Payload</TableHead>
                      <TableHead className="font-black py-8 uppercase text-[10px] tracking-widest">Timestamp</TableHead>
                      <TableHead className="font-black py-8 uppercase text-[10px] tracking-widest">Status</TableHead>
                      <TableHead className="text-right pr-10 py-8 uppercase text-[10px] tracking-widest font-black">Resolution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-zinc-400 italic">No feedback entries matching current system filters.</TableCell></TableRow>
                    ) : (
                      complaints.map(c => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black ${c.type === 'patient' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {c.from.charAt(0)}
                              </div>
                              <p className="font-bold text-lg">{c.from}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md leading-relaxed font-medium text-slate-600">{c.message}</TableCell>
                          <TableCell className="text-[10px] font-black uppercase opacity-40">{c.date}</TableCell>
                          <TableCell>
                            <Badge className={`px-4 py-1 rounded-full border-none font-black text-[10px] tracking-widest ${c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {c.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            {c.status === 'unresolved' ? (
                              <Button size="sm" className="rounded-xl h-10 px-6 font-black bg-zinc-900 border-none shadow-lg" onClick={() => setResolvingId(c.id)}>MARK AS DONE</Button>
                            ) : (
                              <div className="flex flex-col items-end opacity-40 pr-4">
                                <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
                                <p className="text-[8px] font-black uppercase">Archived Entry</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {resolvingId && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                <Card className="w-full max-w-lg rounded-[3rem] p-10 border-none shadow-4xl space-y-8 animate-in slide-in-from-bottom-8">
                  <div className="flex flex-col items-center gap-4 border-b-8 border-slate-50 -mx-10 -mt-10 p-10 mb-2">
                    <div className="h-20 w-20 bg-emerald-100 rounded-3xl flex items-center justify-center">
                      <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Resolution Audit</h3>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest ml-1">Archive Resolution Note</Label>
                    <Input
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="e.g. Explained stock timeline to Pharmacist."
                      className="h-20 rounded-2xl border-2 font-bold px-4"
                    />
                    <p className="text-[10px] text-zinc-400 italic">This note will be logged in the clinical history.</p>
                  </div>
                  <div className="flex gap-4 pt-4 border-t-8 border-slate-50 -mx-10 p-10 -mb-10 mt-2">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black" onClick={() => setResolvingId(null)}>CANCEL</Button>
                    <Button className="flex-1 h-14 rounded-2xl bg-zinc-900 font-black shadow-2xl shadow-zinc-200" onClick={() => handleResolveComplaint(resolvingId)}>CONFIRM LOG</Button>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
