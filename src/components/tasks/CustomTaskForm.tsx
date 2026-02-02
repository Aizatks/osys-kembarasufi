"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Pin,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  User,
  Calendar,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Staff {
  id: string;
  name: string;
  category: string;
}

interface CustomTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  priority: string;
  status: string;
  points: number;
  completed_at: string | null;
  created_at: string;
  assigned_to_staff?: { id: string; name: string };
  assigned_by_staff?: { id: string; name: string };
}

const PRIORITIES = [
  { value: "low", label: "Rendah", color: "bg-green-100 text-green-700" },
  { value: "medium", label: "Sederhana", color: "bg-amber-100 text-amber-700" },
  { value: "high", label: "Tinggi", color: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "Segera", color: "bg-red-100 text-red-700" },
];

const STATUSES = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-gray-500" },
  { value: "in_progress", label: "Sedang Berjalan", icon: AlertCircle, color: "text-blue-500" },
  { value: "completed", label: "Selesai", icon: CheckCircle, color: "text-green-500" },
  { value: "cancelled", label: "Dibatalkan", icon: XCircle, color: "text-red-500" },
];

export function CustomTaskForm() {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
    points: 1,
  });

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin, statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = "/api/tasks/custom";
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/staff?status=approved", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStaffList(data.staff || []);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.assigned_to) {
      toast.error("Tajuk dan penerima diperlukan");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const method = editingTask ? "PUT" : "POST";
      const body = editingTask
        ? { id: editingTask.id, ...form }
        : form;

      const response = await fetch("/api/tasks/custom", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingTask ? "Task dikemaskini" : "Task dicipta");
        setDialogOpen(false);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error("Gagal menyimpan task");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/custom", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (response.ok) {
        toast.success("Status dikemaskini");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks/custom?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Task dipadam");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const openEditDialog = (task: CustomTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to,
      due_date: task.due_date || "",
      priority: task.priority,
      points: task.points,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setForm({
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "medium",
      points: 1,
    });
  };

  const getPriorityDisplay = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority) || PRIORITIES[1];
  };

  const getStatusDisplay = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pin className="w-7 h-7 text-amber-500" />
            Task Khas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Assign task khas kepada staff" : "Senarai task khas untuk anda"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? "Edit Task Khas" : "Assign Task Khas Baru"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="title">Tajuk</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Contoh: Siapkan presentation"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Penerangan</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Penerangan task..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="assigned_to">Assign Kepada</Label>
                  <Select
                    value={form.assigned_to}
                    onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}
                  >
                    <SelectTrigger id="assigned_to">
                      <SelectValue placeholder="Pilih staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} ({staff.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="due_date">Tarikh Akhir</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      min={1}
                      max={20}
                      value={form.points}
                      onChange={(e) => setForm((f) => ({ ...f, points: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Keutamaan</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm border transition-all",
                          form.priority === p.value
                            ? p.color + " border-transparent"
                            : "bg-gray-100 border-gray-200 text-gray-600 hover:border-amber-300"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {editingTask ? "Kemaskini" : "Assign Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
          className={statusFilter === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          Semua
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
            className={statusFilter === s.value ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-amber-500" />
            Senarai Task Khas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tiada task khas</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const priorityDisplay = getPriorityDisplay(task.priority);
                const statusDisplay = getStatusDisplay(task.status);
                const StatusIcon = statusDisplay.icon;

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {task.title}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", priorityDisplay.color)}>
                            {priorityDisplay.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assigned_to_staff?.name || "N/A"}
                          </span>
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString("ms-MY")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500" />
                            {task.points} pts
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleStatusChange(task.id, v)}
                        >
                          <SelectTrigger className="w-40">
                            <div className={cn("flex items-center gap-1", statusDisplay.color)}>
                              <StatusIcon className="w-4 h-4" />
                              {statusDisplay.label}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <div className={cn("flex items-center gap-1", s.color)}>
                                  <s.icon className="w-4 h-4" />
                                  {s.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
