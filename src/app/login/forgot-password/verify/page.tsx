"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const GENERIC_MESSAGE = "If the number is registered, you will receive an OTP";

function normalizeIndianMobile(input: string): string | null {
  const compact = input.replace(/\s+/g, "").replace(/-/g, "");
  const digitsOnly = compact.replace(/\D/g, "");

  let national = "";
  if (/^\+91\d{10}$/.test(compact)) {
    national = compact.slice(3);
  } else if (/^91\d{10}$/.test(digitsOnly)) {
    national = digitsOnly.slice(2);
  } else if (/^\d{10}$/.test(digitsOnly)) {
    national = digitsOnly;
  } else {
    return null;
  }

  if (!/^[6-9]\d{9}$/.test(national)) {
    return null;
  }

  return `+91${national}`;
}

export default function VerifyForgotPasswordOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendInSeconds, setResendInSeconds] = useState(60);

  const mobileFromQuery = searchParams.get("mobile") || "";
  const normalizedMobile = useMemo(() => normalizeIndianMobile(mobileFromQuery), [mobileFromQuery]);

  useEffect(() => {
    if (!normalizedMobile) {
      router.replace("/login/forgot-password");
      return;
    }

    const initialCooldown = Number(searchParams.get("cooldown") || "60");
    if (Number.isFinite(initialCooldown) && initialCooldown > 0) {
      setResendInSeconds(Math.min(300, initialCooldown));
    }
  }, [normalizedMobile, router, searchParams]);

  useEffect(() => {
    if (resendInSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendInSeconds]);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedMobile) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please start the forgot password process again.",
      });
      router.replace("/login/forgot-password");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Enter a valid 6-digit OTP.",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-password-reset-otp",
          mobile: normalizedMobile,
          otp,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: response.status === 429 ? "Too Many Attempts" : "OTP Verification Failed",
          description: result.error || "Invalid or expired OTP.",
        });
        return;
      }

      const token = String(result.resetToken || "");
      if (!token) {
        toast({
          variant: "destructive",
          title: "Verification Error",
          description: "Reset session token was not issued. Please retry.",
        });
        return;
      }

      router.push(`/login/forgot-password/reset?token=${encodeURIComponent(token)}`);
    } catch {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!normalizedMobile || resendInSeconds > 0 || isResending) {
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend-password-reset-otp",
          mobile: normalizedMobile,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Resend Failed",
          description: result.error || "Unable to resend OTP right now.",
        });
        return;
      }

      const cooldown = Number.isFinite(result.resendAvailableInSeconds)
        ? Number(result.resendAvailableInSeconds)
        : 60;

      setResendInSeconds(Math.max(1, cooldown));
      toast({
        title: "OTP Sent",
        description: result.message || GENERIC_MESSAGE,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <nav className="p-6 flex items-center justify-between border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">MediFlow</span>
        </div>
        <ThemeToggle />
      </nav>

      <main className="max-w-xl mx-auto px-4 py-10">
        <Button asChild variant="ghost" className="mb-6 text-base">
          <Link href="/login/forgot-password">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Card className="shadow-xl border-none">
          <CardHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-headline">Verify OTP</CardTitle>
            <CardDescription className="text-base">
              Enter the 6-digit OTP sent to your registered mobile number.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-base">One-Time Password</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  pattern="\\d{6}"
                  placeholder="000000"
                  className="h-12 text-lg tracking-[0.35em] text-center"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isVerifying}>
                {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify OTP"}
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground">
              {GENERIC_MESSAGE}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={resendInSeconds > 0 || isResending}
                onClick={handleResend}
              >
                {isResending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Resend OTP
              </Button>

              <span className="text-sm font-semibold text-muted-foreground">
                {resendInSeconds > 0 ? `Resend in ${resendInSeconds}s` : "You can resend now"}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
