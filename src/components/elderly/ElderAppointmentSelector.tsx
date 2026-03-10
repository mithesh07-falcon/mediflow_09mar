"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bone, Eye, Thermometer, Smile, Sunrise, Sun, Moon, ArrowLeft, CheckCircle2, Camera, Loader2, Hand, Ear, Activity, Brain, Sparkles } from "lucide-react";
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
    timePreferenceCode: string; // "morning", "afternoon", "evening"
    timePreferenceLabel: string;
    predictedDoctorName?: string;
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
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch("/api/admin/staff");
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                if (data.staff) setStaff(data.staff);
            } catch (err) {
                console.error("Clinical staff lookup failed", err);
                toast({
                    variant: "destructive",
                    title: "Staff Lookup Failed",
                    description: "Could not fetch clinical staff list. Please try again later.",
                });
            }
        };
        fetchStaff();
    }, [toast]);


    useEffect(() => {
        let stream: MediaStream | null = null;
        setCameraError(null);

        if (mode === "camera" && step === 1) {
            if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then(s => {
                        stream = s;
                        if (videoRef.current) {
                            videoRef.current.srcObject = s;
                            videoRef.current.play().catch(e => console.error("Error playing video stream:", e));
                        }
                    })
                    .catch(err => {
                        console.error("Camera access denied", err);
                        setCameraError("Camera access denied. Please grant permission in your browser settings to use the Live Scan feature.");
                        toast({
                            variant: "destructive",
                            title: "Camera Access Denied",
                            description: "Please allow camera access to use the AI Scan feature.",
                        });
                    });
            } else {
                setCameraError("Live Scan requires a Secure Context (Like localhost or HTTPS). If you are using an IP address, the camera will be disabled by the browser.");
                toast({
                    variant: "destructive",
                    title: "Camera Not Available",
                    description: "Your browser or environment does not support camera access for Live Scan.",
                });
            }
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode, step, toast]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Image = (e.target?.result as string).split(",")[1];
                const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
                const response = await detectBodyPart({
                    imageBase64: base64Image,
                    staffList: staffJson
                });

                setPredictedDoctor(response.predictedDoctorName);
                toast({
                    title: "AI Analysis Complete",
                    description: `I recommend ${response.predictedDoctorName} for your ${response.specialistType}. ${response.reason}`
                });
                handleSymptomSelect(response.symptomId);
            } catch (error) {
                console.error("AI Analysis failed", error);
                handleSymptomSelect("fever");
                toast({ variant: "destructive", title: "Analysis Failed", description: "Could not identify body part. Try manual selection." });
            } finally {
                setIsScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCameraScan = async () => {
        setIsScanning(true);
        try {
            if (!videoRef.current || !videoRef.current.srcObject) {
                throw new Error("Camera stream is not active. Please ensure permissions are granted.");
            }

            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

            const staffJson = JSON.stringify(staff.map(s => ({ name: s.name, spec: s.specialization })));
            const response = await detectBodyPart({
                imageBase64: base64Image,
                staffList: staffJson
            });

            setPredictedDoctor(response.predictedDoctorName);

            toast({
                title: "Diagnosis Complete!",
                description: `We found ${response.predictedDoctorName} (${response.specialistType}) for you. ${response.reason}`,
            });

            handleSymptomSelect(response.symptomId);
        } catch (error) {
            console.error("Scanning failed", error);
            handleSymptomSelect("fever"); // Fallback
            toast({
                variant: "destructive",
                title: "Scan Failed",
                description: "We couldn't clearly see the body part. Please select manually."
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleSymptomSelect = (symptomId: string) => {
        setSelectedSymptom(symptomId);
        // Proceed to Step 2 after a tiny delay for visual feedback
        setTimeout(() => {
            setStep(2);
        }, 300);
    };

    const handleTimeSelect = (timeId: string) => {
        setSelectedTime(timeId);
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
            predictedDoctorName: predictedDoctor || undefined
        });
    };

    const selectedSymptomData = SYMPTOMS_MAP.find(s => s.id === selectedSymptom);

    return (
        <Card className="max-w-xl mx-auto border-4 border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="text-center bg-slate-50 pb-8 pt-8 border-b-2 border-slate-100">
                <CardTitle className="text-3xl font-black">
                    {step === 1 ? (mode === "manual" ? "Where do you need help?" : "Point Camera at Body Part") : "When should we schedule?"}
                </CardTitle>
                <CardDescription className="text-lg font-medium text-slate-600 mt-2">
                    {step === 1
                        ? (mode === "manual" ? "Tap on the body part or symptom you are having trouble with." : "Position your camera and wait for auto-detection.")
                        : `Finding a ${selectedSymptomData?.specialist} for your ${selectedSymptomData?.label}`}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-8">
                {step === 1 && (
                    <div className="space-y-6 mb-10 text-center animate-in fade-in zoom-in-95 duration-500">
                        <p className="text-3xl font-black uppercase text-slate-800">Choose how to find a doctor:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button
                                type="button"
                                className={cn(
                                    "flex flex-col items-center justify-center p-8 rounded-[3rem] border-8 transition-all duration-300 gap-4 group",
                                    mode === "camera"
                                        ? "bg-black text-white border-black shadow-2xl scale-[1.05]"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-black/50"
                                )}
                                onClick={() => setMode("camera")}
                            >
                                <div className={cn("p-6 rounded-full group-hover:bg-primary/20", mode === "camera" ? "bg-white/10" : "bg-slate-50")}>
                                    <Camera className={cn("h-20 w-20", mode === "camera" ? "text-green-400" : "text-slate-400")} />
                                </div>
                                <span className={cn("text-4xl font-black uppercase", mode === "camera" ? "text-white" : "text-black")}>AI SCAN</span>
                                <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Auto-Detect Body Part</span>
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "flex flex-col items-center justify-center p-8 rounded-[3rem] border-8 transition-all duration-300 gap-4 group",
                                    mode === "manual"
                                        ? "bg-black text-white border-black shadow-2xl scale-[1.05]"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-black/50"
                                )}
                                onClick={() => setMode("manual")}
                            >
                                <div className={cn("p-6 rounded-full group-hover:bg-primary/20", mode === "manual" ? "bg-white/10" : "bg-slate-50")}>
                                    <Hand className={cn("h-20 w-20", mode === "manual" ? "text-primary" : "text-slate-400")} />
                                </div>
                                <span className={cn("text-4xl font-black uppercase", mode === "manual" ? "text-white" : "text-black")}>MANUAL</span>
                                <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Select From List</span>
                            </button>
                        </div>
                    </div>
                )}


                {step === 1 ? (
                    mode === "manual" ? (
                        <div className="grid grid-cols-2 gap-4">
                            {SYMPTOMS_MAP.map((symptom) => {
                                const Icon = symptom.icon;
                                const isSelected = selectedSymptom === symptom.id;
                                return (
                                    <button
                                        key={symptom.id}
                                        onClick={() => handleSymptomSelect(symptom.id)}
                                        className={`
                    flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-4 transition-all
                    hover:-translate-y-1 hover:shadow-lg active:scale-95
                    ${isSelected ? `border-primary ring-4 ring-primary/20 ${symptom.bg}` : `border-slate-200 hover:${symptom.border} bg-white`}
                  `}
                                    >
                                        <div className={`p-4 rounded-full ${isSelected ? 'bg-white shadow-sm' : symptom.bg}`}>
                                            <Icon className={`w-12 h-12 ${symptom.color}`} />
                                        </div>
                                        <span className="text-xl font-bold text-center leading-tight">
                                            {symptom.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : ( // Camera Mode
                        <div className="space-y-6 animate-in zoom-in-95">
                            <div className="relative aspect-video bg-slate-200 rounded-[2rem] overflow-hidden border-8 border-slate-900 shadow-inner flex items-center justify-center">
                                {cameraError ? (
                                    <div className="p-8 text-center space-y-4">
                                        <Camera className="h-16 w-16 mx-auto text-slate-400" />
                                        <p className="text-xl font-bold text-slate-600">{cameraError}</p>
                                        <p className="text-sm text-slate-400">You can still upload a photo for AI analysis below.</p>
                                    </div>
                                ) : (
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                                )}

                                {isScanning && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-10 text-center backdrop-blur-sm z-10">
                                        <Loader2 className="h-20 w-20 animate-spin mb-4 text-green-400" />
                                        <span className="text-3xl font-black uppercase tracking-widest text-green-400">Analyzing...</span>
                                    </div>
                                )}
                                {!isScanning && !cameraError && (
                                    <div className="absolute inset-0 border-[6px] border-dashed border-white/50 m-8 rounded-[2rem] pointer-events-none" />
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {!cameraError ? (
                                    <Button
                                        className="w-full h-24 text-3xl font-black bg-black text-white rounded-[2rem] shadow-2xl active:scale-95 transition-all border-b-8 border-slate-700"
                                        onClick={handleCameraScan}
                                        disabled={isScanning}
                                    >
                                        {isScanning ? <Loader2 className="h-10 w-10 animate-spin" /> : "SCAN NOW"}
                                    </Button>
                                ) : (
                                    <div className="text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                        <Button
                                            variant="outline"
                                            className="w-full h-24 text-2xl font-black border-8 border-black rounded-[2rem] hover:bg-slate-50 transition-all shadow-xl"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isScanning}
                                        >
                                            <Camera className="mr-3 h-8 w-8 text-primary" />
                                            UPLOAD FOR AI
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )


                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-primary font-bold px-4 py-2 hover:bg-primary/5 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Symptoms
                        </button>

                        <div className="space-y-4">
                            {TIME_PREFS.map((timePref) => {
                                const Icon = timePref.icon;
                                const isSelected = selectedTime === timePref.id;
                                return (
                                    <button
                                        key={timePref.id}
                                        onClick={() => handleTimeSelect(timePref.id)}
                                        className={`
                      w-full flex items-center p-6 rounded-3xl border-4 transition-all
                      hover:shadow-md active:scale-[0.98]
                      ${isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-200 hover:border-primary/40 bg-white'}
                    `}
                                    >
                                        <div className={`p-4 rounded-full mr-6 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                                            <Icon className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h3 className="text-2xl font-black">{timePref.label}</h3>
                                            <p className="text-lg font-medium text-slate-500">{timePref.time}</p>
                                        </div>
                                        {isSelected && <CheckCircle2 className="w-8 h-8 text-primary" />}
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            className="w-full h-20 text-2xl font-black rounded-3xl mt-8 shadow-xl"
                            size="lg"
                            disabled={!selectedTime || isLoading}
                            onClick={handleConfirm}
                        >
                            {isLoading ? "Searching Doctors..." : "Find Doctors Now"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
