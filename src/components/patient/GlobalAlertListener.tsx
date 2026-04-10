
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Medication {
  id: string | number;
  name: string;
  dose: string;
  timeLabel: string;
  taken: boolean;
  scheduledHour: number;
  scheduledMinute: number;
  lastReminderSent?: string;
}

/**
 * GlobalAlertListener monitors medication schedules in real-time.
 * It ensures STRICT PRIVACY by only alerting for authorized family members.
 */
export function GlobalAlertListener() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const medsRef = useRef<Medication[]>([]);
  const intervalsRef = useRef<Record<string, any>>({});
  const missedTimersRef = useRef<Record<string, any>>({});

  // Only run logic for patient or elderly dashboard routes
  const isPatientRoute = pathname.startsWith('/dashboard/patient');
  const isElderlyRoute = pathname.startsWith('/dashboard/elderly');

  const MIN_RETRY_MINUTES = 5; // base retry interval (5-10 minutes will be jittered)
  const MISSED_WINDOW_MINUTES = 60; // mark missed after 60 minutes

  const fetchMeds = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");

      // Elderly users keep their medications in a separate store
      if (user && (user.user_type === 'elderly' || user.isElderly)) {
        const saved = JSON.parse(localStorage.getItem("mediflow_elderly_meds") || "[]");
        const parsed = saved.map((m: any) => {
          // normalize timeLabel to scheduledHour/minute
          let scheduledHour = m.scheduledHour;
          let scheduledMinute = m.scheduledMinute;
          if (scheduledHour === undefined || scheduledMinute === undefined) {
            // try parsing like "08:00 AM" or labels like Morning/Night
            const tl: string = m.timeLabel || "";
            const ampmMatch = tl.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (ampmMatch) {
              let h = parseInt(ampmMatch[1], 10);
              const mm = parseInt(ampmMatch[2], 10);
              const ap = ampmMatch[3].toUpperCase();
              if (ap === 'PM' && h < 12) h += 12;
              if (ap === 'AM' && h === 12) h = 0;
              scheduledHour = h;
              scheduledMinute = mm;
            } else if (/morning/i.test(tl)) { scheduledHour = scheduledHour ?? 8; scheduledMinute = scheduledMinute ?? 0; }
            else if (/afternoon/i.test(tl)) { scheduledHour = scheduledHour ?? 13; scheduledMinute = scheduledMinute ?? 0; }
            else if (/night/i.test(tl) || /evening/i.test(tl)) { scheduledHour = scheduledHour ?? 20; scheduledMinute = scheduledMinute ?? 0; }
            else { scheduledHour = scheduledHour ?? 9; scheduledMinute = scheduledMinute ?? 0; }
          }
          return {
            id: m.id,
            name: m.name,
            dose: m.dosage || m.dose || "",
            timeLabel: m.timeLabel || `${String(scheduledHour).padStart(2,'0')}:${String(scheduledMinute).padStart(2,'0')}`,
            taken: !!m.takenToday || JSON.parse(localStorage.getItem(`med_taken_${m.id}`) || "false"),
            scheduledHour,
            scheduledMinute
          } as Medication;
        });
        medsRef.current = parsed;
        return;
      }

      // Default: patient prescriptions (shared/family)
      const savedFamily = localStorage.getItem("mediflow_family_members");
      const familyMembers = savedFamily ? JSON.parse(savedFamily) : [];
      const authorizedNames = familyMembers.map((m: any) => m.name.toLowerCase());
      const saved = localStorage.getItem("mediflow_prescriptions");
      if (saved && authorizedNames.length > 0) {
        const prescriptions = JSON.parse(saved);
        const myPrescriptions = prescriptions.filter((rx: any) =>
          authorizedNames.includes(rx.patientName?.toLowerCase())
        );
        const allMeds: Medication[] = myPrescriptions.flatMap((rx: any) =>
          rx.medications.map((m: any) => ({
            id: m.id,
            name: m.name,
            dose: m.dosage || m.dose || "",
            timeLabel: m.timeLabel || "",
            taken: JSON.parse(localStorage.getItem(`med_taken_${m.id}`) || "false"),
            scheduledHour: m.scheduledHour ?? 0,
            scheduledMinute: m.scheduledMinute ?? 0
          }))
        );
        medsRef.current = allMeds;
      }
    } catch (e) {
      console.error("GlobalAlertListener: fetchMeds error", e);
    }
  }, []);

  useEffect(() => {
    if (!(isPatientRoute || isElderlyRoute)) return;

    fetchMeds();

    const now = Date.now();

    const checkSchedule = () => {
      fetchMeds();
      const nowTime = Date.now();

      const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
      const userType = user?.user_type || (user?.isElderly ? 'elderly' : 'normal');

      medsRef.current.forEach(med => {
        if (med.taken) {
          // clear any running intervals for this med
          if (intervalsRef.current[med.id]) {
            clearInterval(intervalsRef.current[med.id]);
            delete intervalsRef.current[med.id];
          }
          return;
        }

        const scheduledTime = new Date();
        scheduledTime.setHours(med.scheduledHour, med.scheduledMinute, 0, 0);
        const scheduledTimeMs = scheduledTime.getTime();
        const diffMins = Math.floor((nowTime - scheduledTimeMs) / 60000);

        if (diffMins >= 0) {
          const lastSentKey = `last_alert_${med.id}`;
          const lastSent = parseInt(localStorage.getItem(lastSentKey) || "0");
          const minsSinceLastAlert = Math.floor((nowTime - lastSent) / 60000);

          // Skip if reminders globally disabled
          const remindersEnabled = localStorage.getItem("mediflow_reminders_enabled");
          if (remindersEnabled === "false") return;

          // Stop if end date passed (if provided in the stored record)
          // (the med object may not include endDate; if it does, skip when past)
          try {
            const rawAll = JSON.parse(localStorage.getItem('mediflow_elderly_meds') || '[]');
            const sourceMed = rawAll.find((m: any) => String(m.id) === String(med.id));
            if (sourceMed && sourceMed.endDate) {
              const end = new Date(sourceMed.endDate).getTime();
              if (Date.now() > end) return;
            }
          } catch (e) {}

          if (userType === 'normal') {
            // Normal patients: one single push at scheduled time
            const sentFlag = localStorage.getItem(`med_alert_sent_${med.id}`);
            if (!sentFlag) {
              const message = `Time to take ${med.name}`;
              toast({ title: message, description: undefined, duration: 8000 });
              if ("Notification" in window && Notification.permission === 'granted') {
                try { new Notification(message); } catch(e) {}
              }
              // Record that we've sent the one-time alert
              localStorage.setItem(`med_alert_sent_${med.id}`, '1');
              localStorage.setItem(lastSentKey, String(nowTime));

              // Start a missed-dose timer
              if (!missedTimersRef.current[med.id]) {
                missedTimersRef.current[med.id] = setTimeout(() => {
                  if (localStorage.getItem(`med_taken_${med.id}`) !== 'true') {
                    localStorage.setItem(`med_status_${med.id}`, 'missed');
                    // keep a simple guardian alert marker for future enhancements
                    localStorage.setItem("mediflow_guardian_medication_alert", JSON.stringify({ patient: user?.email || 'unknown', medId: med.id, timestamp: new Date().toISOString() }));
                  }
                  delete missedTimersRef.current[med.id];
                }, MISSED_WINDOW_MINUTES * 60 * 1000);
              }
            }
            return;
          }

          // Elderly: repeated reminders until acknowledged
          if (userType === 'elderly') {
            // Send immediate reminder if not sent in last MIN_RETRY_MINUTES
            if (minsSinceLastAlert >= MIN_RETRY_MINUTES || lastSent === 0) {
              const sendReminder = () => {
                const message = `Please take your medicine: ${med.name}`;
                // Persistent toast with large action
                toast({
                  variant: 'destructive',
                  title: message,
                  description: undefined,
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-primary hover:bg-slate-100 font-bold border-2"
                      onClick={() => {
                        // Acknowledge
                        localStorage.setItem(`med_taken_${med.id}`, 'true');
                        localStorage.setItem(`med_alert_sent_${med.id}`, '1');
                        localStorage.setItem(lastSentKey, String(Date.now()));
                        // Update elderly med store as well
                        try {
                          const arr = JSON.parse(localStorage.getItem('mediflow_elderly_meds') || '[]');
                          const updated = arr.map((m: any) => m.id === med.id ? { ...m, takenToday: true } : m);
                          localStorage.setItem('mediflow_elderly_meds', JSON.stringify(updated));
                        } catch (e) {}
                        // Clear interval
                        if (intervalsRef.current[med.id]) {
                          clearInterval(intervalsRef.current[med.id]);
                          delete intervalsRef.current[med.id];
                        }
                        // Clear missed timer
                        if (missedTimersRef.current[med.id]) { clearTimeout(missedTimersRef.current[med.id]); delete missedTimersRef.current[med.id]; }
                      }}
                    >
                      Mark as Taken
                    </Button>
                  ),
                  duration: 0,
                });

                // Browser notification (try to keep it visible)
                if ("Notification" in window && Notification.permission === 'granted') {
                  try { new Notification(message, { tag: `med_${med.id}`, requireInteraction: true }); } catch(e) {}
                }

                // Vibration
                try { if (navigator && (navigator as any).vibrate) (navigator as any).vibrate([300,150,300]); } catch(e) {}

                // Sound using WebAudio
                try {
                  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const o = ctx.createOscillator();
                  const g = ctx.createGain();
                  o.type = 'sine'; o.frequency.value = 880;
                  o.connect(g); g.connect(ctx.destination);
                  o.start();
                  g.gain.setValueAtTime(0.2, ctx.currentTime);
                  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                  setTimeout(() => { try { o.stop(); ctx.close(); } catch(e) {} }, 700);
                } catch(e) {}

                // Voice
                try {
                  if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    const utt = new SpeechSynthesisUtterance(`Please take your medicine: ${med.name}`);
                    utt.lang = 'en-US'; utt.rate = 0.95; window.speechSynthesis.speak(utt);
                  }
                } catch(e) {}

                localStorage.setItem(lastSentKey, String(Date.now()));
                localStorage.setItem(`med_alert_sent_${med.id}`, '1');
              };

              // Send first immediate reminder
              sendReminder();

              // Start repeating interval if not already
              if (!intervalsRef.current[med.id]) {
                const jitter = MIN_RETRY_MINUTES * 60 * 1000 + Math.floor(Math.random() * MIN_RETRY_MINUTES * 60 * 1000); // 5-10min
                intervalsRef.current[med.id] = setInterval(() => {
                  if (localStorage.getItem(`med_taken_${med.id}`) === 'true') {
                    clearInterval(intervalsRef.current[med.id]);
                    delete intervalsRef.current[med.id];
                    return;
                  }
                  sendReminder();
                }, jitter);
              }

              // Missed-dose mark after MISSED_WINDOW
              if (!missedTimersRef.current[med.id]) {
                missedTimersRef.current[med.id] = setTimeout(() => {
                  if (localStorage.getItem(`med_taken_${med.id}`) !== 'true') {
                    localStorage.setItem(`med_status_${med.id}`, 'missed');
                    localStorage.setItem("mediflow_guardian_medication_alert", JSON.stringify({ patient: user?.email || 'unknown', medId: med.id, timestamp: new Date().toISOString() }));
                  }
                  delete missedTimersRef.current[med.id];
                }, MISSED_WINDOW_MINUTES * 60 * 1000);
              }
            }
          }
        }
      });
    };

    const interval = setInterval(checkSchedule, 10000);
    return () => {
      clearInterval(interval);
      // clear any leftover intervals we created
      Object.values(intervalsRef.current).forEach((id) => clearInterval(id));
      Object.values(missedTimersRef.current).forEach((id) => clearTimeout(id));
      intervalsRef.current = {};
      missedTimersRef.current = {};
    };
  }, [isPatientRoute, fetchMeds, router, toast]);

  return null;
}
