"use client";

import { useEffect, useMemo, useState } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRoleGuard } from "@/hooks/use-role-guard";
import {
  FileText,
  Pill,
  Search,
  Download,
  User,
  Calendar,
} from "lucide-react";

type DoctorPrescriptionRecord = {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  notes: string;
  medications: Array<{ id?: string; name?: string; dosage?: string; duration?: string; timeLabel?: string }>;
};

function safeParseArray<T = any>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DoctorMedicationReportPage() {
  useRoleGuard("doctor");

  const [reports, setReports] = useState<DoctorPrescriptionRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const currentUserRaw = localStorage.getItem("mediflow_current_user") || "{}";
    let currentUser: any = {};
    try {
      currentUser = JSON.parse(currentUserRaw);
    } catch {
      currentUser = {};
    }

    const allPrescriptions = safeParseArray<any>("mediflow_prescriptions");

    const normalized: DoctorPrescriptionRecord[] = allPrescriptions
      .filter((rx) => String(rx?.doctorEmail || "").toLowerCase() === String(currentUser?.email || "").toLowerCase())
      .map((rx, index) => ({
        id: String(rx?.id || `RX-${index + 1}`),
        patientName: String(rx?.patientName || "Unknown Patient"),
        doctorName: String(rx?.doctorName || currentUser?.firstName || "Unknown Doctor"),
        date: String(rx?.date || "No date"),
        notes: String(rx?.notes || "No clinical notes."),
        medications: Array.isArray(rx?.medications) ? rx.medications : [],
      }));

    setReports(normalized);
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      return (
        r.id.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  const totalMeds = useMemo(
    () => reports.reduce((sum, r) => sum + (Array.isArray(r.medications) ? r.medications.length : 0), 0),
    [reports]
  );

  const downloadReport = (report: DoctorPrescriptionRecord) => {
    const lines = [
      `MediFlow Doctor Medication Report`,
      `Report ID: ${report.id}`,
      `Patient: ${report.patientName}`,
      `Doctor: ${report.doctorName}`,
      `Date: ${report.date}`,
      `Diagnosis Notes: ${report.notes}`,
      "",
      "Medications:",
      ...(report.medications.length > 0
        ? report.medications.map((m, idx) =>
            `${idx + 1}. ${m.name || "Unnamed"} | ${m.dosage || "-"} | ${m.duration || "As prescribed"} | ${m.timeLabel || "Not set"}`
          )
        : ["No medications listed."]),
    ].join("\n");

    createDownload(lines, `${report.id}-doctor-medication-report.txt`);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="doctor" />

      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary">Medication Reports</h1>
            <p className="text-muted-foreground">Doctor-side report view for issued prescriptions.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Reports</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <Pill className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalMeds}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Medication Entries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <Calendar className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{reports[0]?.date || "-"}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Latest Report Date</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11 rounded-xl"
            placeholder="Search reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Issued Medication Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="p-10 border-2 border-dashed rounded-2xl text-center text-muted-foreground">
                No medication reports found.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="p-4 rounded-xl border bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-black text-lg">{report.id}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{report.patientName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{report.date}</p>
                    <Badge variant="outline" className="text-[10px]">Dr. {report.doctorName}</Badge>
                  </div>
                  <Button className="rounded-xl" onClick={() => downloadReport(report)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
