
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Download, 
  FileText, 
  Search,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { Input } from "@/components/ui/input";

const MOCK_BILLING = [
  { id: "INV-8821", date: "Oct 24, 2024", doctor: "Dr. Smith (Neurology)", amount: "₹300.00", status: "Paid", method: "UPI" },
  { id: "INV-8822", date: "Oct 20, 2024", doctor: "Dr. Jones (Gastro)", amount: "₹300.00", status: "Paid", method: "QR Scan" },
  { id: "INV-8823", date: "Oct 12, 2024", doctor: "Lab Diagnostics", amount: "₹1,250.00", status: "Paid", method: "Card" },
];

export default function BillingHistoryPage() {
  return (
    <div className="flex min-h-screen">
      <SidebarNav role="patient" />
      
      <main className="flex-1 p-8 bg-background">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-bold text-primary mb-1">Billing & Receipts</h1>
          <p className="text-muted-foreground">Download and manage your clinical payment history.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <Card className="rounded-3xl shadow-sm border-none bg-primary/5">
              <CardContent className="pt-6">
                 <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Spent (Oct)</div>
                 <div className="text-3xl font-bold text-primary">₹1,850.00</div>
              </CardContent>
           </Card>
           <Card className="rounded-3xl shadow-sm border-none">
              <CardContent className="pt-6">
                 <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Active Insurances</div>
                 <div className="text-3xl font-bold">1 Plan</div>
              </CardContent>
           </Card>
           <Card className="rounded-3xl shadow-sm border-none">
              <CardContent className="pt-6">
                 <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Reward Points</div>
                 <div className="text-3xl font-bold">420</div>
              </CardContent>
           </Card>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
           <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-8 px-10">
              <div>
                 <CardTitle className="text-xl">Invoices & Statements</CardTitle>
                 <CardDescription>All clinical payments are processed in INR.</CardDescription>
              </div>
              <div className="relative w-64">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Search invoice #" className="pl-10 h-10 rounded-xl" />
              </div>
           </CardHeader>
           <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-10">Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Service / Clinician</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-10">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {MOCK_BILLING.map(bill => (
                     <TableRow key={bill.id}>
                       <TableCell className="pl-10 font-bold">{bill.id}</TableCell>
                       <TableCell>{bill.date}</TableCell>
                       <TableCell>{bill.doctor}</TableCell>
                       <TableCell className="font-bold">{bill.amount}</TableCell>
                       <TableCell>{bill.method}</TableCell>
                       <TableCell>
                          <Badge className="bg-green-100 text-green-700 border-none rounded-full px-4">
                             <CheckCircle2 className="h-3 w-3 mr-2" /> {bill.status}
                          </Badge>
                       </TableCell>
                       <TableCell className="text-right pr-10">
                          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                             <Download className="h-4 w-4" />
                          </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
           </CardContent>
        </Card>
      </main>
    </div>
  );
}
