
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ShieldCheck, Stethoscope, ClipboardList } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export type UserRole = "patient" | "doctor" | "pharmacist";

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>("patient");

  useEffect(() => {
    if (pathname.includes("/doctor")) setRole("doctor");
    else if (pathname.includes("/pharmacist")) setRole("pharmacist");
    else setRole("patient");
  }, [pathname]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    router.push(`/dashboard/${newRole}`);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="shadow-lg bg-white border-primary/20 hover:border-primary">
            <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
            Switch Role: <span className="ml-1 font-bold capitalize">{role}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Simulate User Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleRoleChange("patient")}>
            <User className="mr-2 h-4 w-4" />
            <span>Patient / Family Admin</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("doctor")}>
            <Stethoscope className="mr-2 h-4 w-4" />
            <span>Doctor</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("pharmacist")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Pharmacist</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
