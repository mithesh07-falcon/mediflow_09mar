
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Search, ClipboardList } from "lucide-react";

export default function PrescriptionScanPage() {
  return (
    <div className="flex min-h-screen">
      <SidebarNav role="pharmacist" />
      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-primary">Prescription Hub</h1>
          <p className="text-muted-foreground">Verify digital orders from clinicians.</p>
        </header>

        <div className="max-w-2xl mx-auto space-y-8 mt-12">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <CardContent className="flex flex-col items-center gap-8 py-8">
               <div className="h-48 w-48 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center justify-center">
                  <QrCode className="h-24 w-24 text-primary opacity-40" />
               </div>
               <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Scan Prescription QR</h3>
                  <p className="text-sm text-muted-foreground">Place the patient's device QR code in front of the scanner.</p>
               </div>
               <div className="w-full flex items-center gap-4">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs font-bold text-muted-foreground uppercase">Or Manual Entry</span>
                  <div className="h-px bg-border flex-1" />
               </div>
               <div className="w-full space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter RX ID (e.g. RX-9021)" className="pl-10 h-12 rounded-xl" />
                  </div>
                  <Button className="w-full h-12 rounded-xl">Verify & Fetch Order</Button>
               </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
