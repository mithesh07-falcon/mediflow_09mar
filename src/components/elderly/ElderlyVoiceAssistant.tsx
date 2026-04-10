
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { loadAccessibilitySettings } from "@/lib/elderly-portal";

type VoiceIntent = "home" | "doctor" | "medicines" | "help";

type LangConfig = {
    code: string;
    fontFamily: string;
    scriptPattern?: RegExp;
    listening: string;
    unrecognized: string;
    languageOnlyMessage?: string;
    opening: Record<VoiceIntent, string>;
    commands: Record<VoiceIntent, string[]>;
    hints: string[];
};

const ROUTES: Record<VoiceIntent, string> = {
    home: "/dashboard/elderly",
    doctor: "/dashboard/elderly/doctor",
    medicines: "/dashboard/elderly/medicines",
    help: "/dashboard/elderly/help",
};

const LANG_CONFIG: Record<string, LangConfig> = {
    Tamil: {
        code: "ta-IN",
        fontFamily: "'Noto Sans Tamil','Latha','Vijaya',sans-serif",
        scriptPattern: /[\u0B80-\u0BFF]/,
        listening: "கேட்கிறேன்...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "தமிழில் மட்டும் பேசவும்",
        opening: {
            home: "முகப்பை திறக்கிறேன்",
            doctor: "மருத்துவர் பகுதியை திறக்கிறேன்",
            medicines: "மருந்துகள் பக்கத்தை திறக்கிறேன்",
            help: "உதவி பகுதியை திறக்கிறேன்",
        },
        commands: {
            home: ["முகப்பு", "வீடு", "ஹோம்"],
            doctor: ["மருத்துவர்", "டாக்டர்", "மருத்துவம்"],
            medicines: ["மருந்துகள்", "மருந்து", "மாத்திரை"],
            help: ["உதவி", "சஹாயம்", "ஹெல்ப்"],
        },
        hints: ["முகப்பு", "மருத்துவர்", "மருந்துகள்", "உதவி"],
    },
    Hindi: {
        code: "hi-IN",
        fontFamily: "'Noto Sans Devanagari','Mangal',sans-serif",
        scriptPattern: /[\u0900-\u097F]/,
        listening: "सुन रहा हूँ...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "कृपया चुनी हुई भाषा में बोलें",
        opening: {
            home: "होम पेज खोल रहा हूँ",
            doctor: "डॉक्टर सेक्शन खोल रहा हूँ",
            medicines: "दवाइयों का पेज खोल रहा हूँ",
            help: "सहायता सेक्शन खोल रहा हूँ",
        },
        commands: {
            home: ["मुख्य", "होम", "घर"],
            doctor: ["डॉक्टर", "चिकित्सक", "मेडिकल"],
            medicines: ["दवाई", "दवाइयां", "गोली"],
            help: ["मदद", "सहायता", "हेल्प"],
        },
        hints: ["मुख्य", "डॉक्टर", "दवाई", "मदद"],
    },
    Telugu: {
        code: "te-IN",
        fontFamily: "'Noto Sans Telugu','Gautami',sans-serif",
        scriptPattern: /[\u0C00-\u0C7F]/,
        listening: "వింటున్నాను...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "దయచేసి ఎంచుకున్న భాషలో మాట్లాడండి",
        opening: {
            home: "హోమ్ పేజీ తెరవబడుతోంది",
            doctor: "డాక్టర్ విభాగం తెరవబడుతోంది",
            medicines: "మందుల పేజీ తెరవబడుతోంది",
            help: "సహాయ విభాగం తెరవబడుతోంది",
        },
        commands: {
            home: ["హోమ్", "ఇల్లు"],
            doctor: ["డాక్టర్", "వైద్యుడు"],
            medicines: ["మందులు", "మందు"],
            help: ["సహాయం", "హెల్ప్"],
        },
        hints: ["హోమ్", "డాక్టర్", "మందులు", "సహాయం"],
    },
    Kannada: {
        code: "kn-IN",
        fontFamily: "'Noto Sans Kannada','Tunga',sans-serif",
        scriptPattern: /[\u0C80-\u0CFF]/,
        listening: "ಕೆಳುತ್ತಿದ್ದೇನೆ...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "ದಯವಿಟ್ಟು ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆಯಲ್ಲೇ ಮಾತನಾಡಿ",
        opening: {
            home: "ಮುಖಪುಟ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
            doctor: "ವೈದ್ಯರ ವಿಭಾಗ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
            medicines: "ಔಷಧಿಗಳ ಪುಟ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
            help: "ಸಹಾಯ ವಿಭಾಗ ತೆರೆಯಲಾಗುತ್ತಿದೆ",
        },
        commands: {
            home: ["ಮುಖಪುಟ", "ಮನೆ"],
            doctor: ["ವೈದ್ಯರು", "ಡಾಕ್ಟರ್"],
            medicines: ["ಔಷಧ", "ಮಾತ್ರೆ"],
            help: ["ಸಹಾಯ"],
        },
        hints: ["ಮುಖಪುಟ", "ವೈದ್ಯರು", "ಔಷಧ", "ಸಹಾಯ"],
    },
    Bengali: {
        code: "bn-IN",
        fontFamily: "'Noto Sans Bengali','Vrinda',sans-serif",
        scriptPattern: /[\u0980-\u09FF]/,
        listening: "শুনছি...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "দয়া করে নির্বাচিত ভাষায় বলুন",
        opening: {
            home: "হোম পেজ খোলা হচ্ছে",
            doctor: "ডাক্তার সেকশন খোলা হচ্ছে",
            medicines: "ওষুধের পেজ খোলা হচ্ছে",
            help: "হেল্প সেকশন খোলা হচ্ছে",
        },
        commands: {
            home: ["হোম", "বাড়ি"],
            doctor: ["ডাক্তার"],
            medicines: ["ওষুধ"],
            help: ["সাহায্য", "হেল্প"],
        },
        hints: ["হোম", "ডাক্তার", "ওষুধ", "সাহায্য"],
    },
    Marathi: {
        code: "mr-IN",
        fontFamily: "'Noto Sans Devanagari','Mangal',sans-serif",
        scriptPattern: /[\u0900-\u097F]/,
        listening: "ऐकत आहे...",
        unrecognized: "Command not recognized, please try again",
        languageOnlyMessage: "कृपया निवडलेल्या भाषेत बोला",
        opening: {
            home: "मुख्यपृष्ठ उघडत आहे",
            doctor: "डॉक्टर विभाग उघडत आहे",
            medicines: "औषधांचे पान उघडत आहे",
            help: "मदत विभाग उघडत आहे",
        },
        commands: {
            home: ["मुख्यपृष्ठ", "घर"],
            doctor: ["डॉक्टर"],
            medicines: ["औषध", "गोळी"],
            help: ["मदत", "हेल्प"],
        },
        hints: ["मुख्यपृष्ठ", "डॉक्टर", "औषध", "मदत"],
    },
    English: {
        code: "en-US",
        fontFamily: "Inter, sans-serif",
        listening: "Listening...",
        unrecognized: "Command not recognized, please try again",
        opening: {
            home: "Opening Home Page",
            doctor: "Opening Doctor Section",
            medicines: "Opening Medicines Page",
            help: "Opening Help Section",
        },
        commands: {
            home: ["home"],
            doctor: ["doctor"],
            medicines: ["medicines", "medicine"],
            help: ["help"],
        },
        hints: ["home", "doctor", "medicines", "help"],
    },
};

