"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_INFO_MESSAGE = "If the number is registered, you will receive an OTP";

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mobile, setMobile] = useState("+91 ");
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState(DEFAULT_INFO_MESSAGE);

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const normalizedDigits = digits.startsWith("91") ? digits.slice(2, 12) : digits.slice(0, 10);
    setMobile(`+91 ${normalizedDigits}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!normalizedMobile) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Enter a valid 10-digit Indian mobile number.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request-password-reset-otp",
          mobile: normalizedMobile,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Request Failed",
          description: result.error || "Unable to start password reset right now.",
        });
        return;
      }

      const message = result.message || DEFAULT_INFO_MESSAGE;
      const cooldown = Number.isFinite(result.resendAvailableInSeconds)
        ? Number(result.resendAvailableInSeconds)
        : 60;

      setInfoMessage(message);
      router.push(
        `/login/forgot-password/verify?mobile=${encodeURIComponent(normalizedMobile)}&cooldown=${encodeURIComponent(String(cooldown))}`
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
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
          <Link href="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </Button>

        <Card className="shadow-xl border-none">
          <CardHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-headline">Forgot Password</CardTitle>
            <CardDescription className="text-base">
              Enter your registered mobile number to receive a one-time password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-base">Registered Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(event) => handleMobileChange(event.target.value)}
                  placeholder="+91 9876543210"
                  className="h-12 text-lg"
                  required
                />
              </div>

              <p className="text-sm text-muted-foreground">{infoMessage}</p>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send OTP"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
