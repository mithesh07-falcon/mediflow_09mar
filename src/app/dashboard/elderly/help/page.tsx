"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, Pill, Stethoscope, Home, PlayCircle, CheckCircle2 } from "lucide-react";

export default function ElderlyHelpPage() {
  const router = useRouter();
  const [guideMode, setGuideMode] = useState(false);
  const [step, setStep] = useState(0);

  const tutorialSteps = useMemo(
    () => [
      "Tap MY PILLS to mark medicines as taken.",
      "Tap WHAT'S NEXT to see appointments and schedule.",
      "Tap SOS only in emergency to alert your guardian.",
      "Use the MIC button and say commands in your language.",
    ],
    []
  );

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

      <div className="p-8 border-[6px] border-black rounded-[2rem] bg-slate-50 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-4xl font-black uppercase">Tutorial Mode</h2>
          <Button
            className="h-16 px-8 text-2xl font-black bg-black text-white border-4 border-black rounded-xl"
            onClick={() => {
              setGuideMode(true);
              setStep(0);
            }}
          >
            <PlayCircle className="h-6 w-6 mr-2" /> START GUIDE
          </Button>
        </div>

        {guideMode && (
          <div className="space-y-4">
            <div className="p-6 bg-white border-4 border-black rounded-xl">
              <p className="text-2xl font-black uppercase text-slate-500">Step {step + 1} of {tutorialSteps.length}</p>
              <p className="text-3xl font-black mt-2">{tutorialSteps[step]}</p>
            </div>
            <div className="flex gap-3">
              <Button
                className="h-14 px-6 text-xl font-black border-4 border-black rounded-xl bg-white text-black"
                onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                disabled={step === 0}
              >
                PREVIOUS
              </Button>
              {step < tutorialSteps.length - 1 ? (
                <Button
                  className="h-14 px-6 text-xl font-black border-4 border-black rounded-xl bg-black text-white"
                  onClick={() => setStep((prev) => Math.min(tutorialSteps.length - 1, prev + 1))}
                >
                  NEXT
                </Button>
              ) : (
                <Button
                  className="h-14 px-6 text-xl font-black border-4 border-black rounded-xl bg-green-600 text-white"
                  onClick={() => {
                    setGuideMode(false);
                    localStorage.setItem("mediflow_elderly_tutorial_seen", "true");
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" /> FINISH
                </Button>
              )}
            </div>
          </div>
        )}
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
