"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Contrast, Type, Volume2, Orbit } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AccessibilitySettings,
  applyAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from "@/lib/elderly-portal";

export default function ElderlyAccessibilityPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AccessibilitySettings>({
    textScale: 100,
    highContrast: false,
    voiceRate: 1,
    reduceMotion: false,
  });

  useEffect(() => {
    const loaded = loadAccessibilitySettings();
    setSettings(loaded);
    applyAccessibilitySettings(loaded);
  }, []);

  const updateSettings = (next: AccessibilitySettings) => {
    setSettings(next);
    saveAccessibilitySettings(next);
    applyAccessibilitySettings(next);
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 space-y-10">
      <Button
        className="h-24 px-12 text-4xl font-black bg-black text-white rounded-[2rem] border-[8px] border-black flex items-center gap-6"
        onClick={() => router.push("/dashboard/elderly")}
      >
        <ArrowLeft className="h-10 w-10" /> GO HOME
      </Button>

      <h1 className="text-7xl font-black uppercase tracking-tight">Accessibility Settings</h1>
      <p className="text-2xl font-bold text-slate-500">Make reading, listening, and tapping easier.</p>

      <div className="space-y-6">
        <div className="p-8 border-[6px] border-black rounded-[2rem] space-y-6">
          <div className="flex items-center gap-4">
            <Type className="h-8 w-8" />
            <h2 className="text-4xl font-black uppercase">Text Size</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {[100, 115, 130].map((scale) => (
              <Button
                key={scale}
                className={`h-16 px-8 text-2xl font-black border-4 rounded-2xl ${
                  settings.textScale === scale ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"
                }`}
                onClick={() => updateSettings({ ...settings, textScale: scale })}
              >
                {scale}%
              </Button>
            ))}
          </div>
        </div>

        <div className="p-8 border-[6px] border-black rounded-[2rem] space-y-6">
          <div className="flex items-center gap-4">
            <Volume2 className="h-8 w-8" />
            <h2 className="text-4xl font-black uppercase">Voice Speed</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Slow", value: 0.8 },
              { label: "Normal", value: 1 },
              { label: "Fast", value: 1.2 },
            ].map((item) => (
              <Button
                key={item.label}
                className={`h-16 px-8 text-2xl font-black border-4 rounded-2xl ${
                  settings.voiceRate === item.value ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"
                }`}
                onClick={() => updateSettings({ ...settings, voiceRate: item.value })}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            className={`p-8 border-[6px] rounded-[2rem] text-left transition-all ${
              settings.highContrast ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"
            }`}
            onClick={() => updateSettings({ ...settings, highContrast: !settings.highContrast })}
          >
            <div className="flex items-center gap-4 mb-2">
              <Contrast className="h-8 w-8" />
              <h3 className="text-3xl font-black uppercase">High Contrast</h3>
            </div>
            <p className="text-xl font-bold opacity-70">Stronger color contrast for easier reading.</p>
          </button>

          <button
            className={`p-8 border-[6px] rounded-[2rem] text-left transition-all ${
              settings.reduceMotion ? "bg-black text-white border-black" : "bg-white text-black border-slate-200"
            }`}
            onClick={() => updateSettings({ ...settings, reduceMotion: !settings.reduceMotion })}
          >
            <div className="flex items-center gap-4 mb-2">
              <Orbit className="h-8 w-8" />
              <h3 className="text-3xl font-black uppercase">Reduce Motion</h3>
            </div>
            <p className="text-xl font-bold opacity-70">Limits animation for comfort.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
