
'use client';

import { Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}

export function Logo({ className, iconClassName, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="bg-primary/10 p-3 rounded-2xl shadow-sm border border-primary/10">
        <Stethoscope className={cn("h-8 w-8 text-primary", iconClassName)} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-3xl font-headline font-bold text-primary tracking-tight leading-none">
            MediFlow
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 leading-none">
            Integrated Health
          </span>
        </div>
      )}
    </div>
  );
}
