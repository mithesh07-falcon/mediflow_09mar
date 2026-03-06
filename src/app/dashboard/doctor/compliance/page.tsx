
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, User, CheckCircle2, AlertCircle } from "lucide-react";

export default function ComplianceMonitorPage() {
  const complianceData = [
    { name: "Sarah Johnson", status: "Compliant", rate: "100%", lastDose: "08:00 AM" },
    { name: "James Wilson", status: "Missed Dose", rate: "85%", lastDose: "Yesterday" },
    { name: "Lily Brown", status: "Compliant", rate: "95%", lastDose: "12:00 PM" },
  ];

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="doctor" />
      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-primary">Patient Compliance Monitor</h1>
          <p className="text-muted-foreground">Real-time adherence tracking for active prescriptions.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complianceData.map((patient, i) => (
            <Card key={i} className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className={patient.status === 'Compliant' ? 'bg-green-50' : 'bg-red-50'}>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <User className="h-4 w-4 text-muted-foreground" />
                     <CardTitle className="text-base">{patient.name}</CardTitle>
                   </div>
                   <Badge variant={patient.status === 'Compliant' ? 'default' : 'destructive'}>
                     {patient.status}
                   </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <div className="flex justify-between items-end">
                    <div>
                       <div className="text-xs text-muted-foreground uppercase">Adherence Rate</div>
                       <div className="text-2xl font-bold">{patient.rate}</div>
                    </div>
                    <Activity className="h-8 w-8 text-primary/20" />
                 </div>
                 <div className="text-sm text-muted-foreground">
                   Last recorded dose: <span className="font-bold">{patient.lastDose}</span>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
