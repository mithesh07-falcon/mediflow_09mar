
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Search, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { MOCK_MEDICINES } from "../mockData";

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mediflow_medicines");
    if (saved) {
      setStock(JSON.parse(saved));
    } else {
      setStock(MOCK_MEDICINES);
    }
  }, []);

  const filtered = stock.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (q: number) => {
    if (q === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (q < 50) return { label: "Critical", variant: "destructive" as const };
    if (q < 100) return { label: "Low Stock", variant: "outline" as const };
    return { label: "Healthy", variant: "secondary" as const };
  };

  const totalValue = stock.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
  const lowCount = stock.filter(m => m.stock < 100).length;

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="pharmacist" />
      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-headline font-bold text-primary mb-1">Stock Repository</h1>
            <p className="text-muted-foreground text-lg">Centralized inventory control and clinical pricing.</p>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search catalog by name or category..."
              className="pl-12 h-14 rounded-2xl shadow-sm border-2 focus:ring-4 focus:ring-primary/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <CardContent className="p-0">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Total SKUs</div>
              <div className="text-4xl font-black">{stock.length} Items</div>
            </CardContent>
          </Card>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <CardContent className="p-0">
              <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Restock Alerts</div>
              <div className="text-4xl font-black">{lowCount} Categories</div>
            </CardContent>
          </Card>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 border-l-8 border-green-500">
            <CardContent className="p-0">
              <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Stock Value</div>
              <div className="text-4xl font-black">₹{(totalValue / 100000).toFixed(2)}L</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 border-b-2">
              <TableRow>
                <TableHead className="pl-10 py-10 uppercase tracking-widest text-xs font-black">Medication Info</TableHead>
                <TableHead className="uppercase tracking-widest text-xs font-black">Inv Group</TableHead>
                <TableHead className="uppercase tracking-widest text-xs font-black text-right">Availability</TableHead>
                <TableHead className="uppercase tracking-widest text-xs font-black text-right">Unit Price</TableHead>
                <TableHead className="uppercase tracking-widest text-xs font-black text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, i) => {
                const status = getStatus(item.stock);
                return (
                  <TableRow key={i} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="pl-10 py-8">
                      <p className="font-black text-xl group-hover:text-primary transition-colors tracking-tight uppercase">{item.name}</p>
                      <p className="text-xs font-bold text-muted-foreground italic">{item.manufacturer}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-black px-4 py-1 rounded-lg uppercase text-[10px] tracking-widest">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">{item.stock} Units</TableCell>
                    <TableCell className="text-right font-black text-xl text-primary tracking-tight">₹{item.price}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.variant} className="rounded-full px-6 py-2 font-black uppercase text-[10px] tracking-widest">
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
