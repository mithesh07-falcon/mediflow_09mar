"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ReceiptText, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { PaymentReceipt, loadPaymentReceipts } from "@/lib/elderly-portal";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ElderlyPaymentHistoryPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);

  useEffect(() => {
    setReceipts(loadPaymentReceipts());
  }, []);

  const totalSpent = useMemo(() => receipts.reduce((sum, item) => sum + item.amount, 0), [receipts]);

  const downloadReceipt = (receipt: PaymentReceipt) => {
    const text = [
      "MediFlow Payment Receipt",
      `Receipt ID: ${receipt.id}`,
      `Shop: ${receipt.shop}`,
      `Amount: INR ${receipt.amount}`,
      `Method: ${receipt.method}`,
      `Status: ${receipt.status}`,
      `Paid At: ${formatDate(receipt.createdAt)}`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${receipt.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 space-y-8">
      <Button
        className="h-24 px-12 text-4xl font-black bg-black text-white rounded-[2rem] border-[8px] border-black flex items-center gap-6"
        onClick={() => router.push("/dashboard/elderly")}
      >
        <ArrowLeft className="h-10 w-10" /> GO HOME
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-7xl font-black uppercase tracking-tight">Payment Receipts</h1>
          <p className="text-2xl font-bold text-slate-500">All Scan-to-Pay transactions are saved here.</p>
        </div>
        <div className="bg-black text-white rounded-[1.5rem] p-6 border-[6px] border-black flex items-center gap-4 w-fit">
          <Wallet className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold uppercase opacity-80">Total spent</p>
            <p className="text-4xl font-black">INR {totalSpent}</p>
          </div>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="p-10 border-[6px] border-dashed border-black rounded-[2rem] text-center">
          <ReceiptText className="h-12 w-12 mx-auto mb-3" />
          <p className="text-3xl font-black uppercase">No receipts yet</p>
          <p className="text-xl font-bold text-slate-500 mt-2">Make a payment from Scan-to-Pay to generate receipts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="p-6 border-[6px] border-black rounded-[1.5rem] bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-3xl font-black uppercase">{receipt.shop}</p>
                <p className="text-lg font-bold text-slate-600">{formatDate(receipt.createdAt)}</p>
                <p className="text-lg font-bold text-slate-600">Receipt ID: {receipt.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-4xl font-black">INR {receipt.amount}</p>
                <Button
                  className="h-14 px-6 text-xl font-black border-4 border-black rounded-xl bg-black text-white"
                  onClick={() => downloadReceipt(receipt)}
                >
                  <Download className="h-5 w-5 mr-2" /> DOWNLOAD
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
