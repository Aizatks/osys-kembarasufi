"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  MessageSquare,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Send,
  Inbox,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { waUrl } from "@/lib/wa-client";

interface StaffMetric {
  staff_id: string;
  staff_name: string;
  status: string;
  inbound: number;
  outbound: number;
  unique_contacts: number;
  avg_response_ms: number;
  unreplied: number;
}

interface DailyTrend {
  date: string;
  inbound: number;
  outbound: number;
}

interface HourlyPattern {
  hour: number;
  label: string;
  count: number;
}

interface DashboardData {
  overview: {
    total_messages: number;
    inbound: number;
    outbound: number;
    active_contacts: number;
    inbound_change: number;
    outbound_change: number;
    contacts_change: number;
    connected_staff: number;
    total_staff: number;
  };
  staff_metrics: StaffMetric[];
  daily_trend: DailyTrend[];
  hourly_pattern: HourlyPattern[];
  peak_hour: HourlyPattern;
}

export function WADashboardContent() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/dashboard"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatResponseTime = (ms: number) => {
    if (ms === 0) return "N/A";
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const formatChange = (change: number) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={cn("text-xs font-semibold flex items-center gap-0.5", isPositive ? "text-emerald-600" : "text-red-500")}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isPositive ? "+" : ""}{change}%
      </span>
    );
  };

  const getMaxDailyValue = () => {
    if (!data?.daily_trend.length) return 1;
    return Math.max(...data.daily_trend.map(d => Math.max(d.inbound, d.outbound)), 1);
  };

  const getMaxHourly = () => {
    if (!data?.hourly_pattern.length) return 1;
    return Math.max(...data.hourly_pattern.map(h => h.count), 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <p>Gagal memuatkan data dashboard</p>
      </div>
    );
  }

  const { overview, staff_metrics, daily_trend, hourly_pattern, peak_hour } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            WhatsApp Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Business Intelligence & Performance Metrics (Bulan Ini)
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchData}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Inbox className="w-5 h-5 text-blue-500" />
              {formatChange(overview.inbound_change)}
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{overview.inbound.toLocaleString()}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">Mesej Diterima</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Send className="w-5 h-5 text-emerald-500" />
              {formatChange(overview.outbound_change)}
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{overview.outbound.toLocaleString()}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Mesej Dihantar</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-violet-500" />
              {formatChange(overview.contacts_change)}
            </div>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{overview.active_contacts.toLocaleString()}</p>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">Kenalan Aktif</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {overview.connected_staff}/{overview.total_staff}
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">Staff Aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance + Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Performance Table */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Prestasi Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-slate-500">Staff</th>
                    <th className="pb-2 font-medium text-slate-500 text-center">Status</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Masuk</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Keluar</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Kenalan</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Avg Respon</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Belum Balas</th>
                  </tr>
                </thead>
                <tbody>
                  {staff_metrics.map((s) => {
                    const total = s.inbound + s.outbound;
                    const maxTotal = Math.max(...staff_metrics.map(m => m.inbound + m.outbound), 1);
                    const barWidth = (total / maxTotal) * 100;

                    return (
                      <tr key={s.staff_id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
                              {s.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{s.staff_name}</p>
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          {s.status === 'connected' ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50">
                              <Wifi className="w-2.5 h-2.5 mr-1" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                              <WifiOff className="w-2.5 h-2.5 mr-1" /> Offline
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right font-medium text-blue-600">{s.inbound.toLocaleString()}</td>
                        <td className="py-3 text-right font-medium text-emerald-600">{s.outbound.toLocaleString()}</td>
                        <td className="py-3 text-right">{s.unique_contacts}</td>
                        <td className="py-3 text-right">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            s.avg_response_ms === 0 ? "bg-slate-100 text-slate-500" :
                            s.avg_response_ms < 300000 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                            s.avg_response_ms < 600000 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
                            "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                          )}>
                            {formatResponseTime(s.avg_response_ms)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {s.unreplied > 0 ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full flex items-center gap-1 justify-end w-fit ml-auto">
                              <AlertTriangle className="w-3 h-3" /> {s.unreplied}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3" /> 0
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {staff_metrics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tiada data staff
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Jumlah Mesej
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{overview.total_messages.toLocaleString()}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-600">Masuk</span>
                    <span className="font-medium">{overview.inbound.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${overview.total_messages ? (overview.inbound / overview.total_messages) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-600">Keluar</span>
                    <span className="font-medium">{overview.outbound.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${overview.total_messages ? (overview.outbound / overview.total_messages) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Waktu Puncak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{peak_hour?.label || "N/A"}</p>
              <p className="text-xs text-slate-500 mt-1">
                {peak_hour?.count.toLocaleString() || 0} mesej pada waktu puncak
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                Purata Masa Respon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const totalMs = staff_metrics.reduce((sum, s) => sum + s.avg_response_ms, 0);
                const active = staff_metrics.filter(s => s.avg_response_ms > 0).length;
                const avg = active > 0 ? totalMs / active : 0;
                return (
                  <>
                    <p className="text-3xl font-bold">{formatResponseTime(avg)}</p>
                    <p className="text-xs text-slate-500 mt-1">Purata keseluruhan staff</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trend Harian</CardTitle>
          </CardHeader>
          <CardContent>
            {daily_trend.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">Tiada data</div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-4 text-xs mb-3">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm" /> Masuk</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Keluar</span>
                </div>
                <div className="flex items-end gap-1 h-40">
                  {daily_trend.map((day) => {
                    const maxVal = getMaxDailyValue();
                    const inH = (day.inbound / maxVal) * 100;
                    const outH = (day.outbound / maxVal) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex items-end gap-px group relative">
                        <div className="flex-1 bg-blue-400 rounded-t-sm transition-all hover:bg-blue-500" style={{ height: `${Math.max(inH, 2)}%` }} />
                        <div className="flex-1 bg-emerald-400 rounded-t-sm transition-all hover:bg-emerald-500" style={{ height: `${Math.max(outH, 2)}%` }} />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {new Date(day.date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })} - {day.inbound}↓ {day.outbound}↑
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>{daily_trend[0]?.date ? new Date(daily_trend[0].date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }) : ''}</span>
                  <span>{daily_trend[daily_trend.length - 1]?.date ? new Date(daily_trend[daily_trend.length - 1].date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }) : ''}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Pattern */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Corak Mengikut Jam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-40">
              {hourly_pattern.map((h) => {
                const maxH = getMaxHourly();
                const height = (h.count / maxH) * 100;
                const isPeak = h.hour === peak_hour?.hour;
                return (
                  <div key={h.hour} className="flex-1 group relative">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        isPeak ? "bg-amber-400 hover:bg-amber-500" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                      )}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {h.label} - {h.count} mesej
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown (per staff bar chart) */}
      {staff_metrics.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volum Mesej Mengikut Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staff_metrics.map((s) => {
                const maxTotal = Math.max(...staff_metrics.map(m => m.inbound + m.outbound), 1);
                const total = s.inbound + s.outbound;
                const inPct = total > 0 ? (s.inbound / total) * 100 : 0;
                const outPct = total > 0 ? (s.outbound / total) * 100 : 0;
                const barW = (total / maxTotal) * 100;

                return (
                  <div key={s.staff_id} className="flex items-center gap-3">
                    <div className="w-20 text-right shrink-0">
                      <p className="text-xs font-medium truncate">{s.staff_name.split(' ')[0]}</p>
                    </div>
                    <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex" style={{ width: `${barW}%` }}>
                      <div className="h-full bg-blue-400 flex items-center justify-center" style={{ width: `${inPct}%` }}>
                        {s.inbound > 0 && <span className="text-[9px] text-white font-medium">{s.inbound}</span>}
                      </div>
                      <div className="h-full bg-emerald-400 flex items-center justify-center" style={{ width: `${outPct}%` }}>
                        {s.outbound > 0 && <span className="text-[9px] text-white font-medium">{s.outbound}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs mt-4 justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm" /> Masuk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-sm" /> Keluar</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
