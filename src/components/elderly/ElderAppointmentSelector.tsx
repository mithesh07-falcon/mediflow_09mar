"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Bone, Eye, Thermometer, Smile, Sunrise, Sun, Moon, ArrowLeft, CheckCircle2, Camera, Loader2, Hand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectBodyPart } from "@/ai/flows/ai-body-part-detection";

// Symptom to Specialist mapping
const SYMPTOMS_MAP = [
    { id: "heart", label: "Heart & Chest", icon: Heart, specialist: "Cardiologist", color: "text-red-500", border: "border-red-200", bg: "bg-red-50" },
    { id: "bones", label: "Bones & Joints", icon: Bone, specialist: "Orthopedist", color: "text-orange-500", border: "border-orange-200", bg: "bg-orange-50" },
    { id: "eyes", label: "Eyes & Vision", icon: Eye, specialist: "Ophthalmologist", color: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "fever", label: "Fever & General", icon: Thermometer, specialist: "General Physician", color: "text-green-500", border: "border-green-200", bg: "bg-green-50" },
    { id: "dental", label: "Teeth & Mouth", icon: Smile, specialist: "Dentist", color: "text-purple-500", border: "border-purple-200", bg: "bg-purple-50" },
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
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Clean up camera stream if unmounting or switching modes
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (mode === "camera" && step === 1) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                })
                .catch(err => console.error("Camera access denied", err));
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode, step]);

    const handleCameraScan = async () => {
        setIsScanning(true);
        try {
            if (!videoRef.current) throw new Error("Camera not initialized");

            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

            const response = await detectBodyPart({ imageBase64: base64Image });

            toast({
                title: "Scan Successful",
                description: response.reason,
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
                    <div className="flex bg-slate-100 p-2 rounded-2xl mb-8">
                        <Button
                            type="button"
                            variant={mode === "manual" ? "default" : "ghost"}
                            className={`flex-[2] h-16 text-2xl font-black rounded-xl ${mode === "manual" ? 'bg-black text-white shadow-md' : 'text-slate-500'}`}
                            onClick={() => setMode("manual")}
                        >
                            <Hand className="mr-2 h-6 w-6" /> MANUAL SELECTION
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "camera" ? "default" : "ghost"}
                            className={`flex-[2] h-16 text-2xl font-black rounded-xl ${mode === "camera" ? 'bg-black text-white shadow-md' : 'text-slate-500'}`}
                            onClick={() => setMode("camera")}
                        >
                            <Camera className="mr-2 h-6 w-6" /> CAMERA SCAN
                        </Button>
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
                            <div className="relative aspect-video bg-slate-200 rounded-[2rem] overflow-hidden border-8 border-slate-900 shadow-inner">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                                {isScanning && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-10 text-center backdrop-blur-sm">
                                        <Loader2 className="h-20 w-20 animate-spin mb-4 text-green-400" />
                                        <span className="text-3xl font-black uppercase tracking-widest text-green-400">Detecting...</span>
                                    </div>
                                )}
                                {!isScanning && (
                                    <div className="absolute inset-0 border-[6px] border-dashed border-white/50 m-8 rounded-[2rem] pointer-events-none" />
                                )}
                            </div>
                            <Button
                                className="w-full h-20 text-3xl font-black bg-slate-900 text-white rounded-3xl shadow-2xl active:scale-95 transition-all"
                                onClick={handleCameraScan}
                                disabled={isScanning}
                            >
                                {isScanning ? "Please Hold Still..." : "SCAN BODY PART NOW"}
                            </Button>
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
