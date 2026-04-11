"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_HINT, validatePassword } from "@/lib/validation";

export default function ResetForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const resetToken = useMemo(() => String(searchParams.get("token") || ""), [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const passwordValidation = validatePassword(password);

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resetToken) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please restart the forgot password flow.",
      });
      router.replace("/login/forgot-password");
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: PASSWORD_HINT,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Password and confirm password must match.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password-with-otp",
          resetToken,
          password,
          confirmPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Reset Failed",
          description: result.error || "Could not reset password. Please retry.",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been reset successfully.",
      });

      router.replace("/login");
    } catch {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
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
          <Link href="/login/forgot-password/verify">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Card className="shadow-xl border-none">
          <CardHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-headline">Reset Password</CardTitle>
            <CardDescription className="text-base">
              Set your new password to complete account recovery.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-base">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Toggle new password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-base">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {PASSWORD_HINT}
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
