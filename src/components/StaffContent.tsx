"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Check,
  X,
  Shield,
  UserCog,
  User,
  Loader2,
  Eye,
  Trash2,
  KeyRound,
  Copy,
  MoreHorizontal,
  UserX,
  UserCheck,
  Tag
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_sales: boolean;
  created_at: string;
  last_login?: string;
}

const ROLES = [
  { id: "staff", label: "Sales", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" },
  { id: "admin", label: "Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400" },
  { id: "sales-marketing-manager", label: "Sales & Marketing Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
  { id: "admin-manager", label: "Admin Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
  { id: "hr-manager", label: "Human Resources Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
  { id: "finance-manager", label: "Finance Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
  { id: "tour-coordinator-manager", label: "Tour Coordinator Manager(pic)", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
  { id: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400" },
  { id: "media-videographic", label: "Media/Video Graphic", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400" },
  { id: "operation", label: "Operation", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
  { id: "c-suite", label: "C-Suite", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400" },
  { id: "tour-coordinator", label: "Tour Coordinator (PIC)", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
  { id: "ejen", label: "Ejen", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" },
  { id: "superadmin", label: "Superadmin", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" },
  { id: "pengurus", label: "Pengurus (Legacy)", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400" }
];

const getRoleConfig = (roleId: string) => {
  return ROLES.find(r => r.id === roleId) || { label: roleId, color: "bg-slate-100 text-slate-700" };
};

export function StaffContent() {
  const { user, isAdmin, isSuperAdmin, setImpersonation } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "revoked">("all");
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; staffId: string; staffName: string; newPassword?: string }>({ 
    open: false, 
    staffId: "", 
    staffName: "" 
  });
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/staff", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (staffId: string) => {
    try {
      setImpersonatingId(staffId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/staff/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof setImpersonation === "function") {
          setImpersonation(data.token, data.user);
          window.location.reload();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Gagal impersonate");
      }
    } catch (error) {
      console.error("Impersonate error:", error);
      toast.error("Ralat sistem");
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleAction = async (staffId: string, action: string, role?: string, category?: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffId, action, role, category }),
      });
      if (response.ok) {
        fetchStaff();
        const actionMessages: Record<string, string> = {
          approve: "Staff diluluskan",
          reject: "Staff ditolak",
          revoke: "Akses staff dinyahaktif",
          reactivate: "Akses staff diaktifkan semula",
          changeRole: `Peranan ditukar ke ${role}`,
          changeCategory: `Kategori ditukar ke ${category}`,
        };
        toast.success(actionMessages[action] || "Berjaya");
      } else {
        const data = await response.json();
        toast.error(data.error || "Gagal");
      }
    } catch (error) {
      console.error("Action failed:", error);
      toast.error("Ralat sistem");
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!isSuperAdmin) return;
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchStaff();
        toast.success("Staff dipadam");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Gagal memadam");
    }
  };

  const handleResetPassword = async (staffId: string, staffName: string) => {
    setResetPasswordModal({ open: true, staffId, staffName });
    setResettingPassword(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffId }),
      });
      if (response.ok) {
        const data = await response.json();
        setResetPasswordModal({ open: true, staffId, staffName, newPassword: data.newPassword });
      } else {
        const data = await response.json();
        toast.error(data.error || "Gagal reset password");
        setResetPasswordModal({ open: false, staffId: "", staffName: "" });
      }
    } catch (error) {
      console.error("Reset password failed:", error);
      toast.error("Ralat sistem");
      setResetPasswordModal({ open: false, staffId: "", staffName: "" });
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  };

  const filteredStaff = staff.filter(s => {
    if (filter === "pending") return s.status === "pending";
    if (filter === "approved") return s.status === "approved";
    if (filter === "revoked") return s.status === "revoked";
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Anda tidak mempunyai akses ke halaman ini</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" /> Pengurusan Staff
          </h2>
          <p className="text-sm text-muted-foreground">Urus akaun staff dan kelulusan</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Semua
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
            className="whitespace-nowrap"
          >
            Menunggu ({staff.filter(s => s.status === "pending").length})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("approved")}
          >
            Aktif
          </Button>
          <Button
            variant={filter === "revoked" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("revoked")}
            className="whitespace-nowrap"
          >
            Nyahaktif ({staff.filter(s => s.status === "revoked").length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Staff ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tiada staff</p>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      s.role === "superadmin" ? "bg-purple-600" :
                      s.role === "admin" ? "bg-blue-600" : "bg-gray-400"
                    }`}>
                      {s.role === "superadmin" ? <Shield className="w-5 h-5 text-white" /> :
                       s.role === "admin" ? <UserCog className="w-5 h-5 text-white" /> :
                       <User className="w-5 h-5 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-sm text-gray-500 truncate">{s.email}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleConfig(s.role).color}`}>
                              {getRoleConfig(s.role).label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              s.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
                              s.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" :
                              "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                            }`}>
                              {s.status === "revoked" ? "Nyahaktif" : s.status}
                            </span>
                          </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {s.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(s.id, "approve")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Luluskan</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(s.id, "reject")}
                        >
                          <X className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Tolak</span>
                        </Button>
                      </>
                    )}
                    
                    {s.status === "revoked" && s.role !== "superadmin" && isSuperAdmin && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(s.id, "reactivate")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Aktifkan Semula
                      </Button>
                    )}

                    {s.status === "approved" && s.role !== "superadmin" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleImpersonate(s.id)}
                              disabled={impersonatingId === s.id}
                              className="text-orange-600"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Impersonate
                            </DropdownMenuItem>
                          )}
                          
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(s.id, s.name)}
                              className="text-amber-600"
                            >
                              <KeyRound className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                          )}

                          {isSuperAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Tukar Peranan
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {ROLES.filter(r => r.id !== 'superadmin').map((role) => (
                                      <DropdownMenuItem
                                        key={role.id}
                                        onClick={() => handleAction(s.id, "changeRole", role.id)}
                                      >
                                        {role.label}
                                        {s.role === role.id && <Check className="w-4 h-4 ml-auto" />}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => handleAction(s.id, "revoke")}
                                className="text-red-600"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Nyahaktif Akses
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => handleDelete(s.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Padam Akaun
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetPasswordModal.open} onOpenChange={(open) => !open && setResetPasswordModal({ open: false, staffId: "", staffName: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Password baru untuk <strong>{resetPasswordModal.staffName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {resettingPassword ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : resetPasswordModal.newPassword ? (
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Password baru:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-slate-900 px-4 py-3 rounded text-lg font-mono text-green-600 tracking-wider">
                    {resetPasswordModal.newPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(resetPasswordModal.newPassword!)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
                Sila berikan password ini kepada staff. Password ini hanya dipaparkan sekali.
              </p>
              <Button 
                onClick={() => setResetPasswordModal({ open: false, staffId: "", staffName: "" })}
                className="w-full"
              >
                Tutup
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
