
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope, ChevronRight, Activity, Calendar } from "lucide-react";
import { aiDoctorRecommendation, type AIDoctorRecommendationOutput } from "@/ai/flows/ai-doctor-recommendation";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function AIDoctorRecommender() {
  const router = useRouter();
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDoctorRecommendationOutput | null>(null);
  const [error, setError] = useState(false);

  const handleRecommendation = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      const response = await aiDoctorRecommendation({ symptoms });
      setResult(response);
      setError(false);
    } catch (e) {
      console.error("AI Error:", e);
      setError(true);
      toast({
        variant: "destructive",
        title: "Clinical Concierge Offline",
        description: "Our AI is currently being synchronized. You can still book your consultation manually."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualBooking = () => {
    localStorage.setItem("mediflow_last_symptom_analysis", JSON.stringify({
      specialist: "all",
      description: symptoms
    }));
    router.push("/dashboard/patient/appointments");
  };

  const handleBookConsultation = () => {
    // Store recommended symptom context for the booking page
    if (result) {
      localStorage.setItem("mediflow_last_symptom_analysis", JSON.stringify({
        specialist: result.recommendedSpecialist,
        description: symptoms
      }));
    }
    router.push("/dashboard/patient/appointments");
  };

  return (
    <Card className="w-full rounded-[2rem] border-primary/10 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2 text-primary">
          <Activity className="h-6 w-6" />
          <CardTitle>AI Symptom Analysis</CardTitle>
        </div>
        <CardDescription>
          Tell us how you feel. Our AI will guide you to the right clinical specialist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Describe your symptoms (e.g., 'Persistent cough for 3 days...')"
          className="min-h-[120px] resize-none rounded-2xl border-2 focus:border-primary/50"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <Button
          className="w-full py-6 text-lg rounded-xl shadow-lg shadow-primary/20"
          disabled={loading || !symptoms.trim()}
          onClick={handleRecommendation}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Check Symptoms"
          )}
        </Button>

        {result && (
          <div className="mt-6 p-6 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-xl">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-headline font-bold text-primary mb-1">
                  Suggesting: {result.recommendedSpecialist}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.reason}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button variant="default" className="rounded-xl px-6 bg-primary hover:bg-primary/90" onClick={handleBookConsultation}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Consultation
                  </Button>
                  <Button variant="outline" className="rounded-xl px-6" onClick={handleManualBooking}>
                    Select Manually
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                AI is currently synchronizing. Select specialist manually?
              </p>
              <Button variant="outline" size="sm" className="rounded-lg border-red-200 text-red-700" onClick={handleManualBooking}>
                Manual Selection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
