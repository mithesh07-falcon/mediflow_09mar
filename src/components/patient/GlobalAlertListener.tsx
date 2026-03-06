
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

  // Only run logic for patient dashboard routes
  const isPatientRoute = pathname.startsWith('/dashboard/patient');

  const fetchMeds = useCallback(() => {
    const savedFamily = localStorage.getItem("mediflow_family_members");
    const familyMembers = savedFamily ? JSON.parse(savedFamily) : [];
    const authorizedNames = familyMembers.map((m: any) => m.name.toLowerCase());

    const saved = localStorage.getItem("mediflow_prescriptions");
    if (saved && authorizedNames.length > 0) {
      try {
        const prescriptions = JSON.parse(saved);
        // STRICT PRIVACY: Filter for authorized names in the family group only
        const myPrescriptions = prescriptions.filter((rx: any) => 
          authorizedNames.includes(rx.patientName?.toLowerCase())
        );

        const allMeds: Medication[] = myPrescriptions.flatMap((rx: any) => 
          rx.medications.map((m: any) => ({
            ...m,
            taken: (JSON.parse(localStorage.getItem(`med_taken_${m.id}`) || "false"))
          }))
        );
        medsRef.current = allMeds;
      } catch (e) {
        console.error("Clinical Data Parse Error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isPatientRoute) return;

    fetchMeds();

    const checkSchedule = () => {
      fetchMeds();
      
      const now = new Date();
      const nowTime = now.getTime();

      medsRef.current.forEach(med => {
        if (med.taken) return;

        const scheduledTime = new Date();
        scheduledTime.setHours(med.scheduledHour, med.scheduledMinute, 0, 0);
        const scheduledTimeMs = scheduledTime.getTime();
        
        const diffMins = Math.floor((nowTime - scheduledTimeMs) / 60000);

        if (diffMins >= 0) {
          const lastSentKey = `last_alert_${med.id}`;
          const lastSent = parseInt(localStorage.getItem(lastSentKey) || "0");
          const minsSinceLastAlert = Math.floor((nowTime - lastSent) / 60000);

          if (minsSinceLastAlert >= 2) {
            localStorage.setItem(lastSentKey, nowTime.toString());

            const isNeglected = diffMins >= 10;

            toast({
              variant: isNeglected ? "destructive" : "default",
              title: isNeglected ? "⚠️ URGENT CLINICAL ALERT" : "💬 SMS from MediFlow",
              description: isNeglected 
                ? `CRITICAL: ${med.name} dose missed for 10 minutes. Guardian Loop activated.`
                : `Time for your medication: ${med.name} (${med.dose}). Record now.`,
              action: (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white text-primary hover:bg-slate-100 font-bold border-2"
                  onClick={() => router.push('/dashboard/patient/meds')}
                >
                  RECORD DOSE
                </Button>
              ),
              duration: 10000,
            });
          }
        }
      });
    };

    const interval = setInterval(checkSchedule, 10000);
    return () => clearInterval(interval);
  }, [isPatientRoute, fetchMeds, router, toast]);

  return null;
}