export function ElderlyVoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [statusText, setStatusText] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [preferredLanguage, setPreferredLanguage] = useState("English");
    const router = useRouter();
    const { toast } = useToast();
    const recognitionRef = useRef<any>(null);
    const handledRef = useRef(false);

    const langConfig = LANG_CONFIG[preferredLanguage] || LANG_CONFIG.English;

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (user.language) setPreferredLanguage(user.language);
    }, []);

    useEffect(() => {
        if (isListening) return;
        if (!statusText && !transcript) return;
        const timer = setTimeout(() => {
            setStatusText("");
            setTranscript("");
        }, 3000);
        return () => clearTimeout(timer);
    }, [isListening, statusText, transcript]);

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langConfig.code;
        utterance.rate = loadAccessibilitySettings().voiceRate || 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, [langConfig]);

    const findIntent = (command: string): VoiceIntent | null => {
        const normalized = command.toLowerCase().trim();
        const commandEntries = Object.entries(langConfig.commands) as [VoiceIntent, string[]][];

        for (const [intent, keywords] of commandEntries) {
            if (keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
                return intent;
            }
        }
        return null;
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // no-op
            }
        }
    };

    const handleCommand = (command: string) => {
        const trimmed = command.trim();
        if (!trimmed) return;

        if (langConfig.scriptPattern && !langConfig.scriptPattern.test(trimmed)) {
            const msg = langConfig.languageOnlyMessage || langConfig.unrecognized;
            setStatusText(msg);
            toast({ title: msg, variant: "destructive" });
            speak(msg);
            return;
        }

        const intent = findIntent(trimmed);
        if (!intent) {
            setStatusText(langConfig.unrecognized);
            toast({ title: langConfig.unrecognized, variant: "destructive" });
            speak(langConfig.unrecognized);
            return;
        }

        const openingMessage = langConfig.opening[intent];
        setStatusText(openingMessage);
        speak(openingMessage);
        router.push(ROUTES[intent]);
    };

    const startListening = () => {
        if (isListening) {
            stopListening();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            speak("Voice recognition is not supported in your browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = langConfig.code;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        handledRef.current = false;
        recognitionRef.current = recognition;
        setTranscript("");

        recognition.onstart = () => {
            setIsListening(true);
            setStatusText(langConfig.listening);
        };

        recognition.onresult = (event: any) => {
            let finalText = "";
            let interimText = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0]?.transcript || "";
                if (event.results[i].isFinal) {
                    finalText += ` ${text}`;
                } else {
                    interimText += ` ${text}`;
                }
            }

            const combined = `${finalText} ${interimText}`.trim();
            if (combined) setTranscript(combined);

            const finalCommand = finalText.trim().toLowerCase();
            if (finalCommand && !handledRef.current) {
                handledRef.current = true;
                handleCommand(finalCommand);
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            setStatusText(langConfig.unrecognized);
            toast({ title: langConfig.unrecognized, variant: "destructive" });
            speak(langConfig.unrecognized);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <>
            <Button
                className={`fixed bottom-10 right-10 h-40 w-40 rounded-full shadow-2xl border-[12px] border-black transition-all z-50 ${isListening ? 'bg-red-600 scale-110' : 'bg-black text-white hover:bg-zinc-800'}`}
                onClick={startListening}
            >
                {isListening ? <Loader2 className="h-20 w-20 animate-spin" /> : <Mic className="h-20 w-20" />}
            </Button>

            {(isListening || transcript || statusText) && (
                <div className="fixed inset-0 bg-white/95 flex items-center justify-center z-[100] p-10">
                    <div className="text-center space-y-12 text-black max-w-4xl">
                        <div className="h-64 w-64 bg-black rounded-full flex items-center justify-center mx-auto animate-pulse border-[15px] border-black">
                            <Mic className="h-32 w-32 text-white" />
                        </div>
                        <h2 className="text-8xl font-black uppercase tracking-tight">{statusText || langConfig.listening}</h2>
                        <p className="text-3xl font-black text-slate-500">Language: {preferredLanguage}</p>
                        {transcript && (
                            <p
                                className="text-5xl font-bold bg-slate-100 p-8 rounded-3xl border-4 border-black italic"
                                style={{ fontFamily: langConfig.fontFamily }}
                            >
                                "{transcript}"
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-6 text-2xl font-black opacity-40" style={{ fontFamily: langConfig.fontFamily }}>
                            {langConfig.hints.map((hint) => (
                                <p key={hint}>"{hint}"</p>
                            ))}
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
