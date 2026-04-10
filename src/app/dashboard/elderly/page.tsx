
"use client";

import { GlobalSync } from "@/lib/sync-service";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pill,
  Phone,
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Wallet,
  ShieldCheck,
  ClipboardList,
  Activity,
  Utensils,
  Languages,
  Calendar,
  Clock,
  QrCode,
  Settings2,
  Siren,
  ReceiptText,
  WifiOff,
  CircleHelp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ElderlyVoiceAssistant } from "@/components/elderly/ElderlyVoiceAssistant";
import { Stethoscope } from "lucide-react";
import { detectPill } from "@/ai/flows/ai-pill-scanner";
import { captureVideoFrameForServerAction } from "@/lib/image-payload";
import {
  appendGuardianNotification,
  applyAccessibilitySettings,
  getDefaultEmergencyContactFromUser,
  loadAccessibilitySettings,
  loadEmergencyContacts,
  saveEmergencyContacts,
} from "@/lib/elderly-portal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Feature 2: Translation Dashboard
const translationsList: any = {
  English: {
    hello: "HELLO",
    guardian: "Guardian",
    guardianName: "Guardian Name",
    relationship: "Relationship",
    reason: "Reason",
    wallet: "Family Wallet",
    refillSnippet: "ORDER REFILL",
    checkPill: "CHECK PILL",
    myPills: "MY PILLS",
    livingList: "LIVING LIST",
    healthData: "HEALTH DATA",
    mealTracker: "MEAL TRACKER",
    sos: "SOS ALARM",
    safetyShield: "Safety Shield Active",
    watching: "Watching over you 24/7",
    logout: "LOG OUT",
    scanning: "Scanning your pill. Please hold it steady.",
    analyzing: "Analyzing...",
    done: "Done. This is your Blood Pressure medicine. It is safe to take now.",
    orderSuccessful: "Order Successful",
    refillTomorrow: "Refill arriving tomorrow. Paid via Family Wallet.",
    emergencyAlert: "Emergency alert triggered. I am calling your guardian right now.",
    noActivity: "No activity detected. Sending a check in message to your guardian.",
    safetyCheck: "SAFETY CHECK",
    inactivityDesc: "No activity for 60 seconds. Sending \"Check-In\" SMS to",
    langCode: "en-US"
  },
  Hindi: {
    hello: "नमस्ते",
    guardian: "अभिभावक",
    guardianName: "अभिभावक का नाम",
    relationship: "रिश्ता",
    reason: "कारण",
    wallet: "फैमिली वॉलेट",
    refillSnippet: "दवाई मंगवाएं",
    checkPill: "दवाई जांचें",
    myPills: "मेरी दवाइयां",
    livingList: "लिविंग लिस्ट",
    healthData: "स्वास्थ्य डेटा",
    mealTracker: "भोजन ट्रैकर",
    sos: "एसओएस अलार्म",
    safetyShield: "सुरक्षा कवच सक्रिय",
    watching: "आपकी 24/7 निगरानी",
    logout: "लॉगआउट",
    scanning: "आपकी दवा को स्कैन कर रहा है। कृपया इसे स्थिर रखें।",
    analyzing: "विश्लेषण कर रहा है...",
    done: "हो गया। यह आपकी रक्तचाप की दवा है। इसे अब लेना सुरक्षित है।",
    orderSuccessful: "ऑर्डर सफल रहा",
    refillTomorrow: "रिफिल कल आ जाएगा। फैमिली वॉलेट से भुगतान किया गया।",
    emergencyAlert: "आपातकालीन अलर्ट शुरू हो गया है। मैं अभी आपके अभिभावक को कॉल कर रहा हूं।",
    noActivity: "कोई गतिविधि नहीं मिली। आपके अभिभावक को एक चेक-इन संदेश भेज रहा हूं।",
    safetyCheck: "सुरक्षा जांच",
    inactivityDesc: "60 सेकंड तक कोई गतिविधि नहीं। चेक-इन एसएमएस भेज रहा हूँ",
    langCode: "hi-IN"
  },
  Tamil: {
    hello: "வணக்கம்",
    guardian: "பாதுகாவலர்",
    guardianName: "பாதுகாவலர் பெயர்",
    relationship: "உறவு",
    reason: "காரணம்",
    wallet: "குடும்ப வாலட்",
    refillSnippet: "மருந்து ஆர்டர் செய்",
    checkPill: "மருந்தை சரிபார்",
    myPills: "எனது மருந்துகள்",
    livingList: "வாழ்க்கைப் பட்டியல்",
    healthData: "சுகாதார தரவு",
    mealTracker: "உணவு டிராக்கர்",
    sos: "SOS அலாரம்",
    safetyShield: "பாதுகாப்பு கவசம் செயலில் உள்ளது",
    watching: "24/7 உங்களைக் கவனிக்கிறது",
    logout: "வெளியேறு",
    scanning: "உங்கள் மாத்திரையை ஸ்கேன் செய்கிறது. தயவுசெய்து அதை அசையாமல் பிடிக்கவும்.",
    analyzing: "ஆராய்கிறது...",
    done: "முடிந்தது. இது உங்கள் இரத்த அழுத்த மருந்து. இப்போது எடுத்துக்கொள்வது பாதுகாப்பானது.",
    orderSuccessful: "ஆர்டர் வெற்றி",
    refillTomorrow: "மறு நிரப்புதல் நாளை வரும். குடும்ப வாலட் மூலம் பணம் செலுத்தப்பட்டது.",
    emergencyAlert: "அவசரகால எச்சரிக்கை தூண்டப்பட்டது. நான் இப்போது உங்கள் பாதுகாவலரை அழைக்கிறேன்.",
    noActivity: "செயல்பாடு எதுவும் கண்டறியப்படவில்லை. உங்கள் பாதுகாவலருக்கு செக்-இன் செய்தியை அனுப்புகிறேன்.",
    safetyCheck: "பாதுகாப்பு சோதனை",
    inactivityDesc: "60 வினாடிகளாகச் செயல்பாடு இல்லை. பாதுகாவலருக்கு SMS அனுப்புகிறது",
    langCode: "ta-IN"
  },
  Telugu: {
    hello: "నమస్కారం",
    guardian: "సంరక్షకుడు",
    guardianName: "సంరక్షకుడి పేరు",
    relationship: "సంబంధం",
    reason: "కారణం",
    wallet: "ఫ్యామిలీ వాలెట్",
    refillSnippet: "మందు ఆర్డర్",
    checkPill: "మందు తనిఖీ",
    myPills: "నా మందులు",
    livingList: "జీవన జాబితా",
    healthData: "ఆరోగ్య డేటా",
    mealTracker: "భోజన ట్రాకర్",
    sos: "SOS అలారం",
    safetyShield: "రక్షణ కవచం క్రియాశీలంగా ఉంది",
    watching: "24/7 మిమ్మల్ని గమనిస్తోంది",
    logout: "లాగ్ అవుట్",
    scanning: "మీ మాత్రను స్కాన్ చేస్తోంది. దయచేసి దాన్ని కదలకుండా పట్టుకోండి.",
    analyzing: "విశ్లేషిస్తోంది...",
    done: "పూర్తయింది. ఇది మీ రక్తపోటు మందు. దీన్ని ఇప్పుడు తీసుకోవడం సురక్షితం.",
    orderSuccessful: "ఆర్డర్ విజయవంతమైంది",
    refillTomorrow: "మందులు రేపు అందుతాయి. ఫ్యామిలీ వాలెట్ ద్వారా చెల్లించబడింది.",
    emergencyAlert: "అత్యవసర హెచ్చరిక ప్రారంభమైంది. నేను ఇప్పుడే మీ సంరక్షకుడికి కాల్ చేస్తున్నాను.",
    noActivity: "ఎటువంటి కార్యాచరణ కనుగొనబడలేదు. మీ సంరక్షకుడికి ఒక సందేశం పంపుతున్నాను.",
    safetyCheck: "భద్రతా తనిఖీ",
    inactivityDesc: "60 సెకన్ల పాటు ఎటువంటి కార్యకలాపాలు లేవు. SMS పంపుతోంది",
    langCode: "te-IN"
  },
  Kannada: {
    hello: "ನಮಸ್ಕಾರ",
    guardian: "ಪೋಷಕರು",
    guardianName: "ಪೋಷಕರ ಹೆಸರು",
    relationship: "ಸಂಬಂಧ",
    reason: "ಕಾರಣ",
    wallet: "ಫ್ಯಾಮಿಲಿ ವಾಲೆಟ್",
    refillSnippet: "ಔಷಧಿ ಆರ್ಡರ್",
    checkPill: "ಔಷಧಿ ಪರೀಕ್ಷಿಸಿ",
    myPills: "ನನ್ನ ಔಷಧಿಗಳು",
    livingList: "ಜೀವನ ಪಟ್ಟಿ",
    healthData: "ಆರೋಗ್ಯ ಡೇಟಾ",
    mealTracker: "ಊಟದ ಟ್ರ್ಯಾಕರ್",
    sos: "SOS ಅಲಾರಾಂ",
    safetyShield: "ಸುರಕ್ಷಾ ಕವಚ ಸಕ್ರಿಯವಾಗಿದೆ",
    watching: "24/7 ನಿಮ್ಮನ್ನು ಗಮನಿಸುತ್ತಿದೆ",
    logout: "ಲಾಗ್ ಔಟ್",
    scanning: "ನಿಮ್ಮ ಮಾತ್ರೆಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಅದನ್ನು ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ.",
    analyzing: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    done: "ಮುಗಿದಿದೆ. ಇದು ನಿಮ್ಮ ರಕ್ತದೊತ್ತಡದ ಔಷಧಿ. ಇದನ್ನು ಈಗ ತೆಗೆದುಕೊಳ್ಳುವುದು ಸುರಕ್ಷಿತ.",
    orderSuccessful: "ಆರ್ಡರ್ ಯಶಸ್ವಿಯಾಗಿದೆ",
    refillTomorrow: "ಔಷಧಿ ನಾಳೆ ತಲುಪುತ್ತದೆ. ಫ್ಯಾಮಿಲಿ ವಾಲೆಟ್ ಮೂಲಕ ಪಾವತಿಸಲಾಗಿದೆ.",
    emergencyAlert: "ತುರ್ತು ಎಚ್ಚರಿಕೆ ರವಾನೆಯಾಗಿದೆ. ನಾನು ಈಗ ನಿಮ್ಮ ಪೋಷಕರಿಗೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ.",
    noActivity: "ಯಾವುದೇ ಚಟುವಟಿಕೆ ಕಂಡುಬಂದಿಲ್ಲ. ನಿಮ್ಮ ಪೋಷಕರಿಗೆ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ.",
    safetyCheck: "ಸುರಕ್ಷತಾ ತಪಾಸಣೆ",
    inactivityDesc: "60 ಸೆಕೆಂಡ್‌ಗಳವರೆಗೆ ಯಾವುದೇ ಚಟುವಟಿಕೆ ಇಲ್ಲ. SMS ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ",
    langCode: "kn-IN"
  },
  Bengali: {
    hello: "হ্যালো",
    guardian: "অভিভাবক",
    guardianName: "অভিভাবকের নাম",
    relationship: "সম্পর্ক",
    reason: "কারণ",
    wallet: "ফ্যামিলি ওয়ালেট",
    refillSnippet: "ওষুধ অর্ডার করুন",
    checkPill: "ওষুধ পরীক্ষা",
    myPills: "আমার ওষুধ",
    livingList: "লিভিং লিস্ট",
    healthData: "স্বাস্থ্য তথ্য",
    mealTracker: "খাবার ট্র্যাকার",
    sos: "SOS অ্যালার্ম",
    safetyShield: "সুরক্ষা কবচ সক্রিয়",
    watching: "24/7 আপনার নজরদারি করছে",
    logout: "লগ আউট",
    scanning: "আপনার ওষুধ স্ক্যান করা হচ্ছে। দয়া করে এটি স্থির রাখুন।",
    analyzing: "বিশ্লেষণ করা হচ্ছে...",
    done: "সম্পন্ন। এটি আপনার রক্তচাপের ওষুধ। এটি এখন নেওয়া নিরাপদ।",
    orderSuccessful: "অর্ডার সফল",
    refillTomorrow: "ওষুধ আগামীকাল পৌঁছাবে। ফ্যামিলি ওয়ালেট থেকে অর্থ প্রদান করা হয়েছে।",
    emergencyAlert: "জরুরী সতর্কতা জারি করা হয়েছে। আমি এখনই আপনার অভিভাবককে ফোন করছি।",
    noActivity: "কোনও কার্যকলাপ পাওয়া যায়নি। আপনার অভিভাবককে একটি বার্তা পাঠানো হচ্ছে।",
    safetyCheck: "সুরক্ষা চেক",
    inactivityDesc: "৬০ সেকেন্ড ধরে কোনও কার্যকলাপ নেই। SMS পাঠানো হচ্ছে",
    langCode: "bn-IN"
  },
  Marathi: {
    hello: "नमस्कार",
    guardian: "पालक",
    guardianName: "पालकाचे नाव",
    relationship: "नाते",
    reason: "कारण",
    wallet: "फॅमिली वॉलेट",
    refillSnippet: "औषध मागवा",
    checkPill: "औषध तपासा",
    myPills: "माझी औषधे",
    livingList: "लिव्हिंग लिस्ट",
    healthData: "आरोग्य डेटा",
    mealTracker: "जेवण ट्रॅकर",
    sos: "SOS अलार्म",
    safetyShield: "सुरक्षा कवच सक्रिय",
    watching: "24/7 तुमची काळजी घेत आहे",
    logout: "लॉग आउट",
    scanning: "तुमच्या गोळीचे स्कॅनिंग होत आहे. कृपया ती स्थिर धरा.",
    analyzing: "विश्लेषण करत आहे...",
    done: "पूर्ण झाले. हे तुमचे रक्तदाबाचे औषध आहे. हे आता घेणे सुरक्षित आहे.",
    orderSuccessful: "ऑर्डर यशस्वी",
    refillTomorrow: "औषध उद्या येईल. फॅमिली वॉलेटद्वारे पैसे भरले आहेत।",
    emergencyAlert: "आणीबाणीचा इशारा देण्यात आला आहे. मी आता तुमच्या पालकांना फोन करत आहे.",
    noActivity: "कोणतीही हालचाल आढळली नाही. तुमच्या पालकांना निरोप पाठवत आहे.",
    safetyCheck: "सुरक्षा तपासणी",
    inactivityDesc: "60 सेकंद कोणतीही हालचाल नाही. SMS पाठवत आहे",
    langCode: "mr-IN"
  }
};

