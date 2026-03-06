
"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ElderlyVoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const router = useRouter();

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for elderly
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            speak("Voice recognition is not supported in your browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            speak("Listening...");
        };

        recognition.onresult = (event: any) => {
            const command = event.results[0][0].transcript.toLowerCase();
            setTranscript(command);
            handleCommand(command);
        };

        recognition.onerror = () => {
            setIsListening(false);
            speak("I didn't catch that. Please try again.");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleCommand = (command: string) => {
        if (command.includes("medicine") || command.includes("pill") || command.includes("tablet")) {
            speak("Opening your medicines page.");
            router.push("/dashboard/elderly/medicines");
        } else if (command.includes("checklist") || command.includes("tasks") || command.includes("today")) {
            speak("Opening your daily checklist.");
            router.push("/dashboard/elderly/checklist");
        } else if (command.includes("health") || command.includes("blood") || command.includes("tracking")) {
            speak("Opening your health tracking.");
            router.push("/dashboard/elderly/health");
        } else if (command.includes("home") || command.includes("back") || command.includes("dashboard")) {
            speak("Going back to the home screen.");
            router.push("/dashboard/elderly");
        } else if (command.includes("help") || command.includes("doctor") || command.includes("call")) {
            speak("Opening doctor contact page.");
            router.push("/dashboard/elderly/doctor");
        } else if (command.includes("wallet") || command.includes("money") || command.includes("balance")) {
            const balance = 5000;
            speak(`Your family wallet balance is ${balance} rupees.`);
        } else {
            speak(`I heard ${command}. I'm not sure what to do with that. Try saying medicines or checklist.`);
        }
    };

    return (
        <>
            <Button
                className={`fixed bottom-10 right-10 h-40 w-40 rounded-full shadow-2xl border-[12px] border-black transition-all z-50 ${isListening ? 'bg-red-600 scale-110' : 'bg-black text-white hover:bg-zinc-800'}`}
                onClick={startListening}
            >
                {isListening ? <Loader2 className="h-20 w-20 animate-spin" /> : <Mic className="h-20 w-20" />}
            </Button>

            {isListening && (
                <div className="fixed inset-0 bg-white/95 flex items-center justify-center z-[100] p-10">
                    <div className="text-center space-y-12 text-black max-w-4xl">
                        <div className="h-64 w-64 bg-black rounded-full flex items-center justify-center mx-auto animate-pulse border-[15px] border-black">
                            <Mic className="h-32 w-32 text-white" />
                        </div>
                        <h2 className="text-8xl font-black uppercase tracking-tight">Listening...</h2>
                        {transcript && <p className="text-5xl font-bold bg-slate-100 p-8 rounded-3xl border-4 border-black italic">"{transcript}"</p>}
                        <div className="grid grid-cols-2 gap-6 text-2xl font-black opacity-40 uppercase">
                            <p>"Go to Medicines"</p>
                            <p>"Daily Checklist"</p>
                            <p>"Health Status"</p>
                            <p>"Go Home"</p>
                        </div>
                    </div>
                </div>
            )}

            {isSpeaking && !isListening && (
                <div className="fixed bottom-10 left-10 bg-black text-white px-10 py-6 rounded-full flex items-center gap-6 border-[8px] border-black shadow-2xl z-50 animate-bounce">
                    <Headphones className="h-10 w-10" />
                    <span className="text-3xl font-black uppercase">MediBot Speaking...</span>
                </div>
            )}
        </>
    );
}
