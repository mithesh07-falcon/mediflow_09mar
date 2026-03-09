
"use client";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar as CalendarIcon, Info, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const TIME_SLOTS_PRESET = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM"
];

export default function DoctorSchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [approvedSlots, setApprovedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const { toast } = useToast();

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
      const apiDate = date.toISOString().split('T')[0];
      const savedAppts = JSON.parse(localStorage.getItem("mediflow_appointments") || "[]");

      const filtered = savedAppts.filter((a: any) => {
        const isMyDoc = a.doctorEmail?.toLowerCase() === user.email?.toLowerCase();
        return isMyDoc && a.date === formattedDate;
      });

      setDayAppointments(filtered);

      // Fetch Approved slots from API
      fetch(`/api/admin/schedule?docEmail=${user.email}&date=${apiDate}&status=approved`)
        .then(res => res.json())
        .then(data => setApprovedSlots(data.slots || []))
        .catch(() => { });

      setLoading(false);
    };

    fetchSchedule();
    const interval = setInterval(fetchSchedule, 5000);
    return () => clearInterval(interval);
  }, [date]);

  const toggleSlotSelection = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const handleRequestSlots = async () => {
    if (!date || selectedSlots.length === 0) return;

    setRequesting(true);
    const user = JSON.parse(localStorage.getItem("mediflow_current_user") || "{}");
    const formattedDate = date.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_slots',
          docEmail: user.email,
          date: formattedDate,
          slots: selectedSlots
        })
      });

      if (res.ok) {
        toast({
          title: "Slots Requested",
          description: `${selectedSlots.length} slots sent to Admin for approval.`
        });
        setSelectedSlots([]);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Could not reach the server."
      });
    }
    setRequesting(false);
  };

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
                  <Plus className="h-4 w-4" />
                  <span>Request New Slots</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
                  Select a date and click time slots below to request them from Admin.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                  {TIME_SLOTS_PRESET.map(slot => (
                    <Button
                      key={slot}
                      variant={selectedSlots.includes(slot) ? "default" : "outline"}
                      className={`h-10 text-[10px] font-bold rounded-xl ${selectedSlots.includes(slot) ? 'bg-primary' : 'bg-white opacity-60'}`}
                      onClick={() => toggleSlotSelection(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
                {selectedSlots.length > 0 && (
                  <Button
                    className="w-full mt-4 h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    onClick={handleRequestSlots}
                    disabled={requesting}
                  >
                    {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : `REQUEST ${selectedSlots.length} SLOTS`}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <Card className="rounded-[2.5rem] border-none shadow-sm min-h-[400px]">
              <CardHeader className="bg-white rounded-t-[2.5rem] py-8 px-10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl">Clinical Availability</CardTitle>
                    <CardDescription>Approved hours for patient booking</CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-none rounded-xl px-4 py-2">
                    {approvedSlots.length} Active Slots
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 border-b">
                <div className="flex flex-wrap gap-2">
                  {approvedSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No slots approved for this date yet.</p>
                  ) : (
                    approvedSlots.map(s => (
                      <Badge key={s.id} variant="secondary" className="h-10 px-4 rounded-xl text-lg font-black bg-slate-100 border-none">
                        {s.slot}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>

              <CardHeader className="border-b bg-white py-8 px-10">
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
