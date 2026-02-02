"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Check, X, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Permission {
  role: string;
  view_id: string;
  is_enabled: boolean;
}

const ROLES = [
  "admin", 
  "superadmin",
  "c-suite", 
  "pengurus", 
  "staff", 
  "marketing", 
  "finance",
  "hr",
  "media-videographic",
  "tour-coordinator", 
  "ejen",
  "introducer",
  "admin-manager",
  "hr-manager",
  "finance-manager",
  "tour-coordinator-manager",
  "sales-marketing-manager",
  "operation"
];
const VIEWS = [
  { id: "dashboard-overview", label: "Dashboard Overview" },
  { id: "dashboard-sales", label: "Sales Report" },
  { id: "dashboard-leads", label: "Lead Report" },
  { id: "marketing-report", label: "Marketing Report" },
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
  { id: "operations-roster", label: "Operations Roster" },
  { id: "trip-dates", label: "Trip Dates" },
  { id: "package-pricing", label: "Package Pricing" },
  { id: "whatsapp-rotator", label: "WhatsApp Rotator" },
  { id: "whatsapp-blasting", label: "WhatsApp Blasting" },
  { id: "whatsapp-monitoring", label: "WhatsApp Monitoring" },
];

export function SettingsContent() {
  const { isSuperAdmin } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Anda tidak mempunyai akses ke halaman ini</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" /> Tetapan Sistem
        </h2>
        <p className="text-sm text-muted-foreground">Urus kebenaran akses mengikut jawatan</p>
      </div>

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
                    {ROLES.map(role => (
                      <th key={role} className="text-center py-4 px-4 font-medium text-slate-500 dark:text-slate-400 capitalize">
                        {role}
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
                      {ROLES.map(role => {
                        const active = isEnabled(role, view.id);
                        const key = `${role}-${view.id}`;
                        const isSaving = saving === key;

                        return (
                          <td key={role} className="py-4 px-4 text-center">
                            <button
                              onClick={() => togglePermission(role, view.id)}
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
    </div>
  );
}
