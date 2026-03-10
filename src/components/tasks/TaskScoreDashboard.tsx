"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart3,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  Calendar,
  Download,
  Loader2,
  Award,
  Medal,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskBreakdown {
  template_id: string;
  title: string;
  indicator_type: string;
  total: number;
  completed: number;
  missed: number;
  completion_rate: number;
  missed_dates: string[];
}

interface StaffBreakdown {
  staff: { id: string; name: string; category: string };
  breakdown: TaskBreakdown[];
  insights: {
    never_done: string[];
    rarely_done: { title: string; rate: number }[];
    well_done: { title: string; rate: number }[];
  };
  summary: { total: number; completed: number; missed: number; completion_rate: number };
  period: { start: string; end: string };
}

interface StaffScore {
  staff_id: string;
  staff_name: string;
  category: string;
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  earnedPoints: number;
  completionRate: number;
  kpiRate: number;
  kriRate: number;
  grade: string;
  recommendation?: string;
  bonus_percentage?: number;
}

interface YearlyReport {
  staff_id: string;
  year: number;
  summary: {
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    kpiRate: number;
    kriRate: number;
    grade: string;
  };
  quarterly: Array<{
    quarter: string;
    rate: number;
    kpiRate: number;
    kriRate: number;
    grade: string;
  }>;
  monthly: Array<{
    month: number;
    tasks_completed: number;
    total_tasks: number;
    rate: number;
    kpiRate: number;
    kriRate: number;
  }>;
  recommendation: string;
  bonus_percentage: number;
}

