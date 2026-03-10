
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Calendar,
  Pill,
  LogOut,
  ClipboardList,
  Activity,
  Package,
  CreditCard,
  AlertCircle,
  Settings,
  Heart,
  Phone,
  ShieldCheck,
  Key,
  MessageSquareWarning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useEffect, useState } from "react";

export function SidebarNav({ role }: { role: "patient" | "doctor" | "pharmacist" | "admin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isElderly, setIsElderly] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [showGuardianMonitoring, setShowGuardianMonitoring] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    setIsElderly(user.isElderly || false);
    setCurrentUserRole(user.role || "");

    // Check for linked elderly
    const allUsers = JSON.parse(localStorage.getItem("mediflow_patients") || "[]");
    if (user.email) {
      const isGuardian = allUsers.some((u: any) =>
        u.isElderly &&
        u.guardianEmail &&
        u.guardianEmail.toLowerCase() === user.email.toLowerCase()
      );
      setShowGuardianMonitoring(isGuardian);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("mediflow_current_user");
    toast({
      title: "Signed Out",
      description: "You have been securely logged out of MediFlow.",
    });
    router.push("/");
  };

  const patientNav = [
    { label: "Overview", href: "/dashboard/patient", icon: Home },
    { label: "Family Profiles", href: "/dashboard/patient/family", icon: Users },
    // Only show Guardian view if they actually have a linked elder
    ...(showGuardianMonitoring ? [{ label: "Guardian Monitoring", href: "/dashboard/guardian", icon: ShieldCheck }] : []),
    { label: "Book Appointment", href: "/dashboard/patient/appointments", icon: Calendar },
    { label: "My Schedule", href: "/dashboard/patient/my-schedule", icon: ClipboardList },
    { label: "Medication", href: "/dashboard/patient/meds", icon: Pill },
    { label: "Billing", href: "/dashboard/patient/billing", icon: CreditCard },
  ];

  const elderlyNav = [
    { label: "Dashboard", href: "/dashboard/elderly", icon: Heart },
    { label: "My Pills", href: "/dashboard/elderly/medicines", icon: Pill },
    { label: "My Doctor", href: "/dashboard/elderly/doctor", icon: Phone },
  ];

  const doctorNav = [
    { label: "Overview", href: "/dashboard/doctor", icon: Home },
    { label: "Patient List", href: "/dashboard/doctor/patients", icon: Users },
    { label: "My Schedule", href: "/dashboard/doctor/schedule", icon: Calendar },
    { label: "Compliance Monitor", href: "/dashboard/doctor/compliance", icon: Activity },
  ];

  const pharmacistNav = [
    { label: "Overview", href: "/dashboard/pharmacist", icon: Home },
    { label: "Prescription Hub", href: "/dashboard/pharmacist/scan", icon: ClipboardList },
    { label: "Inventory", href: "/dashboard/pharmacist/inventory", icon: Package },
    { label: "Billing Records", href: "/dashboard/pharmacist/billing", icon: CreditCard },
  ];

  const adminNav = [
    { label: "Governance Central", href: "/dashboard/admin", icon: Home },
    { label: "Credential Vault", href: "/dashboard/admin", icon: Key },
    { label: "Clinical Schedules", href: "/dashboard/admin", icon: Calendar },
    { label: "Feedback Hub", href: "/dashboard/admin", icon: MessageSquareWarning },
  ];

  const currentNav = isElderly ? elderlyNav :
    (role === "admin" ? adminNav :
      (role === "doctor" ? doctorNav :
        (role === "pharmacist" ? pharmacistNav : patientNav)));

  // For elderly mode, we hide the sidebar to maximize focus on the main big buttons
  if (isElderly) return null;

  return (
    <aside className={cn(
      "w-64 border-r border-border h-screen sticky top-0 flex flex-col transition-all z-40 bg-white dark:bg-zinc-900"
    )}>
      <div className="p-6">
        <Logo className="mb-8" />

        <nav className="space-y-1">
          {currentNav.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-4 rounded-xl font-bold transition-all text-sm",
                pathname === item.href
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-4">
        {currentUserRole === 'admin' && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-bold text-blue-700 uppercase">Governance Mode</span>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 dark:bg-zinc-800/50 rounded-2xl border border-dashed">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>

        {role === 'patient' && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
            <Button variant="destructive" className="w-full flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-md py-2 text-[10px] rounded-xl">
              <AlertCircle className="h-3 w-3" />
              SOS Emergency
            </Button>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-2 font-bold transition-colors group rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut className="h-3 w-3 group-hover:scale-110 transition-transform" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
