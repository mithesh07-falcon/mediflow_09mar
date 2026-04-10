"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope, Activity, Calendar, Mic, MicOff, Camera, Square, Sparkles, Check } from "lucide-react";
import { aiDoctorRecommendation, type AIDoctorRecommendationOutput } from "@/ai/flows/ai-doctor-recommendation";
import { detectBodyPart } from "@/ai/flows/ai-body-part-detection";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { captureVideoFrameForServerAction } from "@/lib/image-payload";
import { cn } from "@/lib/utils";

export function AIDoctorRecommender() {
  const router = useRouter();
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDoctorRecommendationOutput | null>(null);
  const [error, setError] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userLang, setUserLang] = useState("English");
  
  // Visual Scanning State
  const [mode, setMode] = useState<"text" | "scan">("text");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const stopFlagRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const [detectedSymptoms, setDetectedSymptoms] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("mediflow_current_user");
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.language) setUserLang(user.language);
    }

    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/admin/staff");
        if (res.ok) {
          const data = await res.json();
          if (data.staff) setStaff(data.staff);
        }
      } catch (err) {}
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (mode === "scan") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera." }));
    }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [mode]);

  const getLangCode = (lang: string) => {
    const map: Record<string, string> = {
      "English": "en-US", "Hindi": "hi-IN", "Tamil": "ta-IN", "Telugu": "te-IN",
      "Kannada": "kn-IN", "Bengali": "bn-IN", "Marathi": "mr-IN"
    };
    return map[lang] || "en-US";
  };

  const stopScanning = () => {
    stopFlagRef.current = true;
    setIsScanning(false);
    setIsListening(false);
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
  };

  const getSpeechRecognitionCtor = () => {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  };

  const startVoiceOnlyCapture = () => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Voice Unsupported", description: "Your browser does not support speech recognition." });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getLangCode(userLang);
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      let capturedFinal = "";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentFinal = "";
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = (event.results[i][0]?.transcript || "").trim();
          if (!text) continue;
          if (event.results[i].isFinal) currentFinal += ` ${text}`;
          else currentInterim += ` ${text}`;
        }

        if (currentFinal.trim()) {
          capturedFinal = `${capturedFinal} ${currentFinal}`.trim();
        }

        const combined = `${capturedFinal} ${currentInterim}`.trim();
        liveTranscriptRef.current = combined;
        setSymptoms(combined);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      toast({ variant: "destructive", title: "Mic Error", description: "Unable to start voice capture." });
      setIsListening(false);
    }
  };

  const startScanning = async () => {
    if (mode === "text") {
      startVoiceOnlyCapture();
      return;
    }

    setIsScanning(true);
    stopFlagRef.current = false;
    setDetectedSymptoms([]);
    liveTranscriptRef.current = symptoms.trim();
    
    // Start voice listening in background
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (SpeechRecognition) {
      const startRecognition = () => {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = getLangCode(userLang);
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;
          recognitionRef.current = recognition;

          let capturedFinal = liveTranscriptRef.current || "";

          recognition.onstart = () => setIsListening(true);
          recognition.onresult = (event: any) => {
            let currentFinal = "";
            let currentInterim = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const text = (event.results[i][0]?.transcript || "").trim();
              if (!text) continue;
              if (event.results[i].isFinal) currentFinal += ` ${text}`;
              else currentInterim += ` ${text}`;
            }

            if (currentFinal.trim()) {
              capturedFinal = `${capturedFinal} ${currentFinal}`.trim();
            }

            const merged = `${capturedFinal} ${currentInterim}`.trim();
            liveTranscriptRef.current = merged;
            setSymptoms(merged);
          };

          recognition.onerror = (event: any) => {
            setIsListening(false);
            if (!stopFlagRef.current && event?.error !== "aborted") {
              setTimeout(() => {
                if (!stopFlagRef.current) startRecognition();
              }, 250);
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            if (!stopFlagRef.current) {
              setTimeout(() => {
                if (!stopFlagRef.current) startRecognition();
              }, 200);
            }
          };

          recognition.start();
        } catch {
          setIsListening(false);
        }
      };

      startRecognition();
    }

    // Capture loop
    let isAnalyzing = false;
    let stalledAttempts = 0;
    while (!stopFlagRef.current) {
      if (!videoRef.current) {
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      
      // Minimum voice needed to start AI
      const transcriptForAi = liveTranscriptRef.current.trim();
      if (transcriptForAi.length < 4) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }

      if (isAnalyzing) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      isAnalyzing = true;
      (async () => {
        try {
          if (videoRef.current) {
            const base64 = captureVideoFrameForServerAction(videoRef.current, {
              maxDimension: 640,
              maxBase64Chars: 850_000,
              quality: 0.45,
              minQuality: 0.25,
            });
            if (!base64) {
              throw new Error("Frame capture failed");
            }
            const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
            
            const aiRes = await detectBodyPart({
              imageBase64: base64,
              voiceTranscript: transcriptForAi || "Scanning body part",
              staffList: staffJson
            });

            if (aiRes.mismatch) {
              stalledAttempts += 1;
              toast({ 
                  title: "Matching Error", 
                  description: aiRes.message,
                  variant: "destructive"
              });
              if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(aiRes.message);
                  utterance.lang = getLangCode(userLang);
                  window.speechSynthesis.speak(utterance);
              }
            } else {
              const confidence = Number.isFinite(aiRes.confidence) ? aiRes.confidence : 0.5;
              const specialist = (aiRes.specialistType || "").trim();
              const hasSpecialist = specialist.length > 0;
              const transcriptIsRich = transcriptForAi.length >= 14;
              const canFinalize = aiRes.emergency || (hasSpecialist && (confidence >= 0.5 || transcriptIsRich));

              if (!canFinalize) {
                stalledAttempts += 1;
              }

              if (canFinalize) {
              setResult({ 
                  recommendedSpecialist: specialist || "General Physician", 
                  reason: aiRes.reason || "Based on your symptoms and scan, consult the recommended specialist.",
                  risk_level: aiRes.risk_level,
                  emergency: aiRes.emergency,
                  detectedSymptoms: aiRes.detectedSymptoms,
                  next_step: aiRes.next_step,
                  suggestedAction: aiRes.message
              } as any);
              if (aiRes.detectedSymptoms) setDetectedSymptoms(aiRes.detectedSymptoms);
              
              toast({ title: "Specialist Found!", description: aiRes.reason || specialist });

              if (window.speechSynthesis) {
                const msg = userLang === "Hindi" 
                    ? `विशेषज्ञ मिल गया! हमने ${specialist || "जनरल फिजिशियन"} का सुझाव दिया है।`
                    : `Specialist found! We recommend ${specialist || "General Physician"}.`;
                const utterance = new SpeechSynthesisUtterance(msg);
                utterance.lang = getLangCode(userLang);
                window.speechSynthesis.speak(utterance);
              }

              stopScanning();
              }
            }

            if (stalledAttempts >= 3 && transcriptForAi.length >= 8 && !stopFlagRef.current) {
              try {
                const fallback = await aiDoctorRecommendation({ symptoms: transcriptForAi });
                setResult(fallback);
                toast({ title: "Recommendation Ready", description: "Generated from voice symptom summary." });
                stopScanning();
              } catch {
                // Keep scanning if fallback fails
              }
            }
          }
        } catch (e) {
          console.error("Scanning error", e);
        } finally {
          isAnalyzing = false;
        }
      })();

      await new Promise(r => setTimeout(r, 5000));
    }

    setIsScanning(false);
  };

  const handleRecommendation = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      const response = await aiDoctorRecommendation({ symptoms });
      setResult(response);
      setError(false);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBookConsultation = () => {
    if (result) {
      localStorage.setItem("mediflow_last_symptom_analysis", JSON.stringify({
        specialist: result.recommendedSpecialist,
        description: symptoms,
      }));
      router.push("/dashboard/patient/appointments");
    }
  };

  return (
    <Card className="w-full rounded-[2rem] border-primary/10 shadow-lg overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-6 w-6" />
            <CardTitle>Multimodal AI Triage</CardTitle>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-full">
            <Button size="sm" variant={mode === 'text' ? 'default' : 'ghost'} className="rounded-full" onClick={() => setMode('text')}>TEXT</Button>
            <Button size="sm" variant={mode === 'scan' ? 'default' : 'ghost'} className="rounded-full" onClick={() => setMode('scan')}>SCAN</Button>
          </div>
        </div>
        <CardDescription className="mt-2">
          {mode === 'text' ? "Describe your symptoms or use voice." : "Point your finger at the painful area for a precise scan."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {mode === 'text' ? (
          <div className="relative">
            <Textarea
              placeholder="Describe your symptoms (e.g., 'Persistent cough for 3 days...')"
              className="min-h-[120px] resize-none rounded-2xl border-2 focus:border-primary/50 pr-14 transition-all"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <Button
              size="icon"
              variant={isListening ? "destructive" : "secondary"}
              className={cn("absolute bottom-3 right-3 rounded-full h-10 w-10 transition-all", isListening && 'animate-pulse scale-110')}
              onClick={isListening ? stopScanning : startScanning}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border-4 border-slate-900">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-xl font-black uppercase tracking-widest text-primary">Scanning Area...</p>
                  <p className="text-sm opacity-60 mt-2">Point your finger at the pain</p>
                  {symptoms && <p className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-green-400 font-bold italic">"{symptoms}"</p>}
                </div>
              )}
            </div>
            <Button 
                className={cn("w-full py-8 text-xl font-black rounded-2xl border-4", isScanning ? "bg-red-500 border-red-700" : "bg-black border-black")}
                onClick={isScanning ? stopScanning : startScanning}
            >
                {isScanning ? <><Square className="mr-2 fill-white" /> STOP SCANNING</> : <><Camera className="mr-2" /> START VISUAL SCAN</>}
            </Button>
          </div>
        )}

        {mode === 'text' && !result && (
          <Button className="w-full py-6 text-lg rounded-xl shadow-lg" disabled={loading || !symptoms.trim()} onClick={handleRecommendation}>
            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</> : "Check Symptoms"}
          </Button>
        )}

        {result && (
          <div className="mt-6 p-6 bg-primary/5 border-2 border-primary/20 rounded-[2rem] animate-in zoom-in-95 duration-300">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-white p-4 rounded-2xl shadow-lg">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-2xl font-black text-primary uppercase">{result.recommendedSpecialist}</h4>
                  <Badge className="bg-green-100 text-green-700 border-green-200">AI MATCH</Badge>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">{result.reason}</p>
                {detectedSymptoms.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detectedSymptoms.map((s, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" /> {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1 h-16 rounded-2xl text-lg font-bold shadow-xl" onClick={handleBookConsultation}>
                    <Calendar className="h-5 w-5 mr-2" /> Book Now
                  </Button>
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl text-lg font-bold" onClick={() => setResult(null)}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border", className)}>{children}</span>;
}
