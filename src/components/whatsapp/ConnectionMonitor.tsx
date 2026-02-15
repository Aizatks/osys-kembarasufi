"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Phone,
  MessageSquare,
  BookUser,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Signal,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { waUrl } from "@/lib/wa-client";
import { cn } from "@/lib/utils";

interface StaffConnection {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_role: string;
  phone_number: string | null;
  wa_status: string;
  db_status: string;
  last_session_update: string | null;
  last_message_at: string | null;
  msg_count: number;
  contact_count: number;
  reconnect_attempts: number;
  has_reconnect_timer: boolean;
  has_session: boolean;
}

interface Summary {
  total: number;
  connected: number;
  reconnecting: number;
  disconnected: number;
  no_session: number;
}

export function ConnectionMonitor() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<StaffConnection[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, connected: 0, reconnecting: 0, disconnected: 0, no_session: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "connected" | "issues" | "none">("all");

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/connections"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
        setSummary(data.summary || { total: 0, connected: 0, reconnecting: 0, disconnected: 0, no_session: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (ts: string | null) => {
    if (!ts) return "N/A";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Baru";
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (s: StaffConnection) => {
    if (s.wa_status === "connected") {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 gap-1">
          <Wifi className="w-3 h-3" /> Aktif
        </Badge>
      );
    }
    if (s.wa_status === "reconnecting") {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 gap-1 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> Menyambung ({s.reconnect_attempts})
        </Badge>
      );
    }
    if (s.wa_status === "connecting" || s.wa_status === "qr_ready") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Memulakan
        </Badge>
      );
    }
    if (s.has_session) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 gap-1">
          <WifiOff className="w-3 h-3" /> Terputus
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 gap-1">
        <Signal className="w-3 h-3" /> Belum Sambung
      </Badge>
    );
  };

  const filteredStaff = staff.filter(s => {
    if (filter === "connected") return s.wa_status === "connected";
    if (filter === "issues") return s.has_session && s.wa_status !== "connected";
    if (filter === "none") return !s.has_session;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Monitor Sambungan
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Pantau status WhatsApp semua staff secara real-time</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setLoading(true); fetchData(); }}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", filter === "connected" && "ring-2 ring-emerald-500")}
          onClick={() => setFilter(f => f === "connected" ? "all" : "connected")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Wifi className="w-5 h-5 text-emerald-500" />
              <span className="text-3xl font-bold text-emerald-600">{summary.connected}</span>
            </div>
            <p className="text-xs text-slate-500">Aktif</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", filter === "issues" && "ring-2 ring-amber-500")}
          onClick={() => setFilter(f => f === "issues" ? "all" : "issues")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-3xl font-bold text-amber-600">{summary.reconnecting + summary.disconnected}</span>
            </div>
            <p className="text-xs text-slate-500">Bermasalah</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", filter === "none" && "ring-2 ring-slate-500")}
          onClick={() => setFilter(f => f === "none" ? "all" : "none")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Signal className="w-5 h-5 text-slate-400" />
              <span className="text-3xl font-bold text-slate-500">{summary.no_session}</span>
            </div>
            <p className="text-xs text-slate-500">Belum Sambung</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">{summary.total}</span>
            </div>
            <p className="text-xs text-slate-500">Jumlah Staff</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status Sambungan Staff</CardTitle>
            {filter !== "all" && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setFilter("all")}>
                Papar Semua
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-slate-500">Staff</th>
                  <th className="pb-2 font-medium text-slate-500 text-center">Status WA</th>
                  <th className="pb-2 font-medium text-slate-500 text-center">Nombor</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">Mesej</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">Kenalan</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">Mesej Terakhir</th>
                  <th className="pb-2 font-medium text-slate-500 text-right">Kemas Kini</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s) => (
                  <tr key={s.staff_id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs",
                          s.wa_status === "connected" ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                            : s.wa_status === "reconnecting" ? "bg-gradient-to-br from-amber-400 to-orange-500"
                            : s.has_session ? "bg-gradient-to-br from-red-400 to-rose-500"
                            : "bg-gradient-to-br from-slate-300 to-slate-400"
                        )}>
                          {s.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.staff_name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{s.staff_role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{getStatusBadge(s)}</td>
                    <td className="py-3 text-center text-xs text-slate-500">
                      {s.phone_number ? `+${s.phone_number}` : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3 text-right">
                      <span className="flex items-center gap-1 justify-end text-xs">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        {s.msg_count.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="flex items-center gap-1 justify-end text-xs">
                        <BookUser className="w-3 h-3 text-slate-400" />
                        {s.contact_count.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 text-right text-xs text-slate-500">{formatTime(s.last_message_at)}</td>
                    <td className="py-3 text-right text-xs text-slate-500">{formatTime(s.last_session_update)}</td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tiada staff dalam kategori ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {staff.filter(s => s.wa_status === "reconnecting" || (s.has_session && s.wa_status !== "connected")).length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" /> Amaran Sambungan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staff.filter(s => s.wa_status === "reconnecting").map(s => (
                <div key={`warn-${s.staff_id}`} className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span><strong>{s.staff_name}</strong> sedang mencuba menyambung semula (cubaan ke-{s.reconnect_attempts})</span>
                </div>
              ))}
              {staff.filter(s => s.has_session && s.wa_status !== "connected" && s.wa_status !== "reconnecting").map(s => (
                <div key={`disc-${s.staff_id}`} className="flex items-center gap-2 text-xs">
                  <WifiOff className="w-3 h-3 text-red-500 shrink-0" />
                  <span><strong>{s.staff_name}</strong> terputus sejak {formatTime(s.last_session_update)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
