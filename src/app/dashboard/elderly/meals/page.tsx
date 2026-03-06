
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Utensils, CheckCircle2, History, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Meal {
    id: string;
    name: string;
    time: string;
    photo: string;
    dishName: string;
    status: "verified" | "pending";
}

export default function ElderlyMealsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [meals, setMeals] = useState<Meal[]>([
        { id: "1", name: "Breakfast", time: "09:30 AM", photo: "https://picsum.photos/seed/oats1/600/400", dishName: "Oats with Honey", status: "verified" },
        { id: "2", name: "Lunch", time: "01:30 PM", photo: "", dishName: "", status: "pending" },
    ]);

    useEffect(() => {
        const startCamera = async () => {
            if (isCapturing) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (err) {
                    console.error("Camera error", err);
                }
            }
        };
        startCamera();
    }, [isCapturing]);

    const handleCapture = () => {
        setIsCapturing(true);
        setCapturedPhoto(null);
    };

    const takePhoto = () => {
        // Mock photo taking
        setCapturedPhoto("https://picsum.photos/seed/meal/600/400");
        setIsCapturing(false);
        toast({
            title: "Meal Registered! 🥗",
            description: "Guardian has been notified of your healthy meal.",
        });

        // Update lunch status
        setMeals(meals.map(m => m.name === "Lunch" ? { ...m, photo: "https://picsum.photos/seed/meal/600/400", dishName: "Registered Meal", status: "verified" } : m));
    };

    return (
        <div className="min-h-screen bg-white text-black p-10 space-y-16">
            <Button
                className="h-32 px-16 text-5xl font-black bg-black text-white rounded-[3rem] border-[12px] border-black flex items-center gap-8 shadow-2xl"
                onClick={() => router.push('/dashboard/elderly')}
            >
                <ArrowLeft className="h-20 w-20" />
                GO HOME
            </Button>

            <h1 className="text-9xl font-black uppercase underline decoration-[20px] decoration-orange-100 underline-offset-8">Meal Tracker</h1>

            {!isCapturing ? (
                <div className="space-y-14">
                    <Button
                        className="w-full h-56 text-7xl font-black bg-orange-600 text-white border-[15px] border-black rounded-[5rem] flex items-center justify-center gap-10 shadow-3xl hover:bg-orange-700"
                        onClick={handleCapture}
                    >
                        <Camera className="h-32 w-32" />
                        SNAP MY MEAL
                    </Button>

                    <div className="space-y-10">
                        <h2 className="text-7xl font-black uppercase flex items-center gap-6">
                            <History className="h-16 w-16" /> Recent Food
                        </h2>
                        {meals.map((meal) => (
                            <div key={meal.id} className="p-10 border-[12px] border-black rounded-[4rem] bg-white shadow-2xl flex items-center gap-12">
                                <div className="h-48 w-64 rounded-[3rem] border-8 border-black overflow-hidden relative bg-slate-100 flex items-center justify-center">
                                    {meal.photo ? (
                                        <img src={meal.photo} alt={meal.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <Utensils className="h-20 w-20 opacity-10" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-4xl font-black uppercase text-orange-600">{meal.time}</p>
                                    <h3 className="text-7xl font-black uppercase">{meal.name}</h3>
                                    {meal.dishName && <p className="text-4xl font-bold opacity-60 uppercase">{meal.dishName}</p>}
                                </div>
                                {meal.status === 'verified' && (
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 className="h-24 w-24 text-green-600" />
                                        <span className="text-2xl font-black uppercase text-green-700">Done</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="fixed inset-0 bg-white z-[200] p-10 flex flex-col items-center justify-center space-y-12">
                    <div className="bg-black p-8 rounded-[4rem] text-white w-full max-w-5xl text-center">
                        <h2 className="text-6xl font-black uppercase">Center Your Plate</h2>
                    </div>
                    <div className="relative w-full max-w-4xl aspect-[4/3] bg-slate-100 rounded-[5rem] overflow-hidden border-[15px] border-black shadow-4xl">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                        <div className="absolute inset-0 border-[40px] border-white/20 pointer-events-none" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 border-8 border-dashed border-white/50 rounded-full" />
                    </div>

                    <div className="flex items-center gap-10 w-full max-w-4xl">
                        <Button
                            variant="destructive"
                            className="flex-1 h-44 text-5xl font-black rounded-[3rem] border-[10px] border-black flex items-center justify-center gap-6"
                            onClick={() => setIsCapturing(false)}
                        >
                            <RotateCcw className="h-16 w-16" />
                            CANCEL
                        </Button>
                        <Button
                            className="flex-[2] h-44 text-7xl font-black bg-black text-white rounded-[3rem] border-[10px] border-black flex items-center justify-center gap-10 hover:bg-zinc-800"
                            onClick={takePhoto}
                        >
                            <Camera className="h-20 w-20" />
                            SNAP!
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
