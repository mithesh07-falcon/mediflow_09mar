
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wind, Thermometer, AlertTriangle, Search } from "lucide-react";

export function EnvironmentalTracker() {
  const [symptom, setSymptom] = useState("");
  const showWarning = symptom.toLowerCase().includes("asthma") || symptom.toLowerCase().includes("cough");

  return (
    <div className="space-y-6 mb-10">
      <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex items-center gap-6">
              <div className="bg-primary/10 p-4 rounded-2xl">
                <Wind className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Air Quality Index</p>
                <h4 className="text-2xl font-bold">AQI 95 (Moderate)</h4>
              </div>
              <div className="border-l pl-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pollen Level</p>
                <h4 className="text-2xl font-bold text-orange-500">High</h4>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Check symptoms for environmental correlation..." 
                className="pl-10 h-12 rounded-xl border-2"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {showWarning && (
        <Alert variant="destructive" className="rounded-2xl border-2 animate-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Environmental Risk Detected</AlertTitle>
          <AlertDescription className="text-sm font-medium">
            Warning: High pollen count detected. This correlates with your reported "{symptom}". 
            <strong className="block mt-1">Recommended: Stay indoors until 5 PM and maintain clinical ventilation.</strong>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
