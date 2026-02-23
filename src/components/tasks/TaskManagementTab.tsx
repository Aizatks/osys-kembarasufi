"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Sparkles,
  Paperclip,
  Upload,
  X,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  points: number;
  is_mandatory: boolean;
  attachment_requirement: string | null;
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
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadTaskId, setPendingUploadTaskId] = useState<string | null>(null);
  const [linkInputTaskId, setLinkInputTaskId] = useState<string | null>(null);
  const [linkInputValue, setLinkInputValue] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      } else {
        const data = await response.json();
        toast.error(data.error || "Gagal kemaskini task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Gagal kemaskini task");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleUploadAttachment = async (taskId: string, file: File) => {
    setUploadingTaskId(taskId);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("task_id", taskId);

      const response = await fetch("/api/tasks/attachment", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => prev.map(t => (t.id === taskId ? data.task : t)));
        toast.success("Attachment berjaya dimuat naik");
      } else {
        toast.error("Gagal muat naik attachment");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal muat naik attachment");
    } finally {
      setUploadingTaskId(null);
      setPendingUploadTaskId(null);
    }
  };

  const handleRemoveAttachment = async (taskId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks/attachment?task_id=${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => prev.map(t => (t.id === taskId ? data.task : t)));
        toast.success("Attachment dibuang");
      }
    } catch (error) {
      console.error("Remove attachment error:", error);
    }
  };

  const handleSubmitLink = async (taskId: string) => {
    const link = linkInputValue.trim();
    if (!link) return;
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      toast.error("Sila masukkan link yang sah (bermula dengan http:// atau https://)");
      return;
    }
    setUploadingTaskId(taskId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/attachment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task_id: taskId, link }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => prev.map(t => (t.id === taskId ? data.task : t)));
        toast.success("Link berjaya dilampirkan");
        setLinkInputTaskId(null);
        setLinkInputValue("");
      } else {
        toast.error("Gagal lampirkan link");
      }
    } catch (error) {
      console.error("Link submit error:", error);
      toast.error("Gagal lampirkan link");
    } finally {
      setUploadingTaskId(null);
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

    const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        setSelectedDate(new Date(e.target.value + "T00:00:00"));
        setShowDatePicker(false);
      }
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
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatDateDisplay(selectedDate)}
                  </span>
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                    <input
                      type="date"
                      value={formatDateLocal(selectedDate)}
                      onChange={handleDatePickerChange}
                      className="block w-full text-sm border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1.5 focus:outline-none focus:border-amber-400 dark:bg-slate-700 dark:text-white"
                      autoFocus
                      onBlur={() => setTimeout(() => setShowDatePicker(false), 150)}
                    />
                  </div>
                )}
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
                        const attachReq = task.template?.attachment_requirement;
                        const requiresAttachment = !!attachReq && attachReq !== 'none' && attachReq !== 'Tiada';
                        const hasAttachment = !!task.attachment_url;
                      const isBlocked = requiresAttachment && !hasAttachment && !task.is_completed;
                      const isUpdating = updatingTaskId === task.id;
                      const isUploading = uploadingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "flex flex-col gap-2 p-3 rounded-lg border transition-all",
                            task.is_completed
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : isBlocked
                              ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                              : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-amber-300"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => {
                                if (isBlocked) {
                                  toast.error(`Sila lampirkan ${task.template?.attachment_requirement} dahulu sebelum tandakan selesai`);
                                  return;
                                }
                                handleToggleTask(task.id, task.is_completed);
                              }}
                              disabled={isUpdating}
                              className={cn(
                                "mt-0.5 flex-shrink-0 transition-all",
                                task.is_completed
                                  ? "text-green-600"
                                  : isBlocked
                                  ? "text-orange-400 cursor-not-allowed"
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
                                {requiresAttachment && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded flex items-center gap-1",
                                    hasAttachment
                                      ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                                      : "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
                                  )}>
                                    <Paperclip className="w-3 h-3" />
                                    {hasAttachment ? "Dilampirkan" : "Perlu Lampiran"}
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
                              {requiresAttachment && !hasAttachment && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                  Lampirkan {task.template?.attachment_requirement} untuk selesaikan task ini
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

                            {requiresAttachment && (
                              <div className="ml-9 flex flex-col gap-2">
                                {hasAttachment ? (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={task.attachment_url!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Lihat Lampiran
                                    </a>
                                    {!task.is_completed && (
                                      <button
                                        onClick={() => handleRemoveAttachment(task.id)}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                      >
                                        <X className="w-3 h-3" />
                                        Buang
                                      </button>
                                    )}
                                  </div>
                                ) : linkInputTaskId === task.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="url"
                                      placeholder="https://..."
                                      value={linkInputValue}
                                      onChange={(e) => setLinkInputValue(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && handleSubmitLink(task.id)}
                                      className="text-xs px-2 py-1 rounded border border-gray-300 flex-1 focus:outline-none focus:border-amber-400"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSubmitLink(task.id)}
                                      disabled={isUploading}
                                      className="text-xs px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                    >
                                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Hantar"}
                                    </button>
                                    <button
                                      onClick={() => { setLinkInputTaskId(null); setLinkInputValue(""); }}
                                      className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <>
                                      <input
                                        ref={pendingUploadTaskId === task.id ? fileInputRef : null}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadAttachment(task.id, file);
                                          e.target.value = "";
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          setPendingUploadTaskId(task.id);
                                          setTimeout(() => fileInputRef.current?.click(), 50);
                                        }}
                                        disabled={isUploading}
                                        className="text-xs px-2 py-1 rounded border border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {isUploading ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Upload className="w-3 h-3" />
                                        )}
                                        {isUploading ? "Memuat naik..." : "Muat Naik Fail"}
                                      </button>
                                    </>
                                    <button
                                      onClick={() => { setLinkInputTaskId(task.id); setLinkInputValue(""); }}
                                      className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Masukkan Link
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
