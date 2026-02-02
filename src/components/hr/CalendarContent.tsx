"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  User,
  MoreVertical,
  Bell,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  staff_id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: string;
  metadata?: any;
}

export function CalendarContent() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [viewDate]);

  const fetchEvents = async () => {
    try {
      const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString();
      const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString();
      
      const res = await fetch(`/api/calendar?staff_id=${user?.id}&start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => "");

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-500" /> Kalendar Tugasan
          </h2>
          <p className="text-muted-foreground">Jadual kerja, tugasan, dan peringatan automatik</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold px-4 min-w-[140px] text-center">
            {viewDate.toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b bg-slate-50 dark:bg-slate-800/50">
              {["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"].map(day => (
                <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {prevMonthDays.map((_, i) => (
                <div key={`prev-${i}`} className="aspect-square border-r border-b bg-slate-50/30" />
              ))}
              {days.map(day => {
                const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toISOString().split("T")[0];
                const dayEvents = events.filter(e => e.start_at.startsWith(dateStr));
                const isToday = new Date().toISOString().split("T")[0] === dateStr;

                return (
                  <div key={day} className={cn(
                    "aspect-square border-r border-b p-1 relative hover:bg-slate-50 transition-colors group",
                    isToday && "bg-emerald-50/50"
                  )}>
                    <span className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isToday ? "bg-emerald-600 text-white shadow-md" : "text-slate-600"
                    )}>
                      {day}
                    </span>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 truncate font-medium">
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[8px] text-slate-400 pl-1">+{dayEvents.length - 3} lagi</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Peringatan Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.filter(e => e.start_at.startsWith(new Date().toISOString().split("T")[0])).length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-4 italic">Tiada tugasan hari ini</p>
              ) : (
                events
                  .filter(e => e.start_at.startsWith(new Date().toISOString().split("T")[0]))
                  .map(e => (
                    <div key={e.id} className="flex gap-3 p-3 rounded-lg bg-slate-50 border">
                      <div className="w-1 h-8 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-bold">{e.title}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(e.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Status Notifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                <span className="flex items-center gap-2">WhatsApp Reminder</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5">AKTIF</Badge>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                <span className="flex items-center gap-2">Email Notification</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5">AKTIF</Badge>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic">Sistem akan menghantar peringatan 2 jam sebelum tugasan bermula.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
