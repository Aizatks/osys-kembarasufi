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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);

  const ROLES = ["Sales", "Ejen", "Marketing", "Admin", "PIC"];

  useEffect(() => {
    if (isAdmin) {
      fetchScores();
    }
  }, [isAdmin, period, selectedYear]);

  const filteredScores = scores.filter(s => {
    if (selectedRole === "All") return true;
    return s.category === selectedRole;
  });

  const fetchScores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = `/api/tasks/scores?all=true&period=${period}`;
      if (period === "yearly") {
        url += `&year=${selectedYear}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setScores(data.scores || []);
      }
    } catch (error) {
      console.error("Failed to fetch scores:", error);
      toast.error("Gagal memuat skor");
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
                Ranking Prestasi {period === "yearly" ? selectedYear : period === "weekly" ? "Minggu Ini" : "Bulan Ini"}
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
                              {period === "yearly" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchYearlyReport(score.staff_id)}
                                >
                                  Details
                                </Button>
                              )}
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
        </>
      )}
    </div>
  );
}
