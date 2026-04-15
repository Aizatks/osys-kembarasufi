"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Check, X, Loader2, Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles, Role } from "@/hooks/useRoles";
import { toast } from "sonner";

interface Permission {
  role: string;
  view_id: string;
  is_enabled: boolean;
}

const VIEWS = [
  { id: "dashboard-overview", label: "Dashboard Overview" },
  { id: "dashboard-sales", label: "Sales Report" },
  { id: "dashboard-leads", label: "Lead Report" },
  { id: "marketing-report", label: "Marketing Report" },
  { id: "view-all-staff", label: "Lihat Semua Staff (Dropdown)" },
  { id: "staff", label: "Pengurusan Staff" },
  { id: "quotations", label: "Sebut Harga" },
  { id: "activity-logs", label: "Log Aktiviti" },
  { id: "tasks", label: "Task Management" },
  { id: "task-scores", label: "Skor Task" },
  { id: "task-templates", label: "Template Task" },
  { id: "task-custom", label: "Task Khas" },
  { id: "media-library", label: "Media Library" },
  { id: "creative-requests", label: "Creative Request" },
  { id: "hr-attendance", label: "HR Attendance" },
  { id: "hr-payroll", label: "HR Payroll" },
  { id: "hr-claims", label: "HR Claims" },
  { id: "hr-staff-docs", label: "HR Staff Docs" },
  { id: "hr-recruitment", label: "HR Recruitment" },
  { id: "hr-interns", label: "HR Interns" },
  { id: "hr-memos", label: "HR Memos" },
  { id: "hr-leave", label: "HR Cuti" },
  { id: "operations-roster", label: "Operations Roster" },
  { id: "trip-dates", label: "Trip Dates" },
  { id: "package-pricing", label: "Package Pricing" },
  { id: "whatsapp-rotator", label: "WhatsApp Rotator" },
  { id: "whatsapp-blasting", label: "WhatsApp Blasting" },
  { id: "whatsapp-monitoring", label: "WhatsApp Monitoring" },
  { id: "waiting-list", label: "Waiting List" },
];

