
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("p-10 bg-white dark:bg-zinc-900 rounded-[3rem] min-h-[480px] w-full flex items-center justify-center border-2 border-slate-100", className)}>
        <div className="animate-pulse text-muted-foreground font-bold uppercase tracking-widest text-xs">Initializing Clinical Grid...</div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fromDate={today}
      disabled={{ before: today }}
      className={cn("p-8 bg-white dark:bg-zinc-900 rounded-[3rem]", className)}
      classNames={{
        months: "flex flex-col space-y-6",
        month: "space-y-6",
        caption: "flex flex-col items-start gap-4 mb-6",
        caption_label: "text-3xl font-headline font-bold text-slate-900 dark:text-white order-last mt-1",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-10 w-10 bg-transparent p-0 opacity-100 hover:bg-primary/10 rounded-full transition-all flex items-center justify-center border-2 border-slate-100"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        // FORCING THE GRID: The following classes ensure the 7-column matrix format
        head_row: "grid grid-cols-7 w-full mb-4",
        head_cell: "text-slate-400 dark:text-slate-500 font-black text-[10px] text-center w-full uppercase tracking-[0.2em] h-8 flex items-center justify-center",
        month_grid: "w-full",
        week: "grid grid-cols-7 w-full gap-y-2 mt-1",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-bold rounded-full text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all duration-300 flex items-center justify-center mx-auto text-base"
        ),
        day_button: "h-10 w-10 p-0 font-bold rounded-full transition-all flex items-center justify-center mx-auto",
        selected: "!bg-primary !text-white hover:!bg-primary hover:!text-white focus:!bg-primary focus:!text-white font-black shadow-lg shadow-primary/30 rounded-full scale-110 !opacity-100 border-none",
        today: "border-2 border-primary/40 text-primary font-black",
        outside: "invisible", 
        disabled: "text-muted-foreground/20 opacity-20 cursor-not-allowed pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
