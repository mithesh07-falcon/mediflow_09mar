"use client";

import { useState, useEffect, useMemo, use } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  FileText,
  Stethoscope,
  Activity,
  CalendarDays,
  Trash2,
  Pill,
  Heart,
  User,
  Shield,
  Calendar,
  Clock,
  ClipboardList,
  FlaskConical,
  Syringe,
  ScanEye,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ManualRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  category: string;
}

function safeParseArrayFromStorage<T = any>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const RECORD_CATEGORIES = [
  { value: "lab-report", label: "Lab Report", icon: FlaskConical, color: "text-blue-500 bg-blue-50" },
  { value: "vaccination", label: "Vaccination", icon: Syringe, color: "text-green-500 bg-green-50" },
  { value: "surgery", label: "Surgery", icon: Activity, color: "text-red-500 bg-red-50" },
  { value: "checkup", label: "General Checkup", icon: Stethoscope, color: "text-primary bg-primary/10" },
  { value: "scan", label: "Scan / Imaging", icon: ScanEye, color: "text-purple-500 bg-purple-50" },
  { value: "prescription", label: "External Prescription", icon: Pill, color: "text-orange-500 bg-orange-50" },
  { value: "other", label: "Other", icon: FileText, color: "text-slate-500 bg-slate-100" },
];

