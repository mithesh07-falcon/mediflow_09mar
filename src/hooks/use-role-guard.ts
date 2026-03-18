"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

/**
 * CONSTRAINT 10: Role-based route guard
 * CONSTRAINT 16: Single session management with notification
 * 
 * Wrap dashboard pages with this to enforce:
 * - Only the correct role can access their dashboard
 * - Session ID tracking for single-session enforcement
 */
export function useRoleGuard(allowedRole: string) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userStr = localStorage.getItem("mediflow_current_user");
    if (!userStr) {
      router.replace("/login");
      return;
    }

    const user = JSON.parse(userStr);
    const currentRole = user.role || "";

    // CONSTRAINT 10: Doctors cannot access admin panel | Patients cannot edit doctor data
    if (allowedRole === "admin" && currentRole !== "admin") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only administrators can access this portal.",
      });
      router.replace("/login");
      return;
    }

    if (allowedRole === "doctor" && currentRole !== "doctor") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only authorized doctors can access this portal.",
      });
      router.replace("/login");
      return;
    }

    if (allowedRole === "patient" && currentRole !== "patient" && !user.isElderly) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only registered patients can access this portal.",
      });
      router.replace("/login");
      return;
    }

    if (allowedRole === "pharmacist" && currentRole !== "pharmacist") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only authorized pharmacists can access this portal.",
      });
      router.replace("/login");
      return;
    }

    // CONSTRAINT 16: Single session management
    const sessionId = `${user.email}_${Date.now()}`;
    const existingSession = localStorage.getItem("mediflow_active_session");

    if (existingSession) {
      try {
        const existing = JSON.parse(existingSession);
        // If it's the same user but different session, notify
        if (existing.email === user.email && existing.sessionId !== sessionId) {
          const timeDiff = Date.now() - existing.timestamp;
          // If last session was active within 30 seconds, show notification
          if (timeDiff < 30000) {
            toast({
              title: "⚠️ Multiple Session Detected",
              description: "You are logged in from another tab/device. Previous session will be overridden.",
            });
          }
        }
      } catch {}
    }

    // Set current session
    localStorage.setItem(
      "mediflow_active_session",
      JSON.stringify({
        email: user.email,
        role: currentRole,
        sessionId,
        timestamp: Date.now(),
      })
    );

    // Keep session alive
    const interval = setInterval(() => {
      const session = localStorage.getItem("mediflow_active_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.email === user.email) {
          parsed.timestamp = Date.now();
          localStorage.setItem("mediflow_active_session", JSON.stringify(parsed));
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [allowedRole, router, toast]);
}
