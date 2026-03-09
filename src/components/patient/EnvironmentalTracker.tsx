"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wind, Thermometer, AlertTriangle, MapPin, Loader2 } from "lucide-react";
import { getClimateAdvisory, AIClimateAdvisoryOutput } from "@/ai/flows/ai-climate-advisory";

export function EnvironmentalTracker() {
  const [advisory, setAdvisory] = useState<AIClimateAdvisoryOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const data = await getClimateAdvisory({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setAdvisory(data);
          } catch (error) {
            console.error("Failed to load climate data", error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error", error);
          // Fallback location (e.g., Delhi, India) if user denies permission
          getClimateAdvisory({ latitude: 28.6139, longitude: 77.2090 }).then(data => {
            setAdvisory(data);
            setLoading(false);
          });
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden mb-10 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 font-bold text-muted-foreground uppercase tracking-wider">Analyzing Local Climate...</span>
      </Card>
    );
  }

  if (!advisory) return null;

  return (
    <div className="space-y-6 mb-10 flex flex-col items-stretch">
      <Card className="rounded-[2rem] border-[1px] shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

            <div className="flex items-center gap-6">
              <div className="bg-primary/10 w-24 h-24 rounded-2xl flex flex-col items-center justify-center text-center shrink-0">
                <Wind className="h-8 w-8 text-primary mb-2" />
                <span className="text-[10px] font-black uppercase text-primary leading-tight px-1">{advisory.condition}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" /> Current Air Quality
                </p>
                <div className="flex items-end gap-3">
                  <h4 className="text-2xl font-black">{advisory.aqiStatus}</h4>
                </div>
                <p className="text-xl font-bold mt-1 text-slate-500">{advisory.temperature}</p>
              </div>
              <div className="border-l pl-6 shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pollen Level</p>
                <h4 className={`text-2xl font-black ${advisory.pollenStatus.toLowerCase().includes('high') ? 'text-red-500' : 'text-orange-500'}`}>
                  {advisory.pollenStatus}
                </h4>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800 p-5 rounded-2xl border border-dashed hover:bg-slate-100 transition-colors">
              <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Thermometer className="h-5 w-5 text-primary" /> Personalized Climate Advisory
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                {advisory.advisoryList.map((tip, idx) => (
                  <li key={idx} className="font-medium text-slate-600 dark:text-slate-400">{tip}</li>
                ))}
              </ul>
            </div>

          </div>
        </CardContent>
      </Card>

      {advisory.hasAlert && advisory.alertMessage && (
        <Alert variant="default" className="bg-red-50 dark:bg-red-500/10 rounded-2xl border-2 border-red-200 dark:border-red-900/50 animate-in slide-in-from-top-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <AlertTitle className="font-black text-red-800 dark:text-red-400 text-lg uppercase tracking-tight">Extreme Weather Warning</AlertTitle>
          <AlertDescription className="text-sm font-bold text-red-700 dark:text-red-300/80 mt-1">
            {advisory.alertMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
