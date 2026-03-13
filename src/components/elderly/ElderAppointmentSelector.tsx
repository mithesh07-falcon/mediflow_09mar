"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bone, Eye, Thermometer, Smile, Sunrise, Sun, Moon, ArrowLeft, CheckCircle2, Camera, Loader2, Hand, Ear, Activity, Brain, Sparkles, Mic, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { detectBodyPart } from "@/ai/flows/ai-body-part-detection";

// Symptom to Specialist mapping
const SYMPTOMS_MAP = [
    { id: "heart", label: "Heart & Chest", icon: Heart, specialist: "Cardiology", color: "text-red-500", border: "border-red-200", bg: "bg-red-50" },
    { id: "bones", label: "Bones & Joints", icon: Bone, specialist: "Orthopedics", color: "text-orange-500", border: "border-orange-200", bg: "bg-orange-50" },
    { id: "eyes", label: "Eyes & Vision", icon: Eye, specialist: "Ophthalmology", color: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "fever", label: "Fever & General", icon: Thermometer, specialist: "General", color: "text-green-500", border: "border-green-200", bg: "bg-green-50" },
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
}

interface ElderAppointmentSelectorProps {
    onSearchDoctors: (request: AppointmentRequest) => void;
    isLoading?: boolean;
}

export function ElderAppointmentSelector({ onSearchDoctors, isLoading = false }: ElderAppointmentSelectorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<1 | 2>(1)
    const [mode, setMode] = useState<"manual" | "camera">("manual");
    const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [predictedDoctor, setPredictedDoctor] = useState<string | null>(null);
    const [scanReason, setScanReason] = useState<string | null>(null);
    
    // New Multimodal State
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);

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
            navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // Audio access handled by SpeechRecognition
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                    setCameraError(null);
                })
                .catch(() => setCameraError("Camera access denied or not available."));
        }
        return () => stream?.getTracks().forEach(t => t.stop());
    }, [mode, step]);

    const activateScanner = () => {
        if (mode === "camera") return;
        setMode("camera");
        
        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        const langMap: Record<string, string> = { English: "en-US", Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN" };
        const promptMap: Record<string, string> = { English: "Please talk", Hindi: "कृपया बोलें", Tamil: "தயவுசெய்து பேசுங்கள்", Telugu: "దయచేసి మాట్లాడండి" };
        
        const langCode = langMap[user.language] || "en-US";
        const promptText = promptMap[user.language] || promptMap.English;

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(promptText);
            utterance.lang = langCode;
            utterance.rate = 0.9;
            utterance.onend = () => {
                startVoiceRecording();
            };
            window.speechSynthesis.speak(utterance);
        } else {
            startVoiceRecording();
        }
    };

    const startVoiceRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast({ title: "Voice recognition not supported", variant: "destructive" });
            return;
        }
        const recognition = new SpeechRecognition();
        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        const langMap: any = { English: "en-US", Hindi: "hi-IN", Tamil: "ta-IN", Telugu: "te-IN" };
        recognition.lang = langMap[user.language] || "en-US";
        
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setVoiceTranscript(text);
            toast({ title: "Talk is coming through!", description: `"${text}"` });
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleCameraScan = async () => {
        setIsScanning(true);
        try {
            if (!videoRef.current) return;
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
            const base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

            const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
            const response = await detectBodyPart({
                imageBase64: base64Image,
                voiceTranscript: voiceTranscript,
                staffList: staffJson
            });

            setPredictedDoctor(response.predictedDoctorName);
            setScanReason(response.reason);
            toast({ title: "Analysis Success", description: response.reason });
            handleSymptomSelect(response.symptomId);
        } catch (error) {
            toast({ variant: "destructive", title: "Scan error", description: "Try manual selection." });
        } finally {
            setIsScanning(false);
            setVoiceTranscript("");
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Image = (e.target?.result as string).split(",")[1];
                const response = await detectBodyPart({ imageBase64: base64Image, voiceTranscript: voiceTranscript });
                setPredictedDoctor(response.predictedDoctorName);
                setScanReason(response.reason);
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
            specialist: symptom.specialist,
            timePreferenceCode: timePref.id,
            timePreferenceLabel: timePref.label,
            predictedDoctorName: predictedDoctor || undefined,
            reason: scanReason || undefined
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
                        ? (mode === "manual" ? "Choose from the body areas below." : "Hold camera near the area and speak into the mic.")
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
                                        onClick={() => handleSymptomSelect(s.id)}
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
                                        <Loader2 className="h-16 w-16 animate-spin mb-4 text-green-400" />
                                        <h3 className="text-3xl font-black text-green-400">ANALYZING...</h3>
                                    </div>
                                )}
                                {isListening && !isScanning && (
                                    <div className="absolute top-4 right-4 bg-red-600/90 text-white px-4 py-2 rounded-full flex flex-col items-center animate-pulse border-2 border-white shadow-lg">
                                        <Mic className="h-6 w-6 mb-1" />
                                        <span className="text-xs font-bold tracking-widest uppercase">LISTENING</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <Button 
                                        className={cn("flex-1 h-32 text-3xl font-black rounded-[2.5rem] border-[10px]", isListening ? "bg-red-600 border-red-800 text-white animate-pulse" : "bg-white text-black border-black")}
                                        onClick={startVoiceRecording}
                                    >
                                        <Mic className="mr-2 h-10 w-10" /> {voiceTranscript ? "RE-RECORD" : "SPEAK"}
                                    </Button>
                                    <Button 
                                        className="flex-1 h-32 text-3xl font-black bg-black text-white rounded-[2.5rem] border-[10px] border-black"
                                        onClick={handleCameraScan}
                                        disabled={isScanning}
                                    >
                                        <Camera className="mr-2 h-10 w-10" /> SCAN
                                    </Button>
                                </div>
                                {voiceTranscript && (
                                    <div className="p-6 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[2rem] text-xl font-bold italic text-slate-500 text-center">
                                        "{voiceTranscript}"
                                    </div>
                                )}
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