export default function ElderlyDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pillFound, setPillFound] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(5000);
  const [isOffline, setIsOffline] = useState(false);

  // Feature 1: Fix hardcoded "Ravi" fallback
  const [user, setUser] = useState<any>({
    name: "Senior User",
    guardianName: "",
    guardianRelationship: "",
    guardianPhone: "",
    language: "English"
  });

  const t = translationsList[user.language] || translationsList.English;

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = t.langCode; // Feature 2: Speak in regional language
    utterance.rate = loadAccessibilitySettings().voiceRate || 0.9;
    window.speechSynthesis.speak(utterance);
  }, [t.langCode]);

  useEffect(() => {
    const settings = loadAccessibilitySettings();
    applyAccessibilitySettings(settings);

    const savedUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    if (!savedUser.isElderly) {
      router.push("/dashboard/patient");
      return;
    }

    // Feature 1: Populate actual guardian data
    if (savedUser.firstName) {
      setUser({
        name: savedUser.firstName,
        guardianName: savedUser.guardianName || "",
        guardianRelationship: savedUser.guardianRelationship || "",
        guardianPhone: savedUser.guardianPhone || "",
        language: savedUser.language || "English"
      });

      const existingContacts = loadEmergencyContacts();
      if (existingContacts.length === 0) {
        const defaults = getDefaultEmergencyContactFromUser(savedUser);
        if (defaults.length > 0) {
          saveEmergencyContacts(defaults);
        }
      }
    }

    // Sync wallet balance
    const savedBalance = localStorage.getItem("mediflow_family_wallet_balance");
    if (savedBalance) setWalletBalance(parseInt(savedBalance));

    // --- GLOBAL CLOUD SYNC ---
    const runSync = async () => {
       await GlobalSync.pullAppointments();
       await GlobalSync.pullMedicalData();
       await GlobalSync.pullStaff(); // Ensure staff names are available for doctor matching
       
       // Re-check balance after potential sync
       const latestBalance = localStorage.getItem("mediflow_family_wallet_balance");
       if (latestBalance) setWalletBalance(parseInt(latestBalance));
    };
    runSync();
  }, [router]);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);



  // Unique Feature A: Magic Lens (Camera Permission - ONLY when Dialog Open)
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isDialogOpen) {
      const getCameraPermission = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
          setHasCameraPermission(false);
          console.error("Camera access denied", error);
        }
      };
      getCameraPermission();
    }

    return () => {
      // Clean up the camera stream when dialog closes or unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isDialogOpen]);

  const handleVerifyPill = async () => {
    setIsVerifying(true);
    setPillFound(null);
    speak(t.scanning);

    try {
      if (!videoRef.current) throw new Error("Camera not initialized");

      const base64Image = captureVideoFrameForServerAction(videoRef.current, {
        maxDimension: 640,
        maxBase64Chars: 850_000,
        quality: 0.55,
        minQuality: 0.25,
      });
      if (!base64Image) throw new Error("Image encoding failed");

      // Grab their specific prescriptions to check against
      const allPrescriptions = JSON.parse(localStorage.getItem("mediflow_prescriptions") || "[]");
      const savedUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");

      // Filter prescriptions for this exact patient (either by patientId or just taking the ones that belong to them)
      const patientPrescriptions = allPrescriptions.filter((rx: any) =>
        rx.patientId === savedUser.id ||
        rx.patientName?.toLowerCase() === user.name?.toLowerCase()
      );

      const prescriptionDataStr = JSON.stringify(patientPrescriptions);

      const result = await detectPill({
        imageBase64: base64Image,
        language: user.language,
        prescriptions: prescriptionDataStr
      });

      setPillFound({
        name: result.name,
        instruction: result.instruction
      });
      speak(result.instruction);

    } catch (error) {
      console.error("Pill Scanning failed", error);
      setPillFound({
        name: "Unknown Pill",
        instruction: "I could not see the pill clearly. Please try again."
      });
      speak("I could not see the pill clearly. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefill = () => {
    if (walletBalance >= 450) {
      setWalletBalance(prev => prev - 450);
      toast({
        title: t.orderSuccessful,
        description: t.refillTomorrow,
      });
      speak(t.refillTomorrow);
    }
  };

  const triggerSOS = () => {
    const contacts = loadEmergencyContacts().sort((a, b) => a.priority - b.priority);
    const primaryContact = contacts[0] || {
      name: user.guardianName || "Guardian",
      phone: user.guardianPhone || "N/A",
      relation: user.guardianRelationship || "Guardian",
      priority: 1,
      id: "fallback",
    };

    appendGuardianNotification({
      type: "sos",
      message: `SOS triggered by ${user.name}. Contact ${primaryContact.name} at ${primaryContact.phone}.`,
    });

    localStorage.setItem(
      "mediflow_last_sos_event",
      JSON.stringify({
        by: user.name,
        contactName: primaryContact.name,
        contactPhone: primaryContact.phone,
        createdAt: new Date().toISOString(),
      })
    );

    toast({
      variant: "destructive",
      title: "SOS TRIGGERED",
      description: `Connecting to ${primaryContact.name} (${primaryContact.relation}) at ${primaryContact.phone}...`,
    });
    speak(t.emergencyAlert);
  };

  const handleLogout = () => {
    localStorage.removeItem("mediflow_current_user");
    router.push("/");
  };

  const handleLanguageChange = (lang: string) => {
    setUser((prev: any) => ({ ...prev, language: lang }));
    const savedUser = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    savedUser.language = lang;
    localStorage.setItem("mediflow_current_user", JSON.stringify(savedUser));
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-32 flex flex-col p-6 space-y-12 touch-manipulation">
      {isOffline && (
        <div className="rounded-[2rem] border-[8px] border-black bg-yellow-200 p-6 flex items-center gap-4 shadow-xl">
          <WifiOff className="h-10 w-10" />
          <p className="text-2xl font-black uppercase">Offline mode active. Using saved data from this device.</p>
        </div>
      )}

      {/* Accessibility Header */}
      <header className="flex justify-between items-center border-b-[15px] border-black pb-10">
        <div>
          <h1 className="text-7xl font-black uppercase tracking-tighter">{t.hello}, {user.name}</h1>
          {/* Feature 1: Prominent Guardian Display */}
          <div className="mt-4 space-y-1">
            <p className="text-4xl font-black opacity-60 uppercase">{t.guardianName}: {user.guardianName || "N/A"}</p>
            <p className="text-2xl font-black opacity-40 uppercase">{t.relationship}: {user.guardianRelationship || "Not Defined"}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-28 px-10 text-4xl font-black bg-white text-black border-8 border-black rounded-3xl shadow-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-4">
                <Languages className="h-12 w-12 text-blue-600" strokeWidth={3} />
                <span className="text-4xl font-black">{user.language.substring(0, 3).toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-8 border-black rounded-[2rem] p-4 space-y-2 w-72" align="end">
              {Object.keys(translationsList).map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  className="text-3xl font-black uppercase p-6 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleLanguageChange(lang)}
                >
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-28 px-12 text-4xl font-black bg-black text-white rounded-3xl border-8 border-black hover:bg-zinc-800 transition-all active:scale-95"
            onClick={handleLogout}
          >
            {t.logout}
          </Button>
        </div>
      </header>

      {/* Unique Feature B: Family Wallet */}
      <div className="flex flex-col sm:flex-row gap-8 items-stretch">
        <Card className="flex-1 border-[12px] border-black bg-white rounded-[4rem] p-12 shadow-none">
          <div className="flex items-center gap-10">
            <Wallet className="h-28 w-28 text-black" />
            <div>
              <p className="text-4xl font-black uppercase tracking-widest text-slate-400">{t.wallet}</p>
              <h3 className="text-8xl font-black">₹{walletBalance.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Button
          className="h-28 text-3xl font-black bg-white text-black border-8 border-black rounded-[2rem] flex items-center gap-4"
          onClick={() => router.push('/dashboard/elderly/accessibility')}
        >
          <Settings2 className="h-10 w-10" /> ACCESSIBILITY
        </Button>
        <Button
          className="h-28 text-3xl font-black bg-white text-black border-8 border-black rounded-[2rem] flex items-center gap-4"
          onClick={() => router.push('/dashboard/elderly/emergency-contacts')}
        >
          <Siren className="h-10 w-10" /> CONTACTS
        </Button>
        <Button
          className="h-28 text-3xl font-black bg-white text-black border-8 border-black rounded-[2rem] flex items-center gap-4"
          onClick={() => router.push('/dashboard/elderly/payments')}
        >
          <ReceiptText className="h-10 w-10" /> RECEIPTS
        </Button>
        <Button
          className="h-28 text-3xl font-black bg-white text-black border-8 border-black rounded-[2rem] flex items-center gap-4"
          onClick={() => router.push('/dashboard/elderly/help')}
        >
          <CircleHelp className="h-10 w-10" /> TUTORIAL
        </Button>
      </div>

      {/* Main Grid: massive Touch Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full aspect-square flex flex-col items-center justify-center bg-white text-black rounded-[6rem] border-[30px] border-blue-600 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-blue-50 transition-all hover:scale-[1.05] group focus:outline-none">
              <Pill className="w-64 h-64 text-blue-600 group-hover:scale-110 transition-transform" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl bg-white border-[15px] border-black rounded-[5rem] p-0 overflow-hidden">
            <DialogHeader className="bg-black p-12 text-white m-0">
              <DialogTitle className="text-6xl font-black uppercase tracking-tight text-center">Magic Lens Scanner</DialogTitle>
            </DialogHeader>
            <div className="p-12 space-y-12">
              <div className="relative aspect-square bg-slate-100 rounded-[4rem] overflow-hidden border-[10px] border-black">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                {isVerifying && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-black p-10 text-center">
                    <Loader2 className="h-40 w-40 animate-spin mb-8" />
                    <span className="text-6xl font-black uppercase">{t.analyzing}</span>
                  </div>
                )}
              </div>
              {!pillFound ? (
                <Button
                  className="w-full h-40 text-6xl font-black bg-black text-white rounded-[3rem] shadow-2xl"
                  onClick={handleVerifyPill}
                  disabled={isVerifying}
                >
                  START SCAN
                </Button>
              ) : (
                <div className="bg-white border-[12px] border-black p-12 rounded-[4rem] text-center animate-in zoom-in-95">
                  <CheckCircle2 className="h-32 w-32 text-black mx-auto mb-8" />
                  <h4 className="text-6xl font-black uppercase text-primary">{pillFound.name}</h4>
                  <p className="text-4xl font-black mt-6 uppercase leading-tight">{pillFound.instruction}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-white text-black border-[30px] border-green-600 rounded-[6rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-green-50 transition-all hover:scale-[1.05] group focus:outline-none"
          onClick={() => router.push('/dashboard/elderly/medicines')}
        >
          <div className="relative w-64 h-64 flex items-center justify-center font-black">
             <Pill className="h-full w-full text-green-600 group-hover:scale-110 transition-transform" strokeWidth={3} />
             <div className="absolute -bottom-4 -right-4 bg-black text-white rounded-full p-4 border-[10px] border-white">
                <ClipboardList className="h-20 w-20" strokeWidth={4} />
             </div>
          </div>
        </button>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-[#9b59b6] text-white border-[30px] border-black rounded-[6rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.05] group focus:outline-none"
          onClick={() => router.push('/dashboard/elderly/book-appointment')}
        >
          <Stethoscope className="w-64 h-64 group-hover:rotate-12 transition-transform" strokeWidth={3} />
        </button>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-white text-black border-[30px] border-orange-500 rounded-[6rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-orange-50 transition-all hover:scale-[1.05] group focus:outline-none"
          onClick={() => router.push('/dashboard/elderly/schedule')}
        >
          <div className="relative w-64 h-64 flex items-center justify-center font-black">
             <Calendar className="h-full w-full text-orange-600 group-hover:scale-110 transition-transform" strokeWidth={3} />
             <div className="absolute -bottom-4 -right-4 bg-black text-white rounded-full p-4 border-[10px] border-white">
                <Clock className="h-20 w-20" strokeWidth={4} />
             </div>
          </div>
          <span className="text-4xl font-black uppercase mt-4">What's Next</span>
        </button>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-white text-black border-[30px] border-red-500 rounded-[6rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-red-50 transition-all hover:scale-[1.05] group focus:outline-none"
          onClick={() => router.push('/dashboard/elderly/health')}
        >
          <Activity className="w-64 h-64 text-red-600 group-hover:scale-110 transition-transform" strokeWidth={3} />
        </button>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-white text-black border-[30px] border-blue-500 rounded-[6rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-blue-50 transition-all hover:scale-[1.1] group focus:outline-none"
          onClick={() => router.push('/dashboard/elderly/scan-pay')}
        >
          <div className="relative w-72 h-72 flex items-center justify-center font-black">
             <QrCode className="h-full w-full text-blue-600 group-hover:scale-110 transition-transform" strokeWidth={3} />
             <div className="absolute -bottom-4 -right-4 bg-black text-white rounded-full p-4 border-[10px] border-white">
                <Wallet className="h-20 w-20" strokeWidth={4} />
             </div>
          </div>
          <span className="text-6xl font-black uppercase mt-6 tracking-tighter">Scan to Pay</span>
        </button>

        <button
          className="w-full aspect-square flex flex-col items-center justify-center bg-red-600 text-white border-[30px] border-black rounded-[6rem] shadow-[0_35px_60px_-20px_rgba(255,0,0,0.5)] animate-pulse transition-all hover:scale-[1.1] group focus:outline-none"
          onClick={triggerSOS}
        >
          <AlertCircle className="w-80 h-80 group-hover:scale-125 transition-transform" strokeWidth={3} />
        </button>
      </div>

      {/* Footer: Safety Indicator */}
      <footer className="mt-auto bg-slate-100 p-12 rounded-[4rem] flex items-center justify-between border-[12px] border-black">
        <div className="flex items-center gap-8">
          <ShieldCheck className="h-20 w-20 text-black" />
          <span className="text-5xl font-black uppercase tracking-tighter">{t.safetyShield}</span>
        </div>
        <span className="text-3xl font-black uppercase opacity-20">{t.watching}</span>
      </footer>

      <ElderlyVoiceAssistant />

    </div>
  );
}
