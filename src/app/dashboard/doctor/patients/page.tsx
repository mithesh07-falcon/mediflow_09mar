
"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Stethoscope,
  Search,
  User,
  History,
  Activity,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorAppts, setDoctorAppts] = useState<any[]>([]);

  useEffect(() => {
    const fetchMyPatients = () => {
      const userStr = localStorage.getItem("mediflow_current_user");
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");
      // Filter by doctor email to ensure data isolation
      const myAppts = savedAppts.filter((a: any) =>
        a.doctorEmail?.toLowerCase() === user.email?.toLowerCase()
      );
      setDoctorAppts(myAppts);
    };

    fetchMyPatients();
    // Poll for new appointments every 5 seconds to ensure real-time sync with patient booking
    const interval = setInterval(fetchMyPatients, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPatients = doctorAppts.filter(p =>
    p.patient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDiagnose = (patientId: string) => {
    router.push(`/dashboard/doctor/diagnose/${patientId}`);
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="doctor" />

      <main className="flex-1 p-8 bg-background">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary mb-1">My Patient Registry</h1>
            <p className="text-muted-foreground">Manage your specific clinical queue.</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in my queue..."
              className="pl-10 h-10 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-primary text-white pb-8">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <CardTitle>Authorized Patient Queue</CardTitle>
            </div>
            <CardDescription className="text-white/80">Patients currently scheduled for your specialization.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="pl-8 py-6">Patient Details</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Symptoms Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                      No matching patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((apt) => (
                    <TableRow key={apt.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="pl-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold">{apt.patient}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{apt.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{apt.date} • {apt.time}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{apt.symptoms || "General checkup"}</TableCell>
                      <TableCell>
                        <Badge variant={apt.status === 'Arrived' ? 'default' : 'secondary'} className="rounded-full px-4">
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                          {apt.status === 'Arrived' ? (
                            <Button
                              className="rounded-xl bg-primary hover:bg-primary/90"
                              size="sm"
                              onClick={() => handleDiagnose(apt.id)}
                            >
                              <Stethoscope className="h-4 w-4 mr-2" /> Diagnose
                            </Button>
                          ) : (
                            <Badge variant="outline" className="h-9 px-4">Awaiting Check-in</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
