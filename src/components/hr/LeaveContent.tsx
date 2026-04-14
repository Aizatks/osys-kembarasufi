"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CalendarOff,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Settings2,
  Upload,
  Edit3,
  Trash2,
  Users,
  Save,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LeaveType {
  id: string;
  label: string;
  short_code: string;
  default_days: number;
  is_paid: boolean;
  requires_doc: boolean;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface LeaveRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  attachment_url?: string;
  status: string;
  layer1_approver_name?: string;
  layer1_approved_at?: string;
  layer1_note?: string;
  layer2_approver_name?: string;
  layer2_approved_at?: string;
  layer2_note?: string;
  created_at: string;
}

interface LeaveEntitlement {
  id: string;
  staff_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  carried_over: number;
}

interface StaffBasic {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

type TabView = "requests" | "pending" | "entitlements" | "types" | "staff-entitlements";

const HR_ROLES = ["admin", "superadmin", "hr", "hr-manager", "c-suite"];
const PRESET_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#6b7280", "#ec4899", "#8b5cf6", "#14b8a6", "#64748b", "#f97316"];

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
}
function getHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}
function getAuthHeader() {
  return { Authorization: `Bearer ${getToken()}` };
}

// Staff Picker with search
function StaffPicker({ staffList, value, onChange }: { staffList: StaffBasic[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!q) return staffList;
    return staffList.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  }, [staffList, q]);
  const selected = staffList.find((s) => s.id === value);
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>{selected ? selected.name : "Pilih staff..."}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2"><Input placeholder="Cari nama..." value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-sm" autoFocus /></div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Tiada</p> : filtered.map((s) => (
              <button key={s.id} type="button" onClick={() => { onChange(s.id); setOpen(false); setQ(""); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${s.id === value ? "bg-accent font-medium" : ""}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LeaveContent() {
  const { user, isAdmin } = useAuth();
  const isHR = HR_ROLES.includes(user?.role || "");
  const [tab, setTab] = useState<TabView>("requests");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [allEntitlements, setAllEntitlements] = useState<LeaveEntitlement[]>([]);
  const [staffList, setStaffList] = useState<StaffBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Apply form
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ leave_type_id: "", start_date: "", end_date: "", total_days: 1, reason: "" });

  // Approval dialog
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<LeaveRequest | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalAction, setApprovalAction] = useState<string>("");

  // Leave type edit dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeForm, setTypeForm] = useState<LeaveType>({ id: "", label: "", short_code: "", default_days: 0, is_paid: true, requires_doc: false, color: "#3b82f6", is_active: true, sort_order: 0 });
  const [isNewType, setIsNewType] = useState(false);

  // Staff entitlement dialog
  const [entDialogOpen, setEntDialogOpen] = useState(false);
  const [entForm, setEntForm] = useState({ staff_id: "", leave_type_id: "", year: new Date().getFullYear(), total_days: 0 });

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/leave-types", { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setLeaveTypes(data.leaveTypes || []); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/leave?type=requests", { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setRequests(data.requests || []); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/leave?type=pending", { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setPendingRequests(data.requests || []); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchEntitlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr/leave?type=entitlements&year=${new Date().getFullYear()}`, { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setEntitlements(data.entitlements || []); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchAllEntitlements = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr/leave?type=entitlements&year=${new Date().getFullYear()}`, { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setAllEntitlements(data.entitlements || []); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff", { headers: getAuthHeader() });
      if (res.ok) { const data = await res.json(); setStaffList((data.staff || []).filter((s: StaffBasic) => s.status === "approved" && s.role !== "unassigned")); }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
    fetchRequests();
    fetchEntitlements();
    if (isHR) { fetchPending(); fetchStaff(); fetchAllEntitlements(); }
  }, [fetchLeaveTypes, fetchRequests, fetchEntitlements, fetchPending, fetchStaff, fetchAllEntitlements, isHR]);

  // Auto calculate days
  useEffect(() => {
    if (applyForm.start_date && applyForm.end_date) {
      const start = new Date(applyForm.start_date);
      const end = new Date(applyForm.end_date);
      let days = 0;
      const d = new Date(start);
      while (d <= end) { if (d.getDay() !== 0 && d.getDay() !== 6) days++; d.setDate(d.getDate() + 1); }
      setApplyForm((prev) => ({ ...prev, total_days: Math.max(1, days) }));
    }
  }, [applyForm.start_date, applyForm.end_date]);

  const getLeaveType = (id: string) => leaveTypes.find((t) => t.id === id);
  const getStaffName = (id: string) => staffList.find((s) => s.id === id)?.name || "Unknown";

  // === Apply Leave ===
  const handleApply = async () => {
    if (!applyForm.leave_type_id || !applyForm.start_date || !applyForm.end_date) { toast.error("Sila lengkapkan maklumat cuti"); return; }
    try {
      const res = await fetch("/api/hr/leave", { method: "POST", headers: getHeaders(), body: JSON.stringify({ action: "apply", ...applyForm }) });
      if (res.ok) { toast.success("Permohonan cuti dihantar"); setApplyOpen(false); setApplyForm({ leave_type_id: "", start_date: "", end_date: "", total_days: 1, reason: "" }); fetchRequests(); }
      else { const err = await res.json(); toast.error(err.error || "Gagal"); }
    } catch { toast.error("Gagal menghantar permohonan cuti"); }
  };

  // === Approval ===
  const handleApproval = async (action: string) => {
    if (!approvalTarget) return;
    try {
      const res = await fetch("/api/hr/leave", { method: "POST", headers: getHeaders(), body: JSON.stringify({ action, request_id: approvalTarget.id, note: approvalNote }) });
      if (res.ok) { toast.success(action.includes("approve") ? "Diluluskan" : "Ditolak"); setApprovalOpen(false); setApprovalNote(""); fetchPending(); fetchRequests(); }
      else { const err = await res.json(); toast.error(err.error || "Gagal"); }
    } catch { toast.error("Gagal memproses kelulusan"); }
  };

  // === Cancel ===
  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/leave?id=${id}`, { method: "DELETE", headers: getAuthHeader() });
      if (res.ok) { toast.success("Permohonan dibatalkan"); fetchRequests(); }
    } catch { toast.error("Gagal membatalkan"); }
  };

  // === Save Leave Type ===
  const handleSaveType = async () => {
    if (!typeForm.id || !typeForm.label || !typeForm.short_code) { toast.error("ID, label dan short code diperlukan"); return; }
    try {
      const res = await fetch("/api/hr/leave-types", { method: "POST", headers: getHeaders(), body: JSON.stringify(typeForm) });
      if (res.ok) { toast.success(isNewType ? "Jenis cuti ditambah" : "Jenis cuti dikemaskini"); setTypeDialogOpen(false); fetchLeaveTypes(); }
      else { const err = await res.json(); toast.error(err.error || "Gagal"); }
    } catch { toast.error("Gagal menyimpan jenis cuti"); }
  };

  // === Delete Leave Type ===
  const handleDeleteType = async (id: string) => {
    if (!confirm("Padam jenis cuti ini?")) return;
    try {
      const res = await fetch(`/api/hr/leave-types?id=${id}`, { method: "DELETE", headers: getAuthHeader() });
      if (res.ok) { toast.success("Jenis cuti dipadam"); fetchLeaveTypes(); }
      else { const err = await res.json(); toast.error(err.error || "Gagal"); }
    } catch { toast.error("Gagal memadam"); }
  };

  // === Save Staff Entitlement ===
  const handleSaveEntitlement = async () => {
    if (!entForm.staff_id || !entForm.leave_type_id) { toast.error("Sila pilih staff dan jenis cuti"); return; }
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ action: "set_entitlement", staff_id: entForm.staff_id, leave_type_id: entForm.leave_type_id, year: entForm.year, total_days: entForm.total_days }),
      });
      if (res.ok) { toast.success("Entitlemen cuti disimpan"); setEntDialogOpen(false); fetchAllEntitlements(); fetchEntitlements(); }
      else { const err = await res.json(); toast.error(err.error || "Gagal"); }
    } catch { toast.error("Gagal menyimpan entitlemen"); }
  };

  const openEditType = (lt: LeaveType) => { setTypeForm({ ...lt }); setIsNewType(false); setTypeDialogOpen(true); };
  const openNewType = () => {
    setTypeForm({ id: "", label: "", short_code: "", default_days: 0, is_paid: true, requires_doc: false, color: "#3b82f6", is_active: true, sort_order: leaveTypes.length + 1 });
    setIsNewType(true);
    setTypeDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
      case "layer1_approved": return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><CheckCircle2 className="w-3 h-3 mr-1" />Layer 1 OK</Badge>;
      case "approved": return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Diluluskan</Badge>;
      case "rejected": return <Badge variant="secondary" className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((r) => !search || (r.staff_name || "").toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { id: "requests" as TabView, label: "Permohonan Cuti", icon: FileText },
    ...(isHR ? [{ id: "pending" as TabView, label: `Kelulusan (${pendingRequests.length})`, icon: Clock }] : []),
    { id: "entitlements" as TabView, label: "Baki Cuti", icon: Calendar },
    ...(isHR ? [
      { id: "staff-entitlements" as TabView, label: "Entitlemen Staff", icon: Users },
      { id: "types" as TabView, label: "Jenis Cuti", icon: Settings2 },
    ] : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarOff className="w-6 h-6 text-blue-500" /> Pengurusan Cuti</h2>
          <p className="text-muted-foreground">Mohon cuti, semak baki, dan proses kelulusan</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setApplyOpen(true)}>
          <Plus className="w-4 h-4" /> Mohon Cuti
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-100">
          <CardHeader className="pb-2"><CardDescription className="text-amber-600 font-medium">Menunggu</CardDescription>
            <CardTitle className="text-2xl font-bold">{requests.filter((r) => r.status === "pending" || r.status === "layer1_approved").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-100">
          <CardHeader className="pb-2"><CardDescription className="text-green-600 font-medium">Diluluskan</CardDescription>
            <CardTitle className="text-2xl font-bold">{requests.filter((r) => r.status === "approved").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-100">
          <CardHeader className="pb-2"><CardDescription className="text-red-600 font-medium">Ditolak</CardDescription>
            <CardTitle className="text-2xl font-bold">{requests.filter((r) => r.status === "rejected").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
          <CardHeader className="pb-2"><CardDescription className="text-blue-600 font-medium">Jumlah</CardDescription>
            <CardTitle className="text-2xl font-bold">{requests.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${tab === t.id ? "bg-white dark:bg-slate-800 border border-b-white dark:border-b-slate-800 text-blue-600 -mb-[1px]" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* TAB: Leave Requests */}
      {tab === "requests" && (
        <div className="space-y-4">
          {isHR && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          )}
          {loading ? <div className="text-center py-10 text-muted-foreground">Memuatkan...</div>
          : filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <CalendarOff className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">Tiada permohonan cuti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const lt = getLeaveType(req.leave_type_id);
                return (
                  <Card key={req.id}>
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: lt?.color || "#6b7280" }}>{lt?.short_code || "?"}</div>
                        <div>
                          <p className="font-semibold">{req.staff_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{lt?.label || req.leave_type_id} &middot; {req.total_days} hari</p>
                          <p className="text-xs text-muted-foreground">{new Date(req.start_date).toLocaleDateString("ms-MY")} — {new Date(req.end_date).toLocaleDateString("ms-MY")}</p>
                          {req.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{req.reason}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(req.status)}
                        {req.status === "pending" && req.staff_id === user?.id && (
                          <Button size="sm" variant="destructive" onClick={() => handleCancel(req.id)}>Batal</Button>
                        )}
                      </div>
                    </div>
                    {(req.layer1_approver_name || req.layer2_approver_name) && (
                      <div className="border-t px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-muted-foreground space-y-1">
                        {req.layer1_approver_name && <p>Layer 1: {req.layer1_approver_name} {req.layer1_note ? `— "${req.layer1_note}"` : ""}</p>}
                        {req.layer2_approver_name && <p>Layer 2: {req.layer2_approver_name} {req.layer2_note ? `— "${req.layer2_note}"` : ""}</p>}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Pending Approval */}
      {tab === "pending" && isHR && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-300 mb-2" />
              <p className="text-muted-foreground">Tiada permohonan menunggu kelulusan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const lt = getLeaveType(req.leave_type_id);
                const isLayer1 = req.status === "pending";
                return (
                  <Card key={req.id}>
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: lt?.color || "#6b7280" }}>{lt?.short_code || "?"}</div>
                        <div>
                          <p className="font-semibold">{req.staff_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{lt?.label} &middot; {req.total_days} hari &middot; {new Date(req.start_date).toLocaleDateString("ms-MY")} — {new Date(req.end_date).toLocaleDateString("ms-MY")}</p>
                          {req.reason && <p className="text-xs text-muted-foreground italic">"{req.reason}"</p>}
                          <Badge variant="outline" className="mt-1 text-xs">{isLayer1 ? "Menunggu Layer 1" : "Menunggu Layer 2"}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setApprovalTarget(req); setApprovalAction(isLayer1 ? "approve_l1" : "approve_l2"); setApprovalOpen(true); }}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Lulus
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setApprovalTarget(req); setApprovalAction(isLayer1 ? "reject_l1" : "reject_l2"); setApprovalOpen(true); }}>
                          <XCircle className="w-4 h-4 mr-1" /> Tolak
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: My Entitlements */}
      {tab === "entitlements" && (
        <div className="space-y-4">
          {entitlements.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">Tiada entitlemen cuti ditetapkan untuk tahun ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entitlements.map((ent) => {
                const lt = getLeaveType(ent.leave_type_id);
                const remaining = ent.total_days - Number(ent.used_days);
                const pct = ent.total_days > 0 ? (Number(ent.used_days) / ent.total_days) * 100 : 0;
                return (
                  <Card key={ent.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: lt?.color || "#6b7280" }}>{lt?.short_code || "?"}</div>
                        <div>
                          <p className="font-semibold text-sm">{lt?.label || ent.leave_type_id}</p>
                          <p className="text-xs text-muted-foreground">{ent.year}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Digunakan</span><span className="font-medium">{ent.used_days} / {ent.total_days} hari</span></div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : lt?.color || "#3b82f6" }} />
                        </div>
                        <p className={`text-sm font-bold ${remaining <= 0 ? "text-red-500" : "text-emerald-600"}`}>Baki: {remaining} hari</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Staff Entitlements (HR personalize per staff) */}
      {tab === "staff-entitlements" && isHR && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tetapkan jumlah hari cuti khusus untuk setiap staff. Staff lama boleh diberi lebih hari.</p>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => { setEntForm({ staff_id: "", leave_type_id: "", year: new Date().getFullYear(), total_days: 0 }); setEntDialogOpen(true); }}>
              <Plus className="w-4 h-4" /> Tetapkan Entitlemen
            </Button>
          </div>

          {allEntitlements.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">Tiada entitlemen ditetapkan. Klik butang di atas untuk mula menetapkan cuti staff.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                    <th className="text-left p-3 font-semibold">Staff</th>
                    <th className="text-left p-3 font-semibold">Jenis Cuti</th>
                    <th className="text-center p-3 font-semibold">Tahun</th>
                    <th className="text-center p-3 font-semibold">Jumlah Hari</th>
                    <th className="text-center p-3 font-semibold">Digunakan</th>
                    <th className="text-center p-3 font-semibold">Baki</th>
                    <th className="text-right p-3 font-semibold">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntitlements.map((ent) => {
                    const lt = getLeaveType(ent.leave_type_id);
                    const remaining = ent.total_days - Number(ent.used_days);
                    return (
                      <tr key={ent.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium">{getStaffName(ent.staff_id)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lt?.color }} />
                            {lt?.label || ent.leave_type_id}
                          </div>
                        </td>
                        <td className="p-3 text-center">{ent.year}</td>
                        <td className="p-3 text-center font-bold">{ent.total_days}</td>
                        <td className="p-3 text-center">{ent.used_days}</td>
                        <td className="p-3 text-center">
                          <span className={remaining <= 0 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>{remaining}</span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => { setEntForm({ staff_id: ent.staff_id, leave_type_id: ent.leave_type_id, year: ent.year, total_days: ent.total_days }); setEntDialogOpen(true); }}>Edit</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Leave Types (HR edit/delete) */}
      {tab === "types" && isHR && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Senarai jenis cuti. Klik Edit untuk tukar tetapan.</p>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={openNewType}>
              <Plus className="w-4 h-4" /> Tambah Jenis Cuti
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                  <th className="text-left p-3 font-semibold">Jenis Cuti</th>
                  <th className="text-center p-3 font-semibold">Kod</th>
                  <th className="text-center p-3 font-semibold">Hari Default</th>
                  <th className="text-center p-3 font-semibold">Bergaji</th>
                  <th className="text-center p-3 font-semibold">Perlu Dokumen</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  <th className="text-right p-3 font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} /><span className="font-medium">{lt.label}</span></div>
                    </td>
                    <td className="p-3 text-center"><Badge variant="outline">{lt.short_code}</Badge></td>
                    <td className="p-3 text-center">{lt.default_days}</td>
                    <td className="p-3 text-center"><Badge variant="secondary" className={lt.is_paid ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>{lt.is_paid ? "Ya" : "Tidak"}</Badge></td>
                    <td className="p-3 text-center"><Badge variant="secondary" className={lt.requires_doc ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}>{lt.requires_doc ? "Ya" : "Tidak"}</Badge></td>
                    <td className="p-3 text-center"><Badge variant="secondary" className={lt.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}>{lt.is_active ? "Aktif" : "Tidak Aktif"}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEditType(lt)}><Edit3 className="w-3 h-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteType(lt.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === DIALOGS === */}

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Permohonan Cuti Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Jenis Cuti</Label>
              <Select value={applyForm.leave_type_id} onValueChange={(v) => setApplyForm({ ...applyForm, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis cuti" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.filter((t) => t.is_active).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.label} ({t.short_code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tarikh Mula</Label><Input type="date" value={applyForm.start_date} onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tarikh Akhir</Label><Input type="date" value={applyForm.end_date} onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Hari (auto-kira hari bekerja)</Label>
              <Input type="number" value={applyForm.total_days} onChange={(e) => setApplyForm({ ...applyForm, total_days: parseFloat(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2">
              <Label>Sebab</Label>
              <Textarea value={applyForm.reason} onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })} placeholder="Nyatakan sebab cuti..." rows={3} />
            </div>
            {getLeaveType(applyForm.leave_type_id)?.requires_doc && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
                <Upload className="w-4 h-4" />Jenis cuti ini memerlukan dokumen sokongan (cth: sijil MC).
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Batal</Button>
            <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">Hantar Permohonan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{approvalAction.includes("approve") ? "Luluskan" : "Tolak"} Permohonan Cuti</DialogTitle></DialogHeader>
          {approvalTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="font-medium">Staff:</span> {approvalTarget.staff_name}</p>
                <p><span className="font-medium">Jenis:</span> {getLeaveType(approvalTarget.leave_type_id)?.label}</p>
                <p><span className="font-medium">Tempoh:</span> {approvalTarget.start_date} — {approvalTarget.end_date} ({approvalTarget.total_days} hari)</p>
                {approvalTarget.reason && <p><span className="font-medium">Sebab:</span> {approvalTarget.reason}</p>}
              </div>
              <div className="space-y-2">
                <Label>Catatan (optional)</Label>
                <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Tambah catatan..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>Batal</Button>
            <Button onClick={() => handleApproval(approvalAction)} className={approvalAction.includes("approve") ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>{approvalAction.includes("approve") ? "Luluskan" : "Tolak"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Type Edit Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNewType ? "Tambah" : "Edit"} Jenis Cuti</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID (slug)</Label>
                <Input value={typeForm.id} onChange={(e) => setTypeForm({ ...typeForm, id: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="cth: al" disabled={!isNewType} />
              </div>
              <div className="space-y-2">
                <Label>Short Code</Label>
                <Input value={typeForm.short_code} onChange={(e) => setTypeForm({ ...typeForm, short_code: e.target.value.toUpperCase() })} placeholder="cth: AL" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Cuti</Label>
              <Input value={typeForm.label} onChange={(e) => setTypeForm({ ...typeForm, label: e.target.value })} placeholder="cth: Annual Leave" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hari Default</Label>
                <Input type="text" inputMode="numeric" value={typeForm.default_days === 0 ? "" : typeForm.default_days} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setTypeForm({ ...typeForm, default_days: val === "" ? 0 : parseInt(val) }); }} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setTypeForm({ ...typeForm, color: c })} className={`w-6 h-6 rounded-full border-2 ${typeForm.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={typeForm.is_paid} onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.checked })} className="rounded" />
                Bergaji
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={typeForm.requires_doc} onChange={(e) => setTypeForm({ ...typeForm, requires_doc: e.target.checked })} className="rounded" />
                Perlu Dokumen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={typeForm.is_active} onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })} className="rounded" />
                Aktif
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveType} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-1" />Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Entitlement Dialog */}
      <Dialog open={entDialogOpen} onOpenChange={setEntDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tetapkan Entitlemen Cuti Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Staff</Label>
              <StaffPicker staffList={staffList} value={entForm.staff_id} onChange={(id) => setEntForm({ ...entForm, staff_id: id })} />
            </div>
            <div className="space-y-2">
              <Label>Jenis Cuti</Label>
              <Select value={entForm.leave_type_id} onValueChange={(v) => setEntForm({ ...entForm, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis cuti" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.label} (default: {t.default_days} hari)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input type="text" inputMode="numeric" value={entForm.year} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setEntForm({ ...entForm, year: val === "" ? new Date().getFullYear() : parseInt(val) }); }} />
              </div>
              <div className="space-y-2">
                <Label>Jumlah Hari</Label>
                <Input type="text" inputMode="numeric" value={entForm.total_days === 0 ? "" : entForm.total_days} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setEntForm({ ...entForm, total_days: val === "" ? 0 : parseInt(val) }); }} placeholder="0" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Tetapkan jumlah hari cuti khusus untuk staff ini. Ini akan override nilai default.
              Contoh: Staff lama boleh diberi 18 hari AL berbanding default 14 hari.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveEntitlement} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-1" />Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
