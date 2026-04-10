"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, Pill, Stethoscope, Home } from "lucide-react";

export default function ElderlyHelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black p-10 space-y-12">
      <Button
        className="h-24 px-12 text-4xl font-black bg-black text-white rounded-[2rem] border-[8px] border-black flex items-center gap-6"
        onClick={() => router.push("/dashboard/elderly")}
      >
        <ArrowLeft className="h-10 w-10" />
        GO HOME
      </Button>

      <div className="space-y-4">
        <h1 className="text-7xl font-black uppercase tracking-tight">Help</h1>
        <p className="text-3xl font-bold text-slate-600">Use voice commands with one tap on the mic button.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="p-8 border-[6px] border-black rounded-[2rem] bg-slate-50 flex items-center gap-6">
          <Mic className="h-12 w-12" />
          <div>
            <p className="text-3xl font-black">"முகப்பு"</p>
            <p className="text-xl font-bold text-slate-600">Open Home Page</p>
          </div>
        </div>

        <div className="p-8 border-[6px] border-black rounded-[2rem] bg-slate-50 flex items-center gap-6">
          <Stethoscope className="h-12 w-12" />
          <div>
            <p className="text-3xl font-black">"மருத்துவர்"</p>
            <p className="text-xl font-bold text-slate-600">Open Doctor Section</p>
          </div>
        </div>

        <div className="p-8 border-[6px] border-black rounded-[2rem] bg-slate-50 flex items-center gap-6">
          <Pill className="h-12 w-12" />
          <div>
            <p className="text-3xl font-black">"மருந்துகள்"</p>
            <p className="text-xl font-bold text-slate-600">Open Medicines Page</p>
          </div>
        </div>

        <div className="p-8 border-[6px] border-black rounded-[2rem] bg-slate-50 flex items-center gap-6">
          <Home className="h-12 w-12" />
          <div>
            <p className="text-3xl font-black">"உதவி"</p>
            <p className="text-xl font-bold text-slate-600">Open this Help Section</p>
          </div>
        </div>
      </div>
    </div>
  );
}
