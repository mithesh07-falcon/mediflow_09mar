"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bone, Eye, Thermometer, Smile, Sunrise, Sun, Moon, ArrowLeft, CheckCircle2, Camera, Loader2, Hand, Ear, Activity, Brain, Sparkles, Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { captureVideoFrameForServerAction, normalizeImageDataUrlForServerAction } from "@/lib/image-payload";
import { detectBodyPart } from "@/ai/flows/ai-body-part-detection";

// Symptom to Specialist mapping
const SYMPTOMS_MAP = [
    { id: "heart", label: "Heart & Chest", icon: Heart, specialist: "Cardiology", color: "text-red-500", border: "border-red-200", bg: "bg-red-50" },
    { id: "bones", label: "Bones & Joints", icon: Bone, specialist: "Orthopedics", color: "text-orange-500", border: "border-orange-200", bg: "bg-orange-50" },
    { id: "eyes", label: "Eyes & Vision", icon: Eye, specialist: "Ophthalmology", color: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "fever", label: "Fever & General", icon: Thermometer, specialist: "General Medicine", color: "text-green-500", border: "border-green-200", bg: "bg-green-50" },
    { id: "dental", label: "Teeth & Mouth", icon: Smile, specialist: "Dentistry", color: "text-purple-500", border: "border-purple-200", bg: "bg-purple-50" },
    { id: "ent", label: "Ear, Nose, Throat", icon: Ear, specialist: "ENT", color: "text-yellow-500", border: "border-yellow-200", bg: "bg-yellow-50" },
    { id: "stomach", label: "Stomach/Belly", icon: Activity, specialist: "Gastroenterology", color: "text-amber-500", border: "border-amber-200", bg: "bg-amber-50" },
    { id: "neuro", label: "Head/Brain", icon: Brain, specialist: "Neurology", color: "text-indigo-500", border: "border-indigo-200", bg: "bg-indigo-50" },
    { id: "skin", label: "Skin/Rashes", icon: Sparkles, specialist: "Dermatology", color: "text-pink-500", border: "border-pink-200", bg: "bg-pink-50" },
];

const TIME_PREFS = [
    { id: "morning", label: "Morning", time: "8 AM - 12 PM", icon: Sunrise },
    { id: "afternoon", label: "Afternoon", time: "12 PM - 4 PM", icon: Sun },
    { id: "evening", label: "Evening", time: "4 PM - 8 PM", icon: Moon },
];

export interface AppointmentRequest {
    symptomId: string;
    symptomLabel: string;
    specialist: string;
    timePreferenceCode: string;
    timePreferenceLabel: string;
    predictedDoctorName?: string;
    reason?: string;
    detectedSymptoms?: string[];
    // AI Assistant Fields
    riskLevel?: string;
    emergency?: boolean;
    aiMessage?: string;
    nextStep?: string;
    structuredSymptoms?: {
        bodyPart: string;
        painType: string;
        severity: string;
        duration: string;
        onset: string;
        triggers: string | null;
    };
}

interface ElderAppointmentSelectorProps {
    onSearchDoctors: (request: AppointmentRequest) => void;
    isLoading?: boolean;
}