export function TaskScoreDashboard() {
  const { isAdmin } = useAuth();
  const [scores, setScores] = useState<StaffScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [dateRangeStart, setDateRangeStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d);
    start.setDate(diff);
    return start.toISOString().split("T")[0];
  });
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const end = new Date(d);
    end.setDate(diff + 6);
    return end.toISOString().split("T")[0];
  });
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<StaffBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const ROLES = ["Sales", "Ejen", "B2B", "Marketing", "Media", "Admin", "PIC"];

  useEffect(() => {
    if (isAdmin === true) {
      fetchScores();
    } else if (isAdmin === false) {
      setLoading(false);
    }
  }, [isAdmin, period, selectedYear, selectedMonth, dateRangeStart, dateRangeEnd, selectedRole]);

  const filteredScores = scores.filter(s => {
    if (selectedRole === "All") return true;
    return s.category === selectedRole;
  });

  const fetchScores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = `/api/tasks/scores?all=true&period=${period}${selectedRole !== "All" ? `&category=${encodeURIComponent(selectedRole)}` : ""}`;
      if (period === "yearly") {
        url += `&year=${selectedYear}`;
      } else if (period === "monthly") {
        const paddedMonth = selectedMonth.toString().padStart(2, "0");
        url += `&date=${selectedYear}-${paddedMonth}-01`;
      } else if (period === "weekly") {
        url += `&start_date=${dateRangeStart}&end_date=${dateRangeEnd}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setScores(data.scores || []);
      } else {
        console.error("Scores API error:", response.status);
      }
    } catch (error: unknown) {
      // Ignore AbortError or initial mount errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Failed to fetch scores:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyReport = async (staffId: string) => {
    setSelectedStaffId(staffId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/tasks/scores?period=yearly&year=${selectedYear}&staff_id=${staffId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setYearlyReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch yearly report:", error);
    }
  };

  const fetchBreakdown = async (staffId: string) => {
    setBreakdownLoading(true);
    setBreakdown(null);
    setExpandedTask(null);
    try {
      const token = localStorage.getItem("auth_token");
      let start = dateRangeStart;
      let end = dateRangeEnd;
      if (period === "monthly") {
        const paddedMonth = selectedMonth.toString().padStart(2, "0");
        start = `${selectedYear}-${paddedMonth}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        end = `${selectedYear}-${paddedMonth}-${lastDay}`;
      } else if (period === "yearly") {
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
      }
      const res = await fetch(
        `/api/tasks/breakdown?staff_id=${staffId}&start_date=${start}&end_date=${end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data);
      }
    } catch (e) {
      console.error("Breakdown fetch error:", e);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
        return "text-emerald-600 bg-emerald-100";
      case "A":
        return "text-blue-600 bg-blue-100";
      case "B":
        return "text-amber-600 bg-amber-100";
      case "C":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-red-600 bg-red-100";
    }
  };

  const getRecommendationDisplay = (rec: string) => {
    switch (rec) {
      case "bonus_full_increment":
        return { text: "Bonus Penuh + Increment", icon: "⭐⭐⭐", color: "text-emerald-600" };
      case "bonus_full":
        return { text: "Bonus Penuh", icon: "⭐⭐", color: "text-blue-600" };
      case "bonus_half":
        return { text: "Bonus Separuh", icon: "⭐", color: "text-amber-600" };
      default:
        return { text: "Tiada Bonus", icon: "", color: "text-gray-500" };
    }
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= 85) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (rate >= 70) return <Minus className="w-4 h-4 text-amber-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 text-center font-medium text-gray-500">#{index + 1}</span>;
  };

  const getMonthName = (month: number) => {
    const months = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
    return months[month - 1];
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Akses ditolak</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-amber-500" />
            Skor Task Pasukan
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau prestasi task semua staff
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 mr-2">
            <button
              onClick={() => setSelectedRole("All")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                selectedRole === "All"
                  ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              Semua
            </button>
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedRole === role
                    ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                )}
              >
                {role}
              </button>
            ))}
          </div>

            <Select value={period} onValueChange={(v) => setPeriod(v as "weekly" | "monthly" | "yearly")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>

            {/* Yearly - pilih tahun */}
            {period === "yearly" && (
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Monthly - pilih bulan + tahun */}
            {period === "monthly" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
                    else setSelectedMonth(m => m - 1);
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium px-2 min-w-[110px] text-center">
                  {["Jan","Feb","Mac","Apr","Mei","Jun","Jul","Ogo","Sep","Okt","Nov","Dis"][selectedMonth - 1]} {selectedYear}
                </span>
                <button
                  onClick={() => {
                    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
                    else setSelectedMonth(m => m + 1);
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Weekly - date range picker */}
            {period === "weekly" && (
              <div className="flex items-center gap-1 text-sm">
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400 dark:bg-slate-700 dark:text-white"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400 dark:bg-slate-700 dark:text-white"
                />
              </div>
            )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                  Ranking Prestasi {period === "yearly" ? selectedYear : period === "monthly" ? `${["Jan","Feb","Mac","Apr","Mei","Jun","Jul","Ogo","Sep","Okt","Nov","Dis"][selectedMonth - 1]} ${selectedYear}` : `${dateRangeStart} — ${dateRangeEnd}`}
              </CardTitle>
            </CardHeader>
              <CardContent>
                {filteredScores.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Tiada data untuk jawatan ini</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                          <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3 pr-4">#</th>
                            <th className="pb-3 pr-4">Staff</th>
                            <th className="pb-3 pr-4">Jawatan</th>
                            <th className="pb-3 pr-4 text-center">Tasks</th>
                            <th className="pb-3 pr-4 text-center text-blue-600 dark:text-blue-400">KPI (%)</th>
                            <th className="pb-3 pr-4 text-center text-purple-600 dark:text-purple-400">KRI (%)</th>
                            <th className="pb-3 pr-4 text-center font-bold">Skor Akhir</th>
                            <th className="pb-3 pr-4 text-center">Gred</th>
                            {period === "yearly" && <th className="pb-3 text-center">Bonus</th>}
                            <th className="pb-3"></th>
                          </tr>
                      </thead>
                      <tbody>
                        {filteredScores.map((score, index) => {

                        const recDisplay = score.recommendation
                          ? getRecommendationDisplay(score.recommendation)
                          : null;

                        return (
                          <tr
                            key={score.staff_id}
                            className={cn(
                              "border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800",
                              index < 3 && "bg-amber-50/50 dark:bg-amber-950/10"
                            )}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center justify-center w-8">
                                {getRankIcon(index)}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {score.staff_name}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-sm text-gray-500">{score.category}</span>
                            </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="text-sm">
                                  {score.completedTasks}/{score.totalTasks}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {score.kpiRate}%
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                  {score.kriRate}%
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {getTrendIcon(score.completionRate)}
                                  <span className="text-sm font-bold">
                                    {score.completionRate}%
                                  </span>
                                </div>
                              </td>
                            <td className="py-3 pr-4 text-center">
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs font-bold",
                                  getGradeColor(score.grade)
                                )}
                              >
                                {score.grade}
                              </span>
                            </td>
                            {period === "yearly" && recDisplay && (
                              <td className="py-3 text-center">
                                <span className={cn("text-sm", recDisplay.color)}>
                                  {recDisplay.icon}
                                </span>
                              </td>
                            )}
                            <td className="py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchBreakdown(score.staff_id)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Lihat
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {yearlyReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Laporan Tahunan {yearlyReport.year}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setYearlyReport(null)}>
                    Tutup
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Skor KPI (40%)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {yearlyReport.summary.kpiRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Skor KRI (60%)</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {yearlyReport.summary.kriRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center border-2 border-amber-200 dark:border-amber-900">
                      <p className="text-sm text-gray-500 font-bold">Skor Akhir</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {yearlyReport.summary.completion_rate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Gred</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        yearlyReport.summary.grade.startsWith("A") ? "text-emerald-600" :
                        yearlyReport.summary.grade === "B" ? "text-amber-600" : "text-red-600"
                      )}>
                        {yearlyReport.summary.grade}
                      </p>
                    </div>
                  </div>

                <div>
                  <h4 className="font-semibold mb-3">Pecahan Suku Tahun</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {yearlyReport.quarterly.map((q) => (
                      <div
                        key={q.quarter}
                        className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-center"
                      >
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {q.quarter}
                        </p>
                          <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">
                            {q.rate}%
                          </p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">KPI: {q.kpiRate}%</span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">KRI: {q.kriRate}%</span>
                          </div>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-2", getGradeColor(q.grade))}>
                            {q.grade}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Trend Bulanan</h4>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {yearlyReport.monthly.map((m) => (
                      <div
                        key={m.month}
                        className="bg-gray-50 dark:bg-slate-800 rounded p-2 text-center"
                      >
                          <p className="text-xs text-gray-500">{getMonthName(m.month)}</p>
                          <p className="text-sm font-bold">{m.rate}%</p>
                          <div className="flex flex-col text-[8px] leading-tight mt-0.5 opacity-80">
                            <span className="text-blue-600 dark:text-blue-400">P:{m.kpiRate}%</span>
                            <span className="text-purple-600 dark:text-purple-400">R:{m.kriRate}%</span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Cadangan Bonus</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getRecommendationDisplay(yearlyReport.recommendation).icon}
                    </span>
                    <div>
                      <p className={cn("font-medium", getRecommendationDisplay(yearlyReport.recommendation).color)}>
                        {getRecommendationDisplay(yearlyReport.recommendation).text}
                      </p>
                      <p className="text-sm text-gray-500">
                        {yearlyReport.bonus_percentage}% daripada gaji
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Breakdown Panel */}
          {(breakdown || breakdownLoading) && (
            <Card className="border-2 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-amber-500" />
                    {breakdownLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Memuatkan...
                      </span>
                    ) : (
                      <span>
                        Prestasi Individu — <span className="text-amber-600">{breakdown?.staff?.name}</span>
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setBreakdown(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              {!breakdownLoading && breakdown && (
                <CardContent className="space-y-5">
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Jumlah Task</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">{breakdown.summary.total}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Diselesaikan</p>
                      <p className="text-2xl font-bold text-emerald-600">{breakdown.summary.completed}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Tidak Dibuat</p>
                      <p className="text-2xl font-bold text-red-500">{breakdown.summary.missed}</p>
                    </div>
                  </div>

                  {/* Insights */}
                  {breakdown.insights.never_done.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-red-700 dark:text-red-400 text-sm">
                          Tidak Pernah Dibuat ({breakdown.insights.never_done.length} task)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {breakdown.insights.never_done.map((title) => (
                          <span key={title} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {breakdown.insights.rarely_done.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-orange-700 dark:text-orange-400 text-sm">
                          Jarang Dibuat — bawah 50% ({breakdown.insights.rarely_done.length} task)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {breakdown.insights.rarely_done.map((item) => (
                          <span key={item.title} className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                            {item.title} ({item.rate}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {breakdown.insights.well_done.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                          Konsisten Dibuat — 80% ke atas ({breakdown.insights.well_done.length} task)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {breakdown.insights.well_done.map((item) => (
                          <span key={item.title} className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                            {item.title} ({item.rate}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full breakdown table */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Pecahan Setiap Task</h4>
                    <div className="space-y-2">
                      {breakdown.breakdown.map((item) => {
                        const isExpanded = expandedTask === item.template_id;
                        return (
                          <div key={item.template_id} className="rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center gap-3 p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0",
                                    item.indicator_type === 'KRI'
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-blue-100 text-blue-700"
                                  )}>
                                    {item.indicator_type}
                                  </span>
                                </div>
                                {/* Progress bar */}
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        item.completion_rate >= 80 ? "bg-emerald-500" :
                                        item.completion_rate >= 50 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${item.completion_rate}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold w-10 text-right shrink-0",
                                    item.completion_rate >= 80 ? "text-emerald-600" :
                                    item.completion_rate >= 50 ? "text-amber-600" : "text-red-500"
                                  )}>
                                    {item.completion_rate}%
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {item.completed}/{item.total}
                                </div>
                                {item.missed > 0 && (
                                  <button
                                    onClick={() => setExpandedTask(isExpanded ? null : item.template_id)}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-0.5"
                                  >
                                    {item.missed} tertinggal
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Expanded missed dates */}
                            {isExpanded && item.missed_dates.length > 0 && (
                              <div className="px-3 pb-3 border-t border-gray-100 dark:border-slate-700 pt-2">
                                <p className="text-xs text-gray-500 mb-2">Tarikh tidak dibuat:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.missed_dates.map((date) => {
                                    const d = new Date(date + 'T00:00:00');
                                    const dayNames = ['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'];
                                    return (
                                      <span key={date} className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                        {dayNames[d.getDay()]} {d.getDate()}/{d.getMonth()+1}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