export default function FamilyMemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  const [member, setMember] = useState<any>(null);
  const [manualRecords, setManualRecords] = useState<ManualRecord[]>([]);
  const [appointmentRecords, setAppointmentRecords] = useState<any[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [recordTitle, setRecordTitle] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [recordCategory, setRecordCategory] = useState("checkup");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "auto" | "manual">("all");
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Member
    const activeUserStr = localStorage.getItem("mediflow_current_user");
    let currentEmail = "default";
    if (activeUserStr) {
      let user: any = {};
      try {
        user = JSON.parse(activeUserStr);
      } catch {
        user = {};
      }
      currentEmail = user.email || "default";
    }

    const parsedMembers = safeParseArrayFromStorage<any>("mediflow_family_members");
    if (parsedMembers.length > 0) {
      // Ensure the member belongs to the logged-in user securely
      const found = parsedMembers.find((m: any) => m.id === id && m.userId === currentEmail);
      if (found) {
        setMember(found);
      } else {
        router.push("/dashboard/patient/family");
      }
    } else {
      router.push("/dashboard/patient/family");
    }

    // 2. Get Manual Records
    setManualRecords(safeParseArrayFromStorage<ManualRecord>(`mediflow_health_records_${id}`));
  }, [id, router]);

  // Filter appointments based on the loaded member name
  useEffect(() => {
    if (!member) return;
    const allAppts = safeParseArrayFromStorage<any>("mediflow_appointments");
    const allPrescriptions = safeParseArrayFromStorage<any>("mediflow_prescriptions");

    // Filter all appointments matching the patient's name (both completed and confirmed)
    const memberAppts = allAppts
      .filter(
        (a: any) =>
          a.patient &&
          a.patient.toLowerCase() === member.name.toLowerCase()
      )
      .map((a: any) => {
        const pres = allPrescriptions.find(
          (p: any) => p.id === a.prescriptionId
        );
        return { ...a, prescriptionData: pres || null };
      })
      .sort((a: any, b: any) => {
        // Sort by date descending (most recent first)
        try {
          const da = new Date(`${a.date} ${a.time}`);
          const db = new Date(`${b.date} ${b.time}`);
          return db.getTime() - da.getTime();
        } catch {
          return 0;
        }
      });

    setAppointmentRecords(memberAppts);
  }, [member]);

  const handleAddManualRecord = () => {
    if (!recordTitle || !recordDate) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Please provide at least a title and date.",
      });
      return;
    }
    const newRecord: ManualRecord = {
      id: Date.now().toString(),
      title: recordTitle,
      description: recordDescription,
      date: recordDate,
      type: "manual",
      category: recordCategory,
    };

    const updated = [newRecord, ...manualRecords];
    setManualRecords(updated);
    localStorage.setItem(
      `mediflow_health_records_${id}`,
      JSON.stringify(updated)
    );

    setRecordTitle("");
    setRecordDescription("");
    setRecordDate("");
    setRecordCategory("checkup");
    setIsAdding(false);

    toast({
      title: "Record Saved",
      description: `"${recordTitle}" has been added to ${member?.name}'s health records.`,
    });
  };

  const handleDeleteManualRecord = (recordId: string) => {
    const updated = manualRecords.filter((r) => r.id !== recordId);
    setManualRecords(updated);
    localStorage.setItem(
      `mediflow_health_records_${id}`,
      JSON.stringify(updated)
    );
    toast({
      title: "Record Deleted",
      description: "The health record has been removed.",
    });
  };

  // Build a unified timeline of all records for search & filter
  const allTimelineItems = useMemo(() => {
    const items: any[] = [];

    manualRecords.forEach((r) => {
      items.push({
        ...r,
        source: "manual",
        sortDate: new Date(r.date),
      });
    });

    appointmentRecords.forEach((a) => {
      items.push({
        ...a,
        source: "auto",
        title: `Consultation with ${a.doctor}`,
        sortDate: new Date(`${a.date} ${a.time || ""}`),
      });
    });

    // Sort by date desc
    items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    return items;
  }, [manualRecords, appointmentRecords]);

  const filteredItems = useMemo(() => {
    let items = allTimelineItems;

    if (filterTab === "manual") items = items.filter((i) => i.source === "manual");
    if (filterTab === "auto") items = items.filter((i) => i.source === "auto");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.doctor && i.doctor.toLowerCase().includes(q)) ||
          (i.symptoms && i.symptoms.toLowerCase().includes(q)) ||
          (i.prescriptionData?.notes &&
            i.prescriptionData.notes.toLowerCase().includes(q))
      );
    }

    return items;
  }, [allTimelineItems, filterTab, searchQuery]);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "done")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full text-[10px] uppercase tracking-wider font-bold">
          Completed
        </Badge>
      );
    if (s === "confirmed")
      return (
        <Badge className="bg-sky-100 text-sky-700 border-sky-200 rounded-full text-[10px] uppercase tracking-wider font-bold">
          Confirmed
        </Badge>
      );
    if (s === "missed" || s === "cancelled")
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 rounded-full text-[10px] uppercase tracking-wider font-bold">
          {s === "cancelled" ? "Cancelled" : "Missed"}
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full text-[10px] uppercase tracking-wider font-bold">
        {status || "Scheduled"}
      </Badge>
    );
  };

  const getCategoryConfig = (category: string) => {
    return (
      RECORD_CATEGORIES.find((c) => c.value === category) ||
      RECORD_CATEGORIES[RECORD_CATEGORIES.length - 1]
    );
  };

  const getRelationIcon = (relation: string) => {
    const r = (relation || "").toLowerCase();
    if (r === "self") return <Shield className="h-6 w-6 text-primary" />;
    if (r.includes("elder") || r.includes("grandpa") || r.includes("grandma"))
      return <Heart className="h-6 w-6 text-rose-500" />;
    return <User className="h-6 w-6 text-primary" />;
  };

  if (!member) return null;

  const totalRecords =
    manualRecords.length + appointmentRecords.length;
  const completedVisits = appointmentRecords.filter(
    (a) =>
      a.status?.toLowerCase() === "completed" ||
      a.status?.toLowerCase() === "done"
  ).length;
  const prescriptionCount = appointmentRecords.filter(
    (a) => a.prescriptionId
  ).length;

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />
      <main className="flex-1 p-8 bg-slate-50">
        {/* Back Button + Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/patient/family")}
              className="rounded-full h-12 w-12 bg-white shadow-sm border"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-4xl font-headline font-bold text-primary mb-1">
                {member.name}&apos;s Health Records
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                {getRelationIcon(member.relation)}
                <span className="font-bold">{member.relation}</span>
                <span>•</span>
                <span>{member.age} Years Old</span>
                {member.gender && (
                  <>
                    <span>•</span>
                    <span>{member.gender}</span>
                  </>
                )}
                {member.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-rose-500">
                      {member.bloodGroup}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-12 px-6 rounded-xl font-bold gap-2"
              onClick={() => router.push("/dashboard/patient/appointments")}
            >
              <Calendar className="h-5 w-5" />
              Book Appointment
            </Button>
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6 rounded-xl font-bold gap-2">
                  <Plus className="h-5 w-5" />
                  Add Manual Record
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    New Health Record for {member.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Record Title *</Label>
                    <Input
                      placeholder="e.g. Blood Test Results, Annual Checkup"
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={recordCategory}
                        onValueChange={setRecordCategory}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECORD_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={recordDate}
                        onChange={(e) => setRecordDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description / Notes</Label>
                    <Textarea
                      placeholder="Add any relevant details, test results, doctor notes..."
                      value={recordDescription}
                      onChange={(e) =>
                        setRecordDescription(e.target.value)
                      }
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button
                    className="w-full h-12 mt-4 text-lg font-bold"
                    onClick={handleAddManualRecord}
                  >
                    Save Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRecords}</p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Total Records
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedVisits}</p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Completed Visits
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Pill className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{prescriptionCount}</p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Prescriptions
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{manualRecords.length}</p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Manual Records
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar and Filter Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records, doctors, symptoms..."
              className="pl-11 h-12 rounded-2xl border-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "auto", "manual"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all capitalize ${
                  filterTab === tab
                    ? "bg-primary border-primary text-white shadow-md"
                    : "bg-white border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {tab === "auto"
                  ? "Clinical Visits"
                  : tab === "manual"
                  ? "Manual Records"
                  : "All Records"}
                {" "}
                (
                {tab === "all"
                  ? allTimelineItems.length
                  : tab === "auto"
                  ? appointmentRecords.length
                  : manualRecords.length}
                )
              </button>
            ))}
          </div>
        </div>

        {/* Timeline / Records */}
        <div className="space-y-6 max-w-5xl">
          {filteredItems.length === 0 ? (
            <Card className="rounded-[2rem] border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="p-16 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-4">
                  <ClipboardList className="h-16 w-16 opacity-20" />
                  <p className="text-lg font-bold">
                    {searchQuery
                      ? "No records match your search."
                      : "No health records yet."}
                  </p>
                  <p className="text-sm max-w-md">
                    {searchQuery
                      ? "Try different keywords or clear the search."
                      : `Records will appear here when ${member.name} has completed appointments or you add manual records.`}
                  </p>
                  {!searchQuery && (
                    <div className="flex gap-3 mt-2">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setIsAdding(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Manual Record
                      </Button>
                      <Button
                        className="rounded-xl"
                        onClick={() =>
                          router.push("/dashboard/patient/appointments")
                        }
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Appointment
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item: any) => {
                if (item.source === "auto") {
                  // Clinical / Appointment Record
                  const isExpanded = expandedAppt === (item.id?.toString() || "");
                  const prescribedMeds = Array.isArray(item.prescriptionData?.medications)
                    ? item.prescriptionData.medications
                    : [];
                  return (
                    <Card
                      key={`auto-${item.id}`}
                      className="rounded-3xl border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-0">
                        {/* Header Row */}
                        <button
                          onClick={() =>
                            setExpandedAppt(
                              isExpanded ? null : item.id?.toString() || ""
                            )
                          }
                          className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold truncate">
                              Consultation with {item.doctor}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {item.date}
                              </span>
                              {item.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {item.time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {getStatusBadge(item.status)}
                            {item.prescriptionId && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] uppercase tracking-wider font-bold">
                                Rx Issued
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                            <div className="mt-4 bg-slate-50 p-5 rounded-2xl border-l-4 border-primary space-y-4">
                              {/* Symptoms */}
                              <div>
                                <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                  Symptoms / Notes
                                </p>
                                <p className="text-slate-700">
                                  {item.symptoms ||
                                    "No symptoms recorded during booking."}
                                </p>
                              </div>

                              {/* Doctor's Diagnosis */}
                              {item.prescriptionData ? (
                                <div className="space-y-4 pt-4 border-t border-slate-200">
                                  <div>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                      Doctor&apos;s Diagnosis
                                    </p>
                                    <p className="font-bold text-slate-800 text-lg">
                                      {item.prescriptionData.notes || "No diagnostic notes captured."}
                                    </p>
                                  </div>

                                  {/* Medications */}
                                  {prescribedMeds.length > 0 && (
                                      <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 mb-3">
                                          Prescribed Medications
                                        </p>
                                        <div className="grid gap-2">
                                          {prescribedMeds.map(
                                            (med: any) => (
                                              <div
                                                key={med.id || `${item.id}-${med.name || "med"}`}
                                                className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                                    <Pill className="h-5 w-5 text-orange-500" />
                                                  </div>
                                                  <div>
                                                    <p className="font-bold">
                                                      {med.name || "Unnamed Medicine"}{" "}
                                                      <span className="text-muted-foreground font-normal">
                                                        ({med.dosage || med.dose || "-"})
                                                      </span>
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                      {med.frequency || "As directed"} •{" "}
                                                      {med.duration || "As prescribed"}
                                                    </p>
                                                  </div>
                                                </div>
                                                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                  {med.timeLabel || "Not set"}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Prescription ID */}
                                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">
                                      Digital Prescription ID:{" "}
                                      <span className="text-primary">
                                        {item.prescriptionId}
                                      </span>
                                    </p>
                                    {item.prescriptionData.doctorName && (
                                      <p className="text-xs text-slate-400">
                                        Prescribed by{" "}
                                        <span className="font-bold text-slate-600">
                                          Dr. {item.prescriptionData.doctorName}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : item.prescriptionId ? (
                                <div className="pt-4 border-t border-slate-200">
                                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                    Digital Prescription Reference
                                  </p>
                                  <p className="font-mono text-primary font-bold">
                                    {item.prescriptionId}
                                  </p>
                                </div>
                              ) : null}

                              {/* Payment info */}
                              {item.fee && (
                                <div className="pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-400">
                                  <span className="uppercase font-bold tracking-widest">
                                    Consultation Fee:
                                  </span>
                                  <span className="font-bold text-slate-600">
                                    ₹{item.fee}
                                  </span>
                                  {item.paymentId && (
                                    <span className="ml-4 uppercase font-bold tracking-widest">
                                      Payment:{" "}
                                      <span className="text-emerald-600">
                                        {item.paymentId}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }

                // Manual Record
                const catConfig = getCategoryConfig(item.category || "other");
                const CatIcon = catConfig.icon;
                return (
                  <Card
                    key={`manual-${item.id}`}
                    className="rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`h-12 w-12 rounded-2xl ${catConfig.color} flex items-center justify-center shrink-0`}
                          >
                            <CatIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{item.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {item.date}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] uppercase font-bold"
                              >
                                {catConfig.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-xl"
                          onClick={() => handleDeleteManualRecord(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {item.description && (
                        <div className="bg-slate-50 p-4 rounded-2xl leading-relaxed text-sm text-slate-600 ml-16">
                          {item.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