const COLOR_OPTIONS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-lime-100 text-lime-700",
  "bg-yellow-100 text-yellow-700",
  "bg-red-100 text-red-700",
  "bg-gray-100 text-gray-700",
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function SettingsContent() {
  const { isSuperAdmin } = useAuth();
  const { roles, assignableRoles, loading: rolesLoading, invalidateCache } = useRoles();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Role management state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ id: "", label: "", color: COLOR_OPTIONS[0], is_admin: false, sort_order: 50 });
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPermissions();
    }
  }, [isSuperAdmin]);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/settings/permissions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (role: string, viewId: string) => {
    const key = `${role}-${viewId}`;
    setSaving(key);

    const current = permissions.find(p => p.role === role && p.view_id === viewId);
    const newState = current ? !current.is_enabled : true;

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role, viewId, isEnabled: newState })
      });

      if (res.ok) {
        const data = await res.json();
        setPermissions(prev => {
          const index = prev.findIndex(p => p.role === role && p.view_id === viewId);
          if (index >= 0) {
            const newArr = [...prev];
            newArr[index] = data.permission;
            return newArr;
          }
          return [...prev, data.permission];
        });
        toast.success("Akses dikemaskini");
      }
    } catch (err) {
      console.error("Failed to update permission:", err);
      toast.error("Gagal mengemaskini akses");
    } finally {
      setSaving(null);
    }
  };

  const isEnabled = (role: string, viewId: string) => {
    return permissions.find(p => p.role === role && p.view_id === viewId)?.is_enabled ?? false;
  };

  // Role management functions
  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ id: "", label: "", color: COLOR_OPTIONS[0], is_admin: false, sort_order: 50 });
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({ id: role.id, label: role.label, color: role.color, is_admin: role.is_admin, sort_order: role.sort_order });
    setRoleDialogOpen(true);
  };

  const saveRole = async () => {
    if (!roleForm.label.trim()) {
      toast.error("Nama peranan diperlukan");
      return;
    }
    setSavingRole(true);
    try {
      const token = localStorage.getItem("auth_token");
      const id = editingRole ? editingRole.id : slugify(roleForm.label);
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...roleForm, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editingRole ? "Peranan dikemaskini" : "Peranan baru ditambah");
      setRoleDialogOpen(false);
      invalidateCache();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan peranan");
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Adakah anda pasti mahu memadamkan peranan ini?")) return;
    setDeletingRole(roleId);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/settings/roles?id=${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Peranan dipadam");
      invalidateCache();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal memadamkan peranan");
    } finally {
      setDeletingRole(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Anda tidak mempunyai akses ke halaman ini</p>
      </div>
    );
  }

  // Filter roles for RBAC grid — exclude unassigned and superadmin
  const rbacRoles = assignableRoles.filter(r => r.id !== "superadmin");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" /> Tetapan Sistem
        </h2>
        <p className="text-sm text-muted-foreground">Urus kebenaran akses mengikut jawatan</p>
      </div>

      {/* Role Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-500" />
              <div>
                <CardTitle>Urus Jawatan / Peranan</CardTitle>
                <CardDescription>Tambah, kemaskini, atau padam jawatan. Jawatan sistem tidak boleh dipadam.</CardDescription>
              </div>
            </div>
            <Button onClick={openAddRole} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Tambah Jawatan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {roles.filter(r => r.id !== "unassigned").map(role => (
                <div key={role.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${role.color} dark:opacity-80`}>
                      {role.label}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{role.id}</p>
                    {role.is_admin && <p className="text-[10px] text-amber-500 font-medium">Admin</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditRole(role)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {!role.is_system && (
                      <button
                        onClick={() => deleteRole(role.id)}
                        disabled={deletingRole === role.id}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        {deletingRole === role.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RBAC Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <div>
              <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
              <CardDescription>Tandakan bahagian yang boleh diakses oleh setiap jawatan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left py-4 px-4 font-medium text-slate-500 dark:text-slate-400">Bahagian / View</th>
                    {rbacRoles.map(role => (
                      <th key={role.id} className="text-center py-4 px-4 font-medium text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VIEWS.map(view => (
                    <tr key={view.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{view.label}</span>
                        <p className="text-xs text-slate-400">{view.id}</p>
                      </td>
                      {rbacRoles.map(role => {
                        const active = isEnabled(role.id, view.id);
                        const key = `${role.id}-${view.id}`;
                        const isSaving = saving === key;

                        return (
                          <td key={role.id} className="py-4 px-4 text-center">
                            <button
                              onClick={() => togglePermission(role.id, view.id)}
                              disabled={isSaving}
                              className={`
                                w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all
                                ${active
                                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shadow-sm'
                                  : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }
                                ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                              `}
                            >
                              {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : active ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <X className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex gap-3">
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Nota:</strong> Superadmin sentiasa mempunyai akses penuh ke semua bahagian tanpa mengira tetapan di atas.
          Perubahan akan berkuat kuasa serta-merta apabila staff menyegarkan (refresh) halaman.
        </p>
      </div>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Kemaskini Jawatan" : "Tambah Jawatan Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Jawatan</Label>
              <Input
                value={roleForm.label}
                onChange={e => setRoleForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="cth: Content Creator"
              />
              {!editingRole && roleForm.label && (
                <p className="text-xs text-slate-400">ID: {slugify(roleForm.label)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setRoleForm(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-lg ${color.split(' ')[0]} border-2 transition-all ${roleForm.color === color ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${roleForm.color}`}>
                  {roleForm.label || "Preview"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={roleForm.is_admin}
                onCheckedChange={v => setRoleForm(prev => ({ ...prev, is_admin: v }))}
              />
              <Label>Peranan Admin (akses pengurusan)</Label>
            </div>
            <div className="space-y-2">
              <Label>Susunan (sort order)</Label>
              <Input
                type="number"
                value={roleForm.sort_order}
                onChange={e => setRoleForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Batal</Button>
            <Button onClick={saveRole} disabled={savingRole}>
              {savingRole ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingRole ? "Kemaskini" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
