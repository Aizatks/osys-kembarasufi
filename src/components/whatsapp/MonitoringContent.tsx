"use client";

import { useState, useEffect } from "react";
import { 
  Monitor, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Smartphone,
  Shield,
  Zap,
  MoreVertical,
  QrCode
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  staff_id: string;
  staff_name: string;
  phone_number: string;
  status: "CONNECTED" | "DISCONNECTED" | "INITIALIZING";
  last_active: string;
  msg_count: number;
}

export function MonitoringContent() {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/whatsapp/monitoring");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6 text-emerald-500" /> Pemantauan WhatsApp
          </h2>
          <p className="text-muted-foreground">Pantau status sambungan dan aktiviti WhatsApp staff</p>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={fetchSessions}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20">Memuatkan sesi...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
            <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada sesi WhatsApp aktif ditemui</p>
          </div>
        ) : (
          sessions.map(session => (
            <Card key={session.id} className={cn(
              "overflow-hidden transition-all hover:shadow-md",
              session.status === "CONNECTED" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{session.staff_name}</CardTitle>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> +{session.phone_number}
                    </p>
                  </div>
                  <Badge variant={session.status === "CONNECTED" ? "secondary" : "destructive"} className={cn(
                    "text-[10px] h-5",
                    session.status === "CONNECTED" && "bg-emerald-100 text-emerald-700"
                  )}>
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-[9px] uppercase text-slate-400 font-bold">Mesej Dihantar</p>
                    <p className="text-lg font-bold text-emerald-600">{session.msg_count}</p>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-[9px] uppercase text-slate-400 font-bold">Aktif Terakhir</p>
                    <p className="text-xs font-medium truncate">{new Date(session.last_active).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-8">
                    <Clock className="w-3 h-3 mr-1" /> Log Mesej
                  </Button>
                  <Button variant={session.status === "CONNECTED" ? "ghost" : "default"} size="sm" className="w-full text-[10px] h-8 bg-emerald-600 hover:bg-emerald-700">
                    <QrCode className="w-3 h-3 mr-1" /> Reconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <b>Nota Penting:</b> Pastikan bateri telefon staff sentiasa mencukupi dan sambungan internet stabil untuk mengelakkan sesi terputus (disconnected). Sistem akan menghantar notis jika sesi terputus lebih 10 minit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
