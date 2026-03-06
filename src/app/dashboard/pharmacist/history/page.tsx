
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, Download, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DispensingHistoryPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem("mediflow_dispensing_history");
        if (saved) {
            setLogs(JSON.parse(saved));
        }
    }, []);

    const filtered = logs.filter(log =>
        log.patientName.toLowerCase().includes(search.toLowerCase()) ||
        log.rxId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex min-h-screen">
            <SidebarNav role="pharmacist" />
            <main className="flex-1 p-8 bg-slate-50">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <History className="h-8 w-8 text-primary" />
                            <h1 className="text-5xl font-headline font-bold text-primary tracking-tight">Dispensing Logs</h1>
                        </div>
                        <p className="text-muted-foreground text-lg">Detailed clinical transaction history and audit trail.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative w-80">
                            <Search className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by Patient or RX-ID..."
                                className="pl-12 h-14 rounded-2xl border-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-14 rounded-2xl font-bold bg-white">
                            <Download className="h-5 w-5 mr-3" /> Export CSV
                        </Button>
                    </div>
                </header>

                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b-2">
                            <TableRow>
                                <TableHead className="pl-10 py-10 uppercase tracking-widest text-xs font-black">Transaction Details</TableHead>
                                <TableHead className="uppercase tracking-widest text-xs font-black">Recipient</TableHead>
                                <TableHead className="uppercase tracking-widest text-xs font-black">Itemized Regimen</TableHead>
                                <TableHead className="uppercase tracking-widest text-xs font-black text-right">Settled Amount</TableHead>
                                <TableHead className="uppercase tracking-widest text-xs font-black text-center">Audit Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic">
                                        No dispensing history found. Perform a dispensation to generate logs.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((log, i) => (
                                <TableRow key={i} className="hover:bg-primary/5 transition-colors group">
                                    <TableCell className="pl-10 py-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-tighter bg-primary/5 border-primary/20">{log.id}</Badge>
                                        </div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> {log.date}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-black text-xl tracking-tight uppercase">{log.patientName}</p>
                                        <p className="text-xs font-bold text-muted-foreground">RX-ID: {log.rxId}</p>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                        <div className="flex flex-wrap gap-1">
                                            {log.items.map((item: any, idx: number) => (
                                                <Badge key={idx} variant="secondary" className="text-[9px] font-bold py-0">{item.name}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-2xl text-primary tracking-tighter">
                                        ₹{log.totalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="rounded-full px-6 py-2 font-black uppercase text-[10px] tracking-widest bg-green-100 text-green-800 border-none">
                                            Verified
                                        </Badge>
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
