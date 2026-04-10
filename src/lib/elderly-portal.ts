export type AccessibilitySettings = {
  textScale: number;
  highContrast: boolean;
  voiceRate: number;
  reduceMotion: boolean;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  priority: number;
};

export type GuardianNotification = {
  id: string;
  type: "missed_medicine" | "sos" | "wellness_alert";
  message: string;
  createdAt: string;
};

export type ElderlyHealthReading = {
  id: string;
  type: "blood_sugar" | "blood_pressure" | "pulse" | "oxygen" | "temperature";
  value: string;
  unit: string;
  status: "normal" | "abnormal";
  createdAt: string;
};

export type WellnessEntry = {
  id: string;
  mood: "great" | "okay" | "low";
  note: string;
  createdAt: string;
};

export type PaymentReceipt = {
  id: string;
  shop: string;
  amount: number;
  createdAt: string;
  method: "scan-pay";
  status: "success";
};

const ACCESSIBILITY_KEY = "mediflow_elderly_accessibility";
const EMERGENCY_CONTACTS_KEY = "mediflow_emergency_contacts";
const GUARDIAN_NOTIFICATIONS_KEY = "mediflow_guardian_notifications";
const HEALTH_READINGS_KEY = "mediflow_elderly_health_readings";
const WELLNESS_LOG_KEY = "mediflow_elderly_wellness_log";
const PAYMENT_RECEIPTS_KEY = "mediflow_payment_receipts";

const defaultAccessibility: AccessibilitySettings = {
  textScale: 100,
  highContrast: false,
  voiceRate: 1,
  reduceMotion: false,
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  return { ...defaultAccessibility, ...safeRead<Partial<AccessibilitySettings>>(ACCESSIBILITY_KEY, defaultAccessibility) };
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  safeWrite(ACCESSIBILITY_KEY, settings);
}

export function applyAccessibilitySettings(settings: AccessibilitySettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.fontSize = `${settings.textScale}%`;

  if (settings.highContrast) {
    root.classList.add("elderly-high-contrast");
  } else {
    root.classList.remove("elderly-high-contrast");
  }

  if (settings.reduceMotion) {
    root.classList.add("elderly-reduce-motion");
  } else {
    root.classList.remove("elderly-reduce-motion");
  }
}

export function loadEmergencyContacts(): EmergencyContact[] {
  return safeRead<EmergencyContact[]>(EMERGENCY_CONTACTS_KEY, []);
}

export function saveEmergencyContacts(contacts: EmergencyContact[]): void {
  safeWrite(EMERGENCY_CONTACTS_KEY, contacts.sort((a, b) => a.priority - b.priority));
}

export function appendGuardianNotification(entry: Omit<GuardianNotification, "id" | "createdAt">): void {
  const existing = safeRead<GuardianNotification[]>(GUARDIAN_NOTIFICATIONS_KEY, []);
  const next: GuardianNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  safeWrite(GUARDIAN_NOTIFICATIONS_KEY, [next, ...existing].slice(0, 100));
}

export function loadHealthReadings(): ElderlyHealthReading[] {
  return safeRead<ElderlyHealthReading[]>(HEALTH_READINGS_KEY, []);
}

export function saveHealthReadings(readings: ElderlyHealthReading[]): void {
  safeWrite(HEALTH_READINGS_KEY, readings);
}

export function loadWellnessLog(): WellnessEntry[] {
  return safeRead<WellnessEntry[]>(WELLNESS_LOG_KEY, []);
}

export function saveWellnessLog(entries: WellnessEntry[]): void {
  safeWrite(WELLNESS_LOG_KEY, entries);
}

export function loadPaymentReceipts(): PaymentReceipt[] {
  return safeRead<PaymentReceipt[]>(PAYMENT_RECEIPTS_KEY, []);
}

export function appendPaymentReceipt(entry: Omit<PaymentReceipt, "id" | "createdAt">): void {
  const existing = loadPaymentReceipts();
  const next: PaymentReceipt = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  safeWrite(PAYMENT_RECEIPTS_KEY, [next, ...existing].slice(0, 200));
}

export function getDefaultEmergencyContactFromUser(user: any): EmergencyContact[] {
  if (!user?.guardianPhone) return [];
  return [
    {
      id: "primary-guardian",
      name: user.guardianName || "Guardian",
      relation: user.guardianRelationship || "Guardian",
      phone: user.guardianPhone,
      priority: 1,
    },
  ];
}