export function ElderAppointmentSelector({ onSearchDoctors, isLoading = false }: ElderAppointmentSelectorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<1 | 2>(1);
    const [mode, setMode] = useState<"manual" | "camera">("manual");
    const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [predictedDoctor, setPredictedDoctor] = useState<string | null>(null);
    const [aiSpecialist, setAiSpecialist] = useState<string | null>(null);
    const [scanReason, setScanReason] = useState<string | null>(null);
    const [detectedSymptoms, setDetectedSymptoms] = useState<string[] | null>(null);
    const [riskLevel, setRiskLevel] = useState<string | null>(null);
    const [emergency, setEmergency] = useState<boolean>(false);
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [nextStep, setNextStep] = useState<string | null>(null);
    const [structuredSymptoms, setStructuredSymptoms] = useState<any | null>(null);
    
    // Multimodal State
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const stopFlagRef = useRef(false);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch("/api/admin/staff");
                if (res.ok) {
                    const data = await res.json();
                    if (data.staff) setStaff(data.staff);
                }
            } catch (err) {
                console.error("Staff lookup failed", err);
            }
        };
        fetchStaff();
    }, []);

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (mode === "camera" && step === 1) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                    setCameraError(null);
                })
                .catch(() => setCameraError("Camera access denied or not available."));
        }
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [mode, step]);

    const activateScanner = () => {
        if (mode === "camera") return;
        setMode("camera");
    };

    const stopScanning = () => {
        stopFlagRef.current = true;
        setIsScanning(false);
        setIsListening(false);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
    };

    const handleCombinedScan = async () => {
        setIsScanning(true);
        stopFlagRef.current = false;
        setVoiceTranscript("");

        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        const langMap: Record<string, string> = { English: "en-US", Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN", Kannada: "kn-IN", Bengali: "bn-IN", Marathi: "mr-IN" };
        const promptMap: Record<string, string> = {
            English: "I'm listening. Point your finger where it hurts and tell me about it.",
            Hindi: "मैं सुन रहा हूँ। जहां दर्द हो रहा है, वहां उंगली दिखाएं और मुझे बताएं।",
            Tamil: "நான் கேட்கிறேன். எங்கே வலிக்கிறதோ அங்கே விரலைக் காட்டி எனக்குச் சொல்லுங்கள்.",
            Telugu: "నేను వింటున్నాను. ఎక్కడ నొప్పిగా ఉందో వేలు చూపించి నాకు చెప్పండి.",
            Kannada: "ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ. ಎಲ್ಲಿ ನೋವಿದೆಯೋ ಅಲ್ಲಿ ಬೆರಳು ತೋರಿಸಿ ನನಗೆ ಹೇಳಿ.",
            Bengali: "আমি শুনছি। যেখানে ব্যথা করছে সেখানে আঙুল দিয়ে দেখান এবং আমাকে বলুন।",
            Marathi: "मी ऐकत आहे. जिथे दुखतंय तिथे बोट दाखवा आणि मला सांगा."
        };
        const langCode = langMap[user.language] || "en-US";
        const promptText = promptMap[user.language] || promptMap.English;

        const startContinuousCapture = async () => {
            let capturedTranscript = "";
            let latestTranscript = ""; // Move declaration here
            let lastVoiceTime = Date.now();
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                const startRecognition = () => {
                    try {
                        const recognition = new SpeechRecognition();
                        recognition.lang = langCode;
                        recognition.interimResults = true;
                        recognition.continuous = true;
                        recognition.maxAlternatives = 1;
                        recognitionRef.current = recognition;

                        recognition.onstart = () => setIsListening(true);
                        recognition.onresult = (event: any) => {
                            lastVoiceTime = Date.now();
                            let currentFinal = "";
                            let currentInterim = "";
                            for (let i = event.resultIndex; i < event.results.length; ++i) {
                                const transcriptText = (event.results[i][0]?.transcript || "").trim();
                                if (!transcriptText) continue;
                                if (event.results[i].isFinal) {
                                    currentFinal += ` ${transcriptText}`;
                                } else {
                                    currentInterim += ` ${transcriptText}`;
                                }
                            }
                            
                            // Use both final and interim for real-time responsiveness
                            const combined = (capturedTranscript + " " + currentFinal + " " + currentInterim).trim();
                            setVoiceTranscript(combined);
                            
                            // Update our local tracking variable for the loop
                            latestTranscript = combined;

                            // Only "final" committed to the permanent transcript track
                            if (currentFinal.trim()) {
                                capturedTranscript = (capturedTranscript + " " + currentFinal).trim();
                            }
                        };

                        recognition.onerror = (event: any) => {
                            if (!stopFlagRef.current && event?.error !== "aborted") {
                                setTimeout(() => {
                                    if (!stopFlagRef.current) startRecognition();
                                }, 250);
                            }
                        };

                        recognition.onend = () => {
                            if (!stopFlagRef.current) {
                                setTimeout(() => {
                                    if (!stopFlagRef.current) startRecognition();
                                }, 200);
                            } else {
                                setIsListening(false);
                            }
                        };

                        recognition.start();
                    } catch (e) {
                        console.warn("Voice recognition failed", e);
                    }
                };

                startRecognition();
            }

            let lastAiCheck = 0;
            let isProcessingAi = false;
            const AI_CHECK_INTERVAL = 4000;

            while (!stopFlagRef.current) {
                if (!videoRef.current) break;
                
                const now = Date.now();
                const timeSinceLastVoice = now - lastVoiceTime;
                const timeSinceLastAi = now - lastAiCheck;

                // TRIGGER AI IF:
                // 1. It's time for a periodic check AND we aren't already processing.
                // 2. The user has spoken AND there's a 4-second pause.
                const hasSubstantialText = latestTranscript.length > 3;
                const pauseDetected = hasSubstantialText && timeSinceLastVoice > 4000;
                
                const shouldCheckAi = !isProcessingAi && ((timeSinceLastAi >= AI_CHECK_INTERVAL) || pauseDetected);

                if (shouldCheckAi) {
                    isProcessingAi = true;
                    lastAiCheck = now;
                    
                    // Run AI in a wrapper to avoid blocking the main loop
                    (async () => {
                        try {
                            if (!videoRef.current) { isProcessingAi = false; return; }

                            const base64Image = captureVideoFrameForServerAction(videoRef.current, {
                                maxDimension: 640,
                                maxBase64Chars: 850_000,
                                quality: 0.45,
                                minQuality: 0.25,
                            });
                            if (!base64Image) { isProcessingAi = false; return; }
                            const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
                            
                            console.log(`[Scan:AI] Analyzing transcript length: ${latestTranscript.length}. Pause detected: ${pauseDetected}`);
                            
                            const response = await detectBodyPart({
                                imageBase64: base64Image,
                                voiceTranscript: latestTranscript || "Scanning body part pointing...",
                                staffList: staffJson
                            });

                            if (response.mismatch) {
                                toast({ 
                                    title: "Matching Error", 
                                    description: response.message,
                                    variant: "destructive"
                                });
                                if (window.speechSynthesis) {
                                    const utterance = new SpeechSynthesisUtterance(response.message);
                                    utterance.lang = langCode;
                                    window.speechSynthesis.speak(utterance);
                                }
                                // Do not stop, let user correct. We reset lastAiCheck to prevent spam but isProcessingAi=false allows pause check.
                                lastAiCheck = Date.now();
                            } else {
                                // FINALIZATION logic
                                const confidence = Number.isFinite(response.confidence) ? response.confidence : 0.5;
                                const isSpecific = !!response.symptomId && response.symptomId !== "fever";
                                const isHighRisk = response.risk_level === "high";
                                const isGeneral = response.symptomId === "fever" || /general/i.test(response.specialistType || "");
                                const shouldFinalize = isHighRisk || (isSpecific && confidence >= 0.6) || (pauseDetected && !isGeneral && confidence >= 0.75);
                                const genericButClear = pauseDetected && confidence >= 0.55 && latestTranscript.length >= 14;
                                const shouldFinalizeNow = shouldFinalize || genericButClear;
                                
                                if (shouldFinalizeNow) {
                                    stopFlagRef.current = true; // Signal the parent loop to stop
                                    setPredictedDoctor(response.predictedDoctorName);
                                    setAiSpecialist(response.specialistType || null);
                                    setScanReason(response.reason);
                                    setRiskLevel(response.risk_level);
                                    setEmergency(response.emergency);
                                    setAiMessage(response.message);
                                    setNextStep(response.next_step);
                                    setStructuredSymptoms({
                                        bodyPart: response.final_body_part,
                                        painType: response.pain_type,
                                        severity: response.severity,
                                        duration: response.duration,
                                        onset: response.onset,
                                        triggers: response.triggers
                                    });

                                    if (response.detectedSymptoms) setDetectedSymptoms(response.detectedSymptoms);
                                    setSelectedSymptom(response.symptomId);
                                    
                                    toast({ 
                                        title: response.emergency ? "EMERGENCY DETECTED" : "Analysis Complete", 
                                        description: response.reason,
                                        variant: response.risk_level === "high" ? "destructive" : "default"
                                    });

                                    if (window.speechSynthesis) {
                                        const successUtterance = new SpeechSynthesisUtterance(response.message);
                                        successUtterance.lang = langCode;
                                        window.speechSynthesis.speak(successUtterance);
                                    }

                                    setIsScanning(false);
                                    setIsListening(false);
                                    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
                                    
                                    setStep(1); 
                                    setTimeout(() => setStep(2), 2500);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error("AI Analysis Error", e);
                        } finally {
                            isProcessingAi = false;
                        }
                    })();
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            setIsScanning(false);
            setIsListening(false);
        };

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(promptText);
            utterance.lang = langCode;
            utterance.onend = () => startContinuousCapture();
            window.speechSynthesis.speak(utterance);
        } else {
            startContinuousCapture();
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                if (!dataUrl) throw new Error("Unable to read uploaded image");

                const base64Image = await normalizeImageDataUrlForServerAction(dataUrl, {
                    maxDimension: 640,
                    maxBase64Chars: 850_000,
                    quality: 0.55,
                    minQuality: 0.25,
                });
                const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
                const response = await detectBodyPart({
                    imageBase64: base64Image,
                    voiceTranscript: voiceTranscript || "Uploaded symptom photo",
                    staffList: staffJson
                });
                setPredictedDoctor(response.predictedDoctorName);
                setAiSpecialist(response.specialistType || null);
                setScanReason(response.reason);
                if (response.detectedSymptoms) setDetectedSymptoms(response.detectedSymptoms);
                handleSymptomSelect(response.symptomId);
                toast({ title: "Found a Specialist", description: response.reason });
            } catch {
                toast({ variant: "destructive", title: "Upload Failed" });
            } finally {
                setIsScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSymptomSelect = (id: string) => {
        setSelectedSymptom(id);
        setTimeout(() => setStep(2), 300);
    };

    const handleConfirm = () => {
        if (!selectedSymptom || !selectedTime) return;
        const symptom = SYMPTOMS_MAP.find(s => s.id === selectedSymptom)!;
        const timePref = TIME_PREFS.find(t => t.id === selectedTime)!;
        onSearchDoctors({
            symptomId: symptom.id,
            symptomLabel: symptom.label,
            specialist: aiSpecialist || symptom.specialist,
            timePreferenceCode: timePref.id,
            timePreferenceLabel: timePref.label,
            predictedDoctorName: predictedDoctor || undefined,
            reason: scanReason || undefined,
            detectedSymptoms: detectedSymptoms || undefined,
            riskLevel: riskLevel || undefined,
            emergency: emergency,
            aiMessage: aiMessage || undefined,
            nextStep: nextStep || undefined,
            structuredSymptoms: structuredSymptoms || undefined
        });
    };

    const selectedSymptomData = SYMPTOMS_MAP.find(s => s.id === selectedSymptom);

    return (
        <Card className="max-w-xl mx-auto border-4 border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="text-center bg-slate-50 pb-8 pt-8 border-b-2 border-slate-100">
                <CardTitle className="text-3xl font-black uppercase tracking-tight">
                    {step === 1 ? (mode === "manual" ? "Where is the pain?" : "Show us & Tell us") : "Appointment Time"}
                </CardTitle>
                <CardDescription className="text-lg font-medium text-slate-600">
                    {step === 1 
                        ? (mode === "manual" ? "Choose from the body areas below." : "Point your finger at the pain area and speak.")
                        : `Finding a ${selectedSymptomData?.specialist} for you.`}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-8">
                {step === 1 && (
                    <div className="flex gap-4 mb-8">
                        <Button 
                            className={cn("flex-1 h-20 text-2xl font-black rounded-3xl border-4", mode === 'camera' ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100')}
                            onClick={activateScanner}
                        >
                            <Camera className="mr-2" /> AI SCAN
                        </Button>
                        <Button 
                            className={cn("flex-1 h-20 text-2xl font-black rounded-3xl border-4", mode === 'manual' ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100')}
                            onClick={() => setMode('manual')}
                        >
                            <Hand className="mr-2" /> MANUAL
                        </Button>
                    </div>
                )}

                {step === 1 ? (
                    mode === "manual" ? (
                        <div className="grid grid-cols-2 gap-4">
                            {SYMPTOMS_MAP.map(s => {
                                const Icon = s.icon;
                                const isSelected = selectedSymptom === s.id;
                                return (
                                    <button 
                                        key={s.id} 
                                        onClick={() => {
                                            setAiSpecialist(null);
                                            handleSymptomSelect(s.id);
                                        }}
                                        className={cn("flex flex-col items-center p-6 rounded-[2rem] border-4 transition-all", isSelected ? `border-primary ${s.bg}` : "border-slate-100 bg-white")}
                                    >
                                        <Icon className={cn("w-12 h-12 mb-2", s.color)} />
                                        <span className="text-lg font-bold">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border-8 border-slate-900 shadow-2xl">
                                {cameraError ? <div className="p-8 text-white text-center font-bold">{cameraError}</div> : <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />}
                                {isScanning && (
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white backdrop-blur-md">
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <div className="h-4 w-4 bg-red-600 rounded-full animate-ping" />
                                            <span className="text-xl font-black uppercase tracking-widest text-red-500">LIVE SCANNING</span>
                                        </div>

                                        {isListening ? (
                                            <>
                                                <div className="h-32 w-32 border-[8px] border-red-500 rounded-full flex items-center justify-center animate-pulse mb-4">
                                                    <Mic className="h-16 w-16 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                                                </div>
                                                <h3 className="text-4xl font-black text-red-400 uppercase tracking-tighter">I'm Listening...</h3>
                                                <p className="text-xl text-white/80 font-bold mt-2">Point and describe your pain</p>
                                                
                                                {voiceTranscript && (
                                                    <div className="mt-8 px-8 py-4 bg-white/10 rounded-[2rem] border-2 border-white/20 max-w-[80%] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
                                                        <p className="text-2xl font-black text-green-400 italic leading-tight">
                                                            "{voiceTranscript}"
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="absolute bottom-8 flex flex-col items-center gap-2">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <div key={i} className="h-8 w-1 bg-primary/40 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s` }} />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40">AI Analyzing continuous frame</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Loader2 className="h-24 w-24 animate-spin mb-4 text-primary" />
                                                <h3 className="text-3xl font-black text-primary uppercase">Almost there...</h3>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-4">
                                <Button 
                                    className={cn(
                                        "w-full h-32 text-4xl font-black rounded-[2.5rem] border-[10px] transition-all",
                                        isScanning
                                            ? "bg-red-600 border-red-800 text-white animate-pulse"
                                            : "bg-black text-white border-black hover:bg-zinc-800 active:scale-95"
                                    )}
                                    onClick={isScanning ? stopScanning : handleCombinedScan}
                                >
                                    {isScanning ? (
                                        <><Square className="mr-3 h-10 w-10 fill-white" /> STOP SCANNING</>
                                    ) : (
                                        <><Camera className="mr-3 h-10 w-10" /> <Mic className="mr-1 h-8 w-8 opacity-60" /> START SCAN</>
                                    )}
                                </Button>
                                <p className="text-center text-lg font-bold text-slate-400">
                                    Scanning will continue until you stop or a body part is detected.
                                </p>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                <Button variant="link" className="text-slate-400 font-bold" onClick={() => fileInputRef.current?.click()}>
                                    OR UPLOAD A PHOTO
                                </Button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        <Button variant="ghost" className="font-bold text-primary" onClick={() => setStep(1)}><ArrowLeft className="mr-2" /> Back</Button>
                        <div className="space-y-4">
                            {TIME_PREFS.map(tp => (
                                <button 
                                    key={tp.id} 
                                    onClick={() => setSelectedTime(tp.id)}
                                    className={cn("w-full flex items-center p-6 rounded-[2rem] border-4", selectedTime === tp.id ? "border-primary bg-primary/5" : "border-slate-100 bg-white")}
                                >
                                    <tp.icon className="w-10 h-10 mr-6 text-slate-400" />
                                    <div className="text-left"><h4 className="text-2xl font-black">{tp.label}</h4><p className="font-bold text-slate-400">{tp.time}</p></div>
                                    {selectedTime === tp.id && <CheckCircle2 className="ml-auto w-8 h-8 text-primary" />}
                                </button>
                            ))}
                        </div>
                        <Button className="w-full h-24 text-4xl font-black rounded-[2.5rem] mt-8 shadow-2xl uppercase" onClick={handleConfirm} disabled={!selectedTime}>Find Doctors</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
