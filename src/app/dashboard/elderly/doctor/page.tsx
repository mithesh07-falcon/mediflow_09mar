
"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, User, Stethoscope } from "lucide-react";
import { useEffect } from "react";

export default function ElderlyDoctorPage() {
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (!user.isElderly) router.push("/dashboard/patient");
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-black p-10 space-y-16">
      <Button 
        className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8"
        onClick={() => router.push('/dashboard/elderly')}
      >
        <ArrowLeft className="h-16 w-16" />
        GO HOME
      </Button>

      <h1 className="text-8xl font-black uppercase underline decoration-[12px]">Primary Doctor</h1>

      <div className="p-16 border-[12px] border-black rounded-[5rem] space-y-16">
        <div className="flex items-center gap-16">
          <div className="h-64 w-64 bg-black text-white rounded-[4rem] flex items-center justify-center">
            <User className="h-40 w-40" />
          </div>
          <div className="space-y-4">
            <h2 className="text-7xl font-black">DR. ANAND SMITH</h2>
            <p className="text-4xl font-bold opacity-60 flex items-center gap-6">
              <Stethoscope className="h-12 w-12" /> Cardiology Specialist
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          <Button className="h-48 text-7xl font-black bg-black text-white rounded-[4rem] border-[12px] border-black shadow-2xl flex items-center justify-center gap-12 hover:bg-zinc-800">
            <Phone className="h-24 w-24" />
            CALL NOW
          </Button>
          
          <div className="p-12 bg-white border-[8px] border-black rounded-[4rem]">
            <h4 className="text-4xl font-black uppercase mb-6">Clinic Address</h4>
            <p className="text-4xl font-bold leading-relaxed uppercase">
              MediFlow Central Clinic<br />
              123 Medical Square, Apollo Road<br />
              Bangalore, KA 560001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
