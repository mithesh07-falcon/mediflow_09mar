
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PharmacistBillingPage() {
  const transactions = [
    { id: "T-9921", patient: "Sarah Johnson", amount: "₹300.00", date: "Oct 24, 2024", method: "UPI" },
    { id: "T-9922", patient: "John Doe", amount: "₹1,250.00", date: "Oct 24, 2024", method: "Cash" },
  ];

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="pharmacist" />
      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-primary">Dispensing Transactions</h1>
          <p className="text-muted-foreground">Financial records for fulfilled prescriptions.</p>
        </header>

        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
           <Table>
             <TableHeader className="bg-muted/50">
               <TableRow>
                 <TableHead>Transaction ID</TableHead>
                 <TableHead>Patient</TableHead>
                 <TableHead>Amount</TableHead>
                 <TableHead>Method</TableHead>
                 <TableHead>Date</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {transactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{t.id}</TableCell>
                    <TableCell>{t.patient}</TableCell>
                    <TableCell className="font-bold">{t.amount}</TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
             </TableBody>
           </Table>
        </Card>
      </main>
    </div>
  );
}
