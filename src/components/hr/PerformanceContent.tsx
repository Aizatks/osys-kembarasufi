"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  BarChart3,
  Users,
  RefreshCw,
  Calendar,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchAuth, fetchJsonAuth } from "@/lib/fetch-utils";

interface PerformanceScore {
  id: string;
  staff_id: string;
  staff_name: string;
  year: number;
  month: number;
  working_days: number;
  days_present: number;
  days_late: number;
  days_absent: number;
  days_leave: number;
  score: number;
  details: {
    on_time_days: number;
    late_days: number;
    total_points: number;
    max_points: number;
  };
  calculated_at: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

const HR_ROLES = ["admin", "superadmin", "hr", "hr-manager", "c-suite"];

export function PerformanceContent() {
  const { user, isAdmin } = useAuth();
  const isHR = HR_ROLES.includes(user?.role || "");
  const now = new Date();
  const [scores, setScores] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      const res = await fetchAuth(`/api/hr/performance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setScores(data.scores || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetchJsonAuth("/api/hr/performance", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Prestasi dikira");
        fetchScores();
      } else {
        toast.error(data.error || "Gagal mengira prestasi");
      }
    } catch {
      toast.error("Gagal mengira prestasi");
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-100 dark:bg-emerald-900/30";
    if (score >= 70) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-emerald-100 text-emerald-700 border-0"><Trophy className="w-3 h-3 mr-1" />Cemerlang</Badge>;
    if (score >= 70) return <Badge className="bg-amber-100 text-amber-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Baik</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-0"><AlertTriangle className="w-3 h-3 mr-1" />Perlu Penambahbaikan</Badge>;
  };

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, s) => a + Number(s.score), 0) / scores.length) * 10) / 10 : 0;
  const excellentCount = scores.filter((s) => Number(s.score) >= 90).length;
  const poorCount = scores.filter((s) => Number(s.score) < 70).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" /> Prestasi Kehadiran
          </h2>
          <p className="text-muted-foreground">Skor prestasi kehadiran bulanan berdasarkan attendance log</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isHR && (
            <Button onClick={handleCalculate} disabled={calculating} className="gap-2 bg-purple-600 hover:bg-purple-700">
              {calculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Kira Prestasi
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-medium">Purata Skor</CardDescription>
            <CardTitle className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 font-medium">Cemerlang (90+)</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{excellentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-600 font-medium">Perlu Perhatian (&lt;70)</CardDescription>
            <CardTitle className="text-3xl font-bold text-red-600">{poorCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium">Jumlah Staff</CardDescription>
            <CardTitle className="text-3xl font-bold">{scores.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Score Formula */}
      <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Formula Pengiraan:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Hadir Tepat: +10 pts</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Lewat: +5 pts</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Cuti Sah: +7 pts</span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Tidak Hadir: 0 pts</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">Skor = (Jumlah / Maks) x 100</span>
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Memuatkan data...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-muted-foreground">Tiada data prestasi untuk {MONTH_NAMES[month - 1]} {year}</p>
          {isHR && (
            <Button className="mt-4 gap-2" onClick={handleCalculate} disabled={calculating}>
              <RefreshCw className="w-4 h-4" /> Kira Sekarang
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedScores.map((s, idx) => {
            const score = Number(s.score);
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="flex items-center p-4 gap-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx === 0 ? "bg-yellow-100 text-yellow-700" :
                    idx === 1 ? "bg-slate-200 text-slate-600" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.staff_name || "Unknown"}</p>
                      {getScoreBadge(score)}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Hari Bekerja: {s.working_days}</span>
                      <span className="text-green-600">Hadir: {s.days_present}</span>
                      <span className="text-amber-600">Lewat: {s.days_late}</span>
                      <span className="text-blue-600">Cuti: {s.days_leave}</span>
                      <span className="text-red-600">Tidak Hadir: {s.days_absent}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}%</div>
                    <p className="text-xs text-muted-foreground">{s.details?.total_points || 0} / {s.details?.max_points || 0} pts</p>
                  </div>

                  {/* Score bar */}
                  <div className="w-24 hidden md:block">
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
