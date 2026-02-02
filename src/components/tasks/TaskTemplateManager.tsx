"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Star,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  target_role: string[] | null;
  points: number;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
    indicator_type: 'KPI' | 'KRI';
    weightage: number;
    attachment_requirement: 'none' | 'optional' | 'mandatory';
  }
  
  const CATEGORIES = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
];

const ROLES = ["Sales", "Ejen", "Marketing", "Admin", "PIC", "Pengurus", "C-Suite"];

export function TaskTemplateManager() {
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("daily");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

    const [form, setForm] = useState({
      title: "",
      description: "",
      category: "daily",
      target_role: [] as string[],
      points: 1,
      is_mandatory: false,
      sort_order: 0,
      indicator_type: "KPI" as "KPI" | "KRI",
      weightage: 1,
      attachment_requirement: 'none' as 'none' | 'optional' | 'mandatory',
    });

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [isAdmin, selectedCategory]);

  const filteredTemplates = templates.filter(t => {
    if (selectedRole === "All") return true;
    return t.target_role?.includes(selectedRole);
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/tasks/templates?category=${selectedCategory}&activeOnly=false`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Gagal memuat template");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Tajuk diperlukan");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { id: editingTemplate.id, ...form }
        : form;

      const response = await fetch("/api/tasks/templates", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingTemplate ? "Template dikemaskini" : "Template dicipta");
        setDialogOpen(false);
        resetForm();
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks/templates?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Template dipadam");
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Gagal memadam template");
    }
  };

  const handleToggleActive = async (template: TaskTemplate) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: template.id,
          is_active: !template.is_active,
        }),
      });

      if (response.ok) {
        toast.success(template.is_active ? "Template dinyahaktifkan" : "Template diaktifkan");
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to toggle template:", error);
    }
  };

    const openEditDialog = (template: TaskTemplate) => {
      setEditingTemplate(template);
      setForm({
        title: template.title,
        description: template.description || "",
        category: template.category,
        target_role: template.target_role || [],
        points: template.points,
        is_mandatory: template.is_mandatory,
        sort_order: template.sort_order,
        indicator_type: template.indicator_type || "KPI",
        weightage: template.weightage || 1,
        attachment_requirement: template.attachment_requirement || 'none',
      });
      setDialogOpen(true);
    };

  const resetForm = () => {
    setEditingTemplate(null);
    setForm({
      title: "",
      description: "",
      category: selectedCategory,
      target_role: selectedRole !== "All" ? [selectedRole] : [],
      points: 1,
      is_mandatory: false,
      sort_order: 0,
        indicator_type: "KPI" as "KPI" | "KRI",
        weightage: 1,
        attachment_requirement: 'none' as 'none' | 'optional' | 'mandatory',
      });
    };
  
    const toggleRole = (role: string) => {
      setForm((prev) => ({
        ...prev,
        target_role: prev.target_role.includes(role)
          ? prev.target_role.filter((r) => r !== role)
          : [...prev.target_role, role],
      }));
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
              <Settings className="w-7 h-7 text-amber-500" />
              Urus Task Template
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tambah, edit atau padam task template
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Tambah Template Baru"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="title">Tajuk</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Contoh: Follow up leads"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="indicator_type">Jenis Indikator</Label>
                      <Select
                        value={form.indicator_type}
                        onValueChange={(v: "KPI" | "KRI") => setForm((f) => ({ ...f, indicator_type: v }))}
                      >
                        <SelectTrigger id="indicator_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KPI">KPI (Task)</SelectItem>
                          <SelectItem value="KRI">KRI (Result)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="weightage">Weightage (%)</Label>
                      <Input
                        id="weightage"
                        type="number"
                        min={1}
                        max={100}
                        value={form.weightage}
                        onChange={(e) => setForm((f) => ({ ...f, weightage: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="attachment_requirement">Attachment</Label>
                      <Select
                        value={form.attachment_requirement}
                        onValueChange={(v: 'none' | 'optional' | 'mandatory') => setForm((f) => ({ ...f, attachment_requirement: v }))}
                      >
                        <SelectTrigger id="attachment_requirement">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tiada</SelectItem>
                          <SelectItem value="optional">Opsional</SelectItem>
                          <SelectItem value="mandatory">Wajib</SelectItem>
                        </SelectContent>
                      </Select>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sort_order">Urutan</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      min={0}
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              <div>
                <Label>Target Role</Label>
                <p className="text-xs text-gray-500 mb-2">Kosongkan untuk semua role</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border transition-all",
                        form.target_role.includes(role)
                          ? "bg-amber-100 border-amber-300 text-amber-700"
                          : "bg-gray-100 border-gray-200 text-gray-600 hover:border-amber-300"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mandatory">Wajib</Label>
                    <p className="text-xs text-gray-500">Task yang mesti diselesaikan</p>
                  </div>
                  <Switch
                    id="mandatory"
                    checked={form.is_mandatory}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_mandatory: v }))}
                  />
                </div>
                <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingTemplate ? "Kemaskini" : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className={selectedCategory === cat.value ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider">Jawatan:</span>
          <button
            onClick={() => setSelectedRole("All")}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-all",
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
                "px-3 py-1 rounded-md text-sm font-medium transition-all",
                selectedRole === role
                  ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            Template {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Tiada template untuk jawatan ini</p>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => (

                <div
                  key={template.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    template.is_active
                      ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                      : "bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-800 opacity-60"
                  )}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {template.title}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                          template.indicator_type === 'KRI' 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" 
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        )}>
                          {template.indicator_type || 'KPI'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                          W: {template.weightage || 1}%
                        </span>
                        {template.is_mandatory && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                          Wajib
                        </span>
                      )}
                      {!template.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                          Tidak Aktif
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                    )}
                    {template.target_role && template.target_role.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {template.target_role.map((r) => (
                          <span
                            key={r}
                            className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 font-medium">
                    <Star className="w-4 h-4" />
                    {template.points}
                  </div>
                    <div className="flex items-center gap-1">
                      <div className="px-2">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                      </div>
                      <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
