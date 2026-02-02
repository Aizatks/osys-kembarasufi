"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  CheckSquare, 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Star,
  Clock,
  Target,
  Trophy,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  points: number;
  is_mandatory: boolean;
}

interface DailyTask {
  id: string;
  staff_id: string;
  task_date: string;
  template_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  points_earned: number;
    template: TaskTemplate | null;
    attachment_url: string | null;
  }
  
  interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  earnedPoints: number;
  completionRate: number;
}

export function TaskManagementTab() {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    totalTasks: 0,
    completedTasks: 0,
    totalPoints: 0,
    earnedPoints: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("daily");
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [addingCustomTask, setAddingCustomTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const formatDateLocal = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString("ms-MY", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const dateStr = formatDateLocal(selectedDate);
      const response = await fetch(
        `/api/tasks/daily?date=${dateStr}&category=${activeTab}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setSummary(data.summary || {
          totalTasks: 0,
          completedTasks: 0,
          totalPoints: 0,
          earnedPoints: 0,
          completionRate: 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Gagal memuat task");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    setUpdatingTaskId(taskId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/daily", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: taskId,
          is_completed: !currentStatus,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? data.task : t))
        );
        
        if (!currentStatus) {
          const task = tasks.find(t => t.id === taskId);
          const points = task?.template?.points || 0;
          toast.success(`Task selesai! +${points} pts`, {
            icon: <Sparkles className="w-4 h-4 text-amber-500" />,
          });
        }
        
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Gagal kemaskini task");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleAddCustomTask = async () => {
    if (!customTaskTitle.trim()) return;

    setAddingCustomTask(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          custom_title: customTaskTitle,
          task_date: formatDateLocal(selectedDate),
        }),
      });

      if (response.ok) {
        toast.success("Task custom ditambah");
        setCustomTaskTitle("");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to add custom task:", error);
      toast.error("Gagal tambah task");
    } finally {
      setAddingCustomTask(false);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (activeTab === "daily") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (activeTab === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const getGradeColor = (rate: number) => {
    if (rate >= 95) return "text-emerald-600";
    if (rate >= 85) return "text-blue-600";
    if (rate >= 70) return "text-amber-600";
    if (rate >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeBg = (rate: number) => {
    if (rate >= 95) return "bg-emerald-100";
    if (rate >= 85) return "bg-blue-100";
    if (rate >= 70) return "bg-amber-100";
    if (rate >= 50) return "bg-orange-100";
    return "bg-red-100";
  };

  const getGrade = (rate: number) => {
    if (rate >= 95) return "A+";
    if (rate >= 85) return "A";
    if (rate >= 70) return "B";
    if (rate >= 50) return "C";
    return "D";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-amber-500" />
            Task Harian
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Senarai tugas harian untuk {user?.name}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="daily" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Harian
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Mingguan
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            Bulanan
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("prev")}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelum
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("next")}
            >
              Seterusnya
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Progress {activeTab === "daily" ? "Hari Ini" : activeTab === "weekly" ? "Minggu Ini" : "Bulan Ini"}
                  </span>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full font-bold text-sm",
                  getGradeBg(summary.completionRate),
                  getGradeColor(summary.completionRate)
                )}>
                  Gred {getGrade(summary.completionRate)}
                </div>
              </div>
              <Progress 
                value={summary.completionRate} 
                className="h-3 mb-2"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {summary.completedTasks}/{summary.totalTasks} tasks ({summary.completionRate}%)
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Star className="w-4 h-4" />
                  {summary.earnedPoints}/{summary.totalPoints} pts
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                Senarai Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Tiada task untuk tarikh ini
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const title = task.template?.title || task.custom_title || "Task";
                    const description = task.template?.description || task.custom_description;
                    const points = task.template?.points || 0;
                    const isMandatory = task.template?.is_mandatory || false;
                    const isUpdating = updatingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-all",
                          task.is_completed
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-amber-300"
                        )}
                      >
                        <button
                          onClick={() => handleToggleTask(task.id, task.is_completed)}
                          disabled={isUpdating}
                          className={cn(
                            "mt-0.5 flex-shrink-0 transition-all",
                            task.is_completed
                              ? "text-green-600"
                              : "text-gray-400 hover:text-amber-500"
                          )}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : task.is_completed ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "font-medium",
                                task.is_completed
                                  ? "text-green-700 dark:text-green-400 line-through"
                                  : "text-gray-800 dark:text-gray-200"
                              )}
                            >
                              {title}
                            </span>
                            {isMandatory && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                                Wajib
                              </span>
                            )}
                            {!task.template_id && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                                Custom
                              </span>
                            )}
                          </div>
                          {description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {description}
                            </p>
                          )}
                          {task.completed_at && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Selesai: {new Date(task.completed_at).toLocaleTimeString("ms-MY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 font-medium text-sm">
                          <Star className="w-4 h-4" />
                          {points} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "daily" && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tambah task custom..."
                      value={customTaskTitle}
                      onChange={(e) => setCustomTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomTask()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddCustomTask}
                      disabled={addingCustomTask || !customTaskTitle.trim()}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {addingCustomTask ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
