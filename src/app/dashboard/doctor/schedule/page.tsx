
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar as CalendarIcon, Info } from "lucide-react";
import { useState, useEffect } from "react";

export default function DoctorSchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    const fetchSchedule = () => {
      const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
      if (!user.email) {
        setLoading(false);
        return;
      }

      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");

      const filtered = savedAppts.filter((a: any) => {
        const isMyDoc = a.doctorEmail?.toLowerCase() === user.email?.toLowerCase();
        // Standardize both dates to short format for comparison
        const apptDateStr = a.date; // already in 'MMM D, YYYY' format usually
        return isMyDoc && apptDateStr === formattedDate;
      });

      setDayAppointments(filtered);
      setLoading(false);
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 5000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <div className="flex min-h-screen">
      <SidebarNav role="doctor" />
      <main className="flex-1 p-8 bg-slate-50">
        <header className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-primary">Clinic Schedule</h1>
          <p className="text-muted-foreground">Manage your daily consultation hours and appointments.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Card className="rounded-[2.5rem] border-none shadow-xl p-4 bg-white">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="w-full"
              />
              <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                  <Info className="h-4 w-4" />
                  <span>Quick Tip</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Select a date to view all booked consultations for that day.
                </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <Card className="rounded-[2.5rem] border-none shadow-sm min-h-[400px]">
              <CardHeader className="border-b bg-white rounded-t-[2.5rem] py-8 px-10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl">Daily Agenda</CardTitle>
                    <CardDescription>
                      {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none rounded-xl px-4 py-2">
                    {dayAppointments.length} Appointments
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-muted-foreground animate-pulse">Syncing clinical records...</p>
                  </div>
                ) : dayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                      <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">No Appointments</h3>
                      <p className="text-sm text-muted-foreground">No patients are scheduled for this date.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dayAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 hover:border-primary/30 transition-all shadow-sm group">
                        <div className="flex items-center gap-6">
                          <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <Clock className="h-6 w-6 text-primary group-hover:text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">{apt.time}</span>
                              <Badge variant="outline" className="text-[10px] rounded-lg">{apt.status}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Schedule Details</div>
                          <div className="text-sm italic text-slate-600 max-w-[200px] truncate">
                            {apt.symptoms ? 'Consultation Slot' : 'General Checkup'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
