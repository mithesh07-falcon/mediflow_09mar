
"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ElderlyVoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [preferredLanguage, setPreferredLanguage] = useState("English");
    const router = useRouter();

    const langMap: any = {
        English: { code: "en-US", keywords: ["medicine", "pill", "tablet", "checklist", "task", "today", "health", "blood", "home", "back", "dashboard", "help", "doctor", "call", "wallet", "money"] },
        Hindi: { code: "hi-IN", keywords: ["दवाई", "गोली", "चेकलिस्ट", "काम", "आज", "स्वास्थ्य", "खून", "घर", "वापस", "डैशबोर्ड", "मदद", "डॉक्टर", "कॉल", "वॉलेट", "पैसा"] },
        Tamil: { code: "ta-IN", keywords: ["மருந்து", "மாத்திரை", "பட்டியல்", "வேலை", "இன்று", "ஆரோக்கியம்", "இரத்தம்", "வீடு", "திரும்பி", "டாஷ்போர்டு", "உதவி", "டாக்டர்", "அழைப்பு", "வாலட்", "பணம்"] },
        Telugu: { code: "te-IN", keywords: ["మందు", "మాత్ర", "జాబితా", "పని", "నేడు", "ఆరోగ్యం", "రక్తం", "ఇల్లు", "తిరిగి", "డాష్బోర్డ్", "సహాయం", "డాక్టర్", "కాల్", "వాలెట్", "డబ్బు"] },
        Kannada: { code: "kn-IN", keywords: ["ಔಷಧ", "ಮಾತ್ರೆ", "ಪಟ್ಟಿ", "ಕೆಲಸ", "ಇಂದು", "ಆರೋಗ್ಯ", "ರಕ್ತ", "ಮನೆ", "ಹಿಂದೆ", "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "ಸಹಾಯ", "ವೈದ್ಯರು", "ಕರೆ", "ವಾಲೆಟ್", "ಹಣ"] },
        Bengali: { code: "bn-IN", keywords: ["ওষুধ", "বড়ি", "তালিকা", "কাজ", "আজ", "স্বাস্থ্য", "রক্ত", "বাড়ি", "ফিরে", "ড্যাশবোর্ড", "সাহায্য", "ডাক্তার", "কল", "ওয়ালেট", "টাকা"] },
        Marathi: { code: "mr-IN", keywords: ["औषध", "गोळी", "यादी", "काम", "आज", "आरोग्य", "रक्त", "घर", "परत", "डॅशबोर्ड", "मदत", "डॉक्टर", "कॉल", "वॉलेट", "पैसा"] }
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
        if (user.language) setPreferredLanguage(user.language);
    }, []);

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langMap[preferredLanguage]?.code || "en-US";
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, [preferredLanguage, langMap]);

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            speak("Voice recognition is not supported in your browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = langMap[preferredLanguage]?.code || 'en-US';
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
        const k = langMap[preferredLanguage]?.keywords || langMap.English.keywords;

        const langPrompts: any = {
            English: { meds: "Opening your medicines page.", checklist: "Opening your daily checklist.", health: "Opening your health tracking.", home: "Going back to the home screen.", doctor: "Opening doctor contact page.", help: "Try saying medicines or checklist." },
            Hindi: { meds: "आपकी दवाइयों का पेज खोल रही हूँ।", checklist: "आपकी डेली चेकलिस्ट खोल रही हूँ।", health: "आपका स्वास्थ्य ट्रैकिंग खोल रही हूँ।", home: "होम स्क्रीन पर वापस जा रही हूँ।", doctor: "डॉक्टर का कांटेक्ट पेज खोल रही हूँ।", help: "दवाइयां या चेकलिस्ट बोलें।" },
            Tamil: { meds: "உங்கள் மருந்துகளின் பக்கத்தைத் திறக்கிறேன்.", checklist: "உங்கள் தினசரி சரிபார்ப்புப் பட்டியலைத் திறக்கிறேன்.", health: "உங்கள் சுகாதார கண்காணிப்பைத் திறக்கிறேன்.", home: "முகப்புத் திரைக்குத் திரும்புதல்.", doctor: "டாக்டரின் தொடர்பு பக்கத்தைத் திறக்கிறது.", help: "மருந்துகள் அல்லது பட்டியலைச் சொல்ல முயற்சிக்கவும்." }
            // Add more as needed
        };

        const p = langPrompts[preferredLanguage] || langPrompts.English;

        if (command.includes(k[0]) || command.includes(k[1]) || command.includes(k[2])) {
            speak(p.meds);
            router.push("/dashboard/elderly/medicines");
        } else if (command.includes(k[3]) || command.includes(k[4]) || command.includes(k[5])) {
            speak(p.checklist);
            router.push("/dashboard/elderly/checklist");
        } else if (command.includes(k[6]) || command.includes(k[7]) || command.includes(k[8])) {
            speak(p.health);
            router.push("/dashboard/elderly/health");
        } else if (command.includes(k[9]) || command.includes(k[10]) || command.includes(k[11])) {
            speak(p.home);
            router.push("/dashboard/elderly");
        } else if (command.includes(k[12]) || command.includes(k[13]) || command.includes(k[14])) {
            speak(p.doctor);
            router.push("/dashboard/elderly/doctor");
        } else if (command.includes(k[15]) || command.includes(k[16]) || command.includes(k[17])) {
            const balance = 5000;
            const balMsg = preferredLanguage === "Hindi" ? `आपका फैमिली वॉलेट बैलेंस ५००० रुपये है।` : `Your family wallet balance is ${balance} rupees.`;
            speak(balMsg);
        } else {
            speak(p.help);
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
                            <p>"{preferredLanguage === 'Hindi' ? 'दवाइयां खोलें' : 'Go to Medicines'}"</p>
                            <p>"{preferredLanguage === 'Hindi' ? 'चेकलिस्ट दिखाएं' : 'Daily Checklist'}"</p>
                            <p>"{preferredLanguage === 'Hindi' ? 'स्वास्थ्य स्थिति' : 'Health Status'}"</p>
                            <p>"{preferredLanguage === 'Hindi' ? 'घर चलो' : 'Go Home'}"</p>
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
