"use client";

import { useState, useEffect, useRef } from "react";
import {
  Clock, MapPin, Camera, CheckCircle2, History,
  RefreshCw, Download, Users, Pencil, Trash2, X, Check,
  Calendar, Plus, Building2, MapPinned, Timer, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchAuth, fetchJsonAuth } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";

interface AttendanceLog {
  id: string;
  staff_id: string;
  staff_name: string;
  type: "in" | "out";
  timestamp: string;
  selfie_url: string;
  location_status: string;
  status: string;
  note: string;
  branch_name?: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
  created_at: string;
}

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

const STATUS_LABELS: Record<string, string> = {
  'on_time': 'Tepat Masa',
  'On-time': 'Tepat Masa',
  'late': 'Lewat',
  'early_leave': 'Balik Awal',
  'outside_geofence': 'Luar Kawasan',
  'out_of_range': 'Luar Kawasan'
};

interface WorkSchedule {
  id: string;
  name: string;
  schedule_type: "branch" | "individual";
  branch_id?: string;
  staff_id?: string;
  staff_name?: string;
  work_start: string;
  work_end: string;
  late_tolerance: number;
  work_days: number[];
  is_active: boolean;
  created_at: string;
}

const DAY_LABELS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];

const emptyBranch = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius: "200",
};

const emptySchedule = {
  name: "",
  schedule_type: "branch" as const,
  branch_id: "",
  staff_id: "",
  staff_name: "",
  work_start: "09:00",
  work_end: "18:00",
  late_tolerance: "15",
  work_days: [1, 2, 3, 4, 5] as number[],
};

export function AttendanceContent() {
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState("clock");

  // Date filters
  const [histStartDate, setHistStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [histEndDate, setHistEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [allStartDate, setAllStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [allEndDate, setAllEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Edit & Delete
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editBranchForm, setEditBranchForm] = useState(emptyBranch);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchSetupSql, setBranchSetupSql] = useState("");

  // Schedules
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [schedForm, setSchedForm] = useState(emptySchedule);
  const [isAddSchedOpen, setIsAddSchedOpen] = useState(false);
  const [editSched, setEditSched] = useState<WorkSchedule | null>(null);
  const [editSchedForm, setEditSchedForm] = useState(emptySchedule);
  const [deleteSched, setDeleteSched] = useState<WorkSchedule | null>(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedSetupSql, setSchedSetupSql] = useState("");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canViewAllStaff = user?.role && HR_ROLES.includes(user.role);

  useEffect(() => {
    fetchTodayLogs();
    requestLocation();
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistoryLogs();
    else if (activeTab === "all" && canViewAllStaff) fetchAllStaffLogs();
    else if (activeTab === "branches" && canViewAllStaff) fetchBranches();
    else if (activeTab === "schedules" && canViewAllStaff) { fetchSchedules(); fetchBranches(); fetchStaffList(); }
  }, [activeTab]);

  // ── FETCH FUNCTIONS ──

  const fetchTodayLogs = async () => {
    try {
      const res = await fetchAuth(`/api/hr/attendance?staff_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchHistoryLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(
        `/api/hr/attendance?staff_id=${user?.id}&start_date=${histStartDate}&end_date=${histEndDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAllStaffLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(
        `/api/hr/attendance?all=true&start_date=${allStartDate}&end_date=${allEndDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setAllLogs(data.logs || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchBranches = async () => {
    setBranchLoading(true);
    try {
      const res = await fetchAuth("/api/hr/branches");
      const data = await res.json();
      if (data.needsSetup) {
        setBranchSetupSql(`CREATE TABLE IF NOT EXISTS hr_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  radius INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
      }
      setBranches(data.branches || []);
    } catch (err) { console.error(err); setBranches([]); }
    finally { setBranchLoading(false); }
  };

  // ── LOCATION ──

  // ── SCHEDULES ──

  const fetchSchedules = async () => {
    setSchedLoading(true);
    try {
      const res = await fetchAuth("/api/hr/schedules");
      const data = await res.json();
      if (data.needsSetup) { setSchedSetupSql(data.setupSql || ""); }
      setSchedules(data.schedules || []);
    } catch { setSchedules([]); }
    finally { setSchedLoading(false); }
  };

  const fetchStaffList = async () => {
    try {
      const res = await fetchAuth("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList((data.staff || []).map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch {}
  };

  const handleAddSchedule = async () => {
    if (!schedForm.name.trim()) { toast.error("Nama jadual wajib diisi"); return; }
    setSchedLoading(true);
    try {
      const payload: any = {
        name: schedForm.name,
        schedule_type: schedForm.schedule_type,
        work_start: schedForm.work_start,
        work_end: schedForm.work_end,
        late_tolerance: parseInt(schedForm.late_tolerance) || 15,
        work_days: schedForm.work_days,
      };
      if (schedForm.schedule_type === "branch" && schedForm.branch_id && schedForm.branch_id !== "all") payload.branch_id = schedForm.branch_id;
      if (schedForm.schedule_type === "individual" && schedForm.staff_id) {
        payload.staff_id = schedForm.staff_id;
        payload.staff_name = schedForm.staff_name;
      }
      const res = await fetchJsonAuth("/api/hr/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Jadual waktu kerja berjaya ditambah!");
        setIsAddSchedOpen(false); setSchedForm(emptySchedule); fetchSchedules();
      } else {
        if (data.setupSql) setSchedSetupSql(data.setupSql);
        toast.error(data.error || "Gagal tambah jadual");
      }
    } catch { toast.error("Ralat sambungan"); }
    finally { setSchedLoading(false); }
  };

  const handleEditSchedule = async () => {
    if (!editSched) return;
    setSchedLoading(true);
    try {
      const payload: any = {
        id: editSched.id,
        name: editSchedForm.name,
        schedule_type: editSchedForm.schedule_type,
        work_start: editSchedForm.work_start,
        work_end: editSchedForm.work_end,
        late_tolerance: parseInt(editSchedForm.late_tolerance) || 15,
        work_days: editSchedForm.work_days,
      };
      if (editSchedForm.schedule_type === "branch") payload.branch_id = editSchedForm.branch_id || null;
      if (editSchedForm.schedule_type === "individual") {
        payload.staff_id = editSchedForm.staff_id;
        payload.staff_name = editSchedForm.staff_name;
      }
      const res = await fetchJsonAuth("/api/hr/schedules", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Jadual berjaya dikemaskini!"); setEditSched(null); fetchSchedules();
      } else {
        const data = await res.json(); toast.error(data.error || "Gagal kemaskini");
      }
    } catch { toast.error("Ralat sambungan"); }
    finally { setSchedLoading(false); }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteSched) return;
    setSchedLoading(true);
    try {
      const res = await fetchAuth(`/api/hr/schedules?id=${deleteSched.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Jadual berjaya dipadam"); setDeleteSched(null); fetchSchedules(); }
      else { const d = await res.json(); toast.error(d.error || "Gagal padam"); }
    } catch { toast.error("Ralat sambungan"); }
    finally { setSchedLoading(false); }
  };

  const toggleDay = (days: number[], day: number) =>
    days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();

  // ── LOCATION ──

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocError("Geolocation tidak disokong"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocError(null);
      },
      () => { setLocError("Gagal mendapatkan lokasi. Sila aktifkan GPS."); },
      { enableHighAccuracy: true }
    );
  };

  // ── CAMERA ──

  const startCamera = async () => {
    // Check if mediaDevices available (requires HTTPS on mobile)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Kamera tidak disokong. Pastikan anda menggunakan HTTPS.");
      return;
    }

    setCapturing(true);
    try {
      let stream: MediaStream;
      try {
        // Try front camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch {
        // Fallback: any available camera (some mobile devices need this)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("muted", "");
        videoRef.current.setAttribute("playsinline", "");
        // Force play on mobile (some browsers need explicit play call)
        try { await videoRef.current.play(); } catch {}
      }
    } catch (err: any) {
      setCapturing(false);
      if (err?.name === "NotAllowedError") {
        toast.error("Kebenaran kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar.");
      } else if (err?.name === "NotFoundError") {
        toast.error("Tiada kamera ditemui pada peranti ini.");
      } else if (err?.name === "NotReadableError") {
        toast.error("Kamera sedang digunakan oleh aplikasi lain. Sila tutup dan cuba semula.");
      } else {
        toast.error("Gagal akses kamera. Pastikan pelayar mempunyai kebenaran kamera.");
      }
      console.error("Camera error:", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      setSelfie(canvas.toDataURL("image/jpeg"));
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCapturing(false);
    }
  };

  // ── CLOCK IN/OUT ──

  const handleClockAction = async (type: "in" | "out") => {
    if (!selfie) { toast.error("Wajib ambil selfie dahulu"); return; }
    if (!location) { toast.error("Wajib aktifkan lokasi"); requestLocation(); return; }

    setLoading(true);
    try {
      const res = await fetchJsonAuth("/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({
          staff_id: user?.id, staff_name: user?.name, type,
          selfie_url: selfie, latitude: location.lat, longitude: location.lng,
          accuracy: location.accuracy, note
        })
      });

      if (res.ok) {
        toast.success(`Berjaya Clock ${type.toUpperCase()}!`);
        setSelfie(null); setNote("");
        fetchTodayLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal merekod kehadiran");
      }
    } catch { toast.error("Ralat sistem"); }
    finally { setLoading(false); }
  };

  // ── EDIT/DELETE LOG ──

  const handleEdit = async () => {
    if (!editingLog) return;
    setLoading(true);
    try {
      const res = await fetchJsonAuth("/api/hr/attendance", {
        method: "PATCH",
        body: JSON.stringify({
          id: editingLog.id, type: editingLog.type,
          status: editingLog.status, timestamp: editingLog.timestamp, note: editingLog.note
        })
      });
      if (res.ok) {
        toast.success("Rekod berjaya dikemaskini");
        setEditingLog(null);
        fetchAllStaffLogs(); fetchTodayLogs(); fetchHistoryLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal kemaskini");
      }
    } catch { toast.error("Ralat sistem"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchAuth(`/api/hr/attendance?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rekod berjaya dipadam");
        setDeletingId(null);
        // Refresh ALL views so deleted record disappears everywhere
        fetchTodayLogs();
        fetchHistoryLogs();
        fetchAllStaffLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal padam");
      }
    } catch { toast.error("Ralat sistem"); }
    finally { setLoading(false); }
  };

  // ── BRANCH CRUD ──

  const handleAddBranch = async () => {
    if (!branchForm.name.trim()) { toast.error("Nama cawangan wajib diisi"); return; }
    setBranchLoading(true);
    try {
      const res = await fetchJsonAuth("/api/hr/branches", {
        method: "POST",
        body: JSON.stringify({
          name: branchForm.name,
          address: branchForm.address,
          latitude: parseFloat(branchForm.latitude) || 0,
          longitude: parseFloat(branchForm.longitude) || 0,
          radius: parseInt(branchForm.radius) || 200,
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cawangan berjaya ditambah!");
        setIsAddBranchOpen(false); setBranchForm(emptyBranch);
        fetchBranches();
      } else {
        if (data.setupSql) setBranchSetupSql(data.setupSql);
        toast.error(data.error || "Gagal tambah cawangan");
      }
    } catch { toast.error("Ralat sambungan"); }
    finally { setBranchLoading(false); }
  };

  const handleEditBranch = async () => {
    if (!editBranch) return;
    setBranchLoading(true);
    try {
      const res = await fetchJsonAuth("/api/hr/branches", {
        method: "PATCH",
        body: JSON.stringify({
          id: editBranch.id,
          name: editBranchForm.name,
          address: editBranchForm.address,
          latitude: parseFloat(editBranchForm.latitude) || 0,
          longitude: parseFloat(editBranchForm.longitude) || 0,
          radius: parseInt(editBranchForm.radius) || 200,
        })
      });
      if (res.ok) {
        toast.success("Cawangan berjaya dikemaskini!");
        setEditBranch(null); fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal kemaskini");
      }
    } catch { toast.error("Ralat sambungan"); }
    finally { setBranchLoading(false); }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranch) return;
    setBranchLoading(true);
    try {
      const res = await fetchAuth(`/api/hr/branches?id=${deleteBranch.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Cawangan berjaya dipadam");
        setDeleteBranch(null); fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal padam");
      }
    } catch { toast.error("Ralat sambungan"); }
    finally { setBranchLoading(false); }
  };

  const handleUseMyLocation = (setter: (v: typeof emptyBranch) => void, form: typeof emptyBranch) => {
    if (location) {
      setter({ ...form, latitude: location.lat.toString(), longitude: location.lng.toString() });
      toast.success("Koordinat semasa digunakan");
    } else {
      toast.error("Lokasi tidak tersedia. Sila aktifkan GPS.");
      requestLocation();
    }
  };

  // ── RENDER HELPERS ──

  const renderLogCard = (log: AttendanceLog, showActions = false) => (
    <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-all">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
        log.type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
      )}>
        {log.type === "in" ? "IN" : "OUT"}
      </div>
      <div className="flex-1 min-w-0">
        {showActions && <p className="font-medium text-sm truncate">{log.staff_name}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">
            {new Date(log.timestamp).toLocaleString("ms-MY", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur"
            })}
          </p>
          <Badge variant={["ok", "OK", "within_range"].includes(log.location_status) ? "outline" : "destructive"} className="text-[10px] h-5">
            {["ok", "OK", "within_range"].includes(log.location_status) ? "dalam kawasan" : "luar kawasan"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{STATUS_LABELS[log.status] || log.status}</p>
        {log.branch_name && <p className="text-[10px] text-indigo-600 mt-0.5">{log.branch_name}</p>}
        {log.note && <p className="text-[10px] italic mt-0.5 text-slate-500 truncate">"{log.note}"</p>}
      </div>
      {log.selfie_url && (
        <div className="w-10 h-10 rounded-lg overflow-hidden border shrink-0">
          <img src={log.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
        </div>
      )}
      {showActions && (
        <div className="flex gap-1 shrink-0">
          {deletingId === log.id ? (
            <>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} className="text-red-500 h-8 w-8">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setDeletingId(null)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" onClick={() => setEditingLog(log)} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setDeletingId(log.id)} className="text-red-500 h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const tabCount = canViewAllStaff ? 5 : 2;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-emerald-500" /> Kehadiran Staff
        </h2>
        <p className="text-muted-foreground">Sila clock in/out mengikut waktu kerja</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
          <TabsTrigger value="clock" className="gap-2"><Camera className="w-4 h-4" /> Clock In/Out</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" /> Sejarah Saya</TabsTrigger>
          {canViewAllStaff && <TabsTrigger value="all" className="gap-2"><Users className="w-4 h-4" /> Semua Staff</TabsTrigger>}
          {canViewAllStaff && <TabsTrigger value="branches" className="gap-2"><Building2 className="w-4 h-4" /> Cawangan</TabsTrigger>}
          {canViewAllStaff && <TabsTrigger value="schedules" className="gap-2"><Timer className="w-4 h-4" /> Waktu Kerja</TabsTrigger>}
        </TabsList>

        {/* ══ CLOCK IN/OUT TAB ══ */}
        <TabsContent value="clock" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-emerald-100">
              <CardHeader>
                <CardTitle>Clock In / Out</CardTitle>
                <CardDescription>Keperluan: Selfie + Lokasi GPS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
                  {selfie ? (
                    <img src={selfie} className="w-full h-full object-cover" alt="Selfie" />
                  ) : capturing ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Camera className="w-12 h-12 mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500">Ambil selfie untuk teruskan</p>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {!selfie && !capturing && (
                      <Button onClick={startCamera} className="rounded-full shadow-lg"><Camera className="w-4 h-4 mr-2" /> Buka Kamera</Button>
                    )}
                    {capturing && (
                      <Button onClick={capturePhoto} className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-2" /> Tangkap Gambar</Button>
                    )}
                    {selfie && (
                      <Button variant="secondary" onClick={() => setSelfie(null)} className="rounded-full shadow-lg"><RefreshCw className="w-4 h-4 mr-2" /> Ambil Semula</Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className={cn("w-5 h-5", location ? "text-emerald-500" : "text-rose-500")} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Status Lokasi</p>
                      <p className="text-xs text-muted-foreground">
                        {location
                          ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)} (Ketepatan: ${location.accuracy.toFixed(0)}m)`
                          : locError || "Sedang mencari GPS..."}
                      </p>
                    </div>
                    {!location && (
                      <Button variant="ghost" size="sm" onClick={requestLocation}><RefreshCw className="w-4 h-4" /></Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nota (Pilihan)</Label>
                    <Input placeholder="Contoh: Kerja luar, Site visit, dll" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleClockAction("in")} disabled={loading || !selfie || !location}>
                      CLOCK IN
                    </Button>
                    <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600" onClick={() => handleClockAction("out")} disabled={loading || !selfie || !location}>
                      CLOCK OUT
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Log Hari Ini</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod untuk hari ini</p>
                    </div>
                  ) : logs.map((log) => renderLogCard(log))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ SEJARAH TAB ══ */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Sejarah Kehadiran Saya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Dari Tarikh</Label>
                  <Input type="date" value={histStartDate} onChange={(e) => setHistStartDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hingga Tarikh</Label>
                  <Input type="date" value={histEndDate} onChange={(e) => setHistEndDate(e.target.value)} className="w-40" />
                </div>
                <Button onClick={fetchHistoryLogs} disabled={loading} variant="secondary">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cari"}
                </Button>
              </div>
              <div className="space-y-3 mt-4">
                {loading ? (
                  <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" /></div>
                ) : historyLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Tiada rekod dalam tempoh ini</p>
                  </div>
                ) : historyLogs.map((log) => renderLogCard(log))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ SEMUA STAFF TAB ══ */}
        {canViewAllStaff && (
          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Kehadiran Semua Staff</CardTitle>
                  <CardDescription>Pantau dan uruskan kehadiran semua staff</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2 shrink-0"><Download className="w-4 h-4" /> Export</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Dari Tarikh</Label>
                    <Input type="date" value={allStartDate} onChange={(e) => setAllStartDate(e.target.value)} className="w-40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hingga Tarikh</Label>
                    <Input type="date" value={allEndDate} onChange={(e) => setAllEndDate(e.target.value)} className="w-40" />
                  </div>
                  <Button onClick={fetchAllStaffLogs} disabled={loading} variant="secondary">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cari"}
                  </Button>
                </div>
                <div className="space-y-3 mt-4">
                  {loading ? (
                    <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" /></div>
                  ) : allLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod dalam tempoh ini</p>
                    </div>
                  ) : allLogs.map((log) => renderLogCard(log, true))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ══ CAWANGAN TAB ══ */}
        {canViewAllStaff && (
          <TabsContent value="branches" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Tetapan Cawangan</CardTitle>
                  <CardDescription>Tetapkan lokasi geofencing untuk setiap cawangan</CardDescription>
                </div>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => setIsAddBranchOpen(true)}>
                  <Plus className="w-4 h-4" /> Tambah Cawangan
                </Button>
              </CardHeader>
              <CardContent>
                {branchSetupSql && branches.length === 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                    <p className="font-semibold text-amber-800 text-sm">Jadual database belum dibuat</p>
                    <p className="text-xs text-amber-700 mt-1">Sila jalankan SQL berikut dalam <strong>Supabase SQL Editor</strong>:</p>
                    <pre className="bg-white border rounded p-2 text-xs overflow-auto mt-2">{branchSetupSql}</pre>
                    <Button size="sm" variant="outline" className="mt-2" onClick={fetchBranches}>Cuba Semula</Button>
                  </div>
                )}

                {branchLoading ? (
                  <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" /></div>
                ) : branches.length === 0 && !branchSetupSql ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Tiada cawangan ditambah lagi</p>
                    <p className="text-xs text-slate-400 mt-1">Klik "Tambah Cawangan" untuk mula</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branches.map(b => (
                      <div key={b.id} className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        b.is_active ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm flex items-center gap-1.5">
                              <MapPinned className="w-4 h-4 text-indigo-500" /> {b.name}
                            </h3>
                            {b.address && <p className="text-xs text-slate-500 mt-0.5">{b.address}</p>}
                          </div>
                          <Badge className={b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}>
                            {b.is_active ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-slate-400">Latitud</p>
                            <p className="font-mono font-semibold">{b.latitude?.toFixed(4)}</p>
                          </div>
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-slate-400">Longitud</p>
                            <p className="font-mono font-semibold">{b.longitude?.toFixed(4)}</p>
                          </div>
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-slate-400">Radius</p>
                            <p className="font-mono font-semibold">{b.radius}m</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => {
                            setEditBranch(b);
                            setEditBranchForm({
                              name: b.name, address: b.address || "",
                              latitude: b.latitude?.toString() || "0",
                              longitude: b.longitude?.toString() || "0",
                              radius: b.radius?.toString() || "200"
                            });
                          }}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteBranch(b)}>
                            <Trash2 className="w-3 h-3" /> Padam
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* ══ WAKTU KERJA TAB ══ */}
        {canViewAllStaff && (
          <TabsContent value="schedules" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Timer className="w-5 h-5" /> Tetapan Waktu Kerja</CardTitle>
                  <CardDescription>Tetapkan waktu kerja mengikut cawangan atau individu</CardDescription>
                </div>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => { setIsAddSchedOpen(true); setSchedForm(emptySchedule); }}>
                  <Plus className="w-4 h-4" /> Tambah Jadual
                </Button>
              </CardHeader>
              <CardContent>
                {schedSetupSql && schedules.length === 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                    <p className="font-semibold text-amber-800 text-sm">Jadual database belum dibuat</p>
                    <p className="text-xs text-amber-700 mt-1">Sila jalankan SQL berikut dalam <strong>Supabase SQL Editor</strong>:</p>
                    <pre className="bg-white border rounded p-2 text-xs overflow-auto mt-2 max-h-40">{schedSetupSql}</pre>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={fetchSchedules}>Cuba Semula</Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => { navigator.clipboard.writeText(schedSetupSql); toast.success("SQL disalin!"); }}>Salin SQL</Button>
                    </div>
                  </div>
                )}

                {schedLoading ? (
                  <div className="text-center py-12"><RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" /></div>
                ) : schedules.length === 0 && !schedSetupSql ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
                    <Timer className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Tiada jadual waktu kerja</p>
                    <p className="text-xs text-slate-400 mt-1">Klik "Tambah Jadual" untuk mula</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.map(s => {
                      const branchName = branches.find(b => b.id === s.branch_id)?.name;
                      return (
                        <div key={s.id} className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          s.is_active ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50 opacity-60"
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                                {s.schedule_type === "branch" ? <Building2 className="w-4 h-4 text-indigo-500" /> : <User className="w-4 h-4 text-blue-500" />}
                                {s.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {s.schedule_type === "branch"
                                  ? (branchName ? `Cawangan: ${branchName}` : "Semua cawangan")
                                  : `Staff: ${s.staff_name || s.staff_id || "-"}`}
                              </p>
                            </div>
                            <Badge className={s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}>
                              {s.is_active ? "Aktif" : "Tidak Aktif"}
                            </Badge>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-white rounded p-2 text-center">
                              <p className="text-slate-400">Masuk</p>
                              <p className="font-bold text-emerald-600">{s.work_start?.slice(0,5)}</p>
                            </div>
                            <div className="bg-white rounded p-2 text-center">
                              <p className="text-slate-400">Keluar</p>
                              <p className="font-bold text-blue-600">{s.work_end?.slice(0,5)}</p>
                            </div>
                            <div className="bg-white rounded p-2 text-center">
                              <p className="text-slate-400">Toleransi</p>
                              <p className="font-bold">{s.late_tolerance} min</p>
                            </div>
                          </div>

                          <div className="flex gap-1 mt-2 flex-wrap">
                            {[0,1,2,3,4,5,6].map(d => (
                              <span key={d} className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                (s.work_days || []).includes(d) ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-slate-100 text-slate-400"
                              )}>{DAY_LABELS[d]?.slice(0,3)}</span>
                            ))}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => {
                              setEditSched(s);
                              setEditSchedForm({
                                name: s.name,
                                schedule_type: s.schedule_type,
                                branch_id: s.branch_id || "",
                                staff_id: s.staff_id || "",
                                staff_name: s.staff_name || "",
                                work_start: s.work_start?.slice(0,5) || "09:00",
                                work_end: s.work_end?.slice(0,5) || "18:00",
                                late_tolerance: String(s.late_tolerance || 15),
                                work_days: s.work_days || [1,2,3,4,5],
                              });
                            }}>
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 hover:bg-red-50"
                              onClick={() => setDeleteSched(s)}>
                              <Trash2 className="w-3 h-3" /> Padam
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ══ ADD BRANCH DIALOG ══ */}
      <Dialog open={isAddBranchOpen} onOpenChange={o => { setIsAddBranchOpen(o); if (!o) setBranchForm(emptyBranch); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Cawangan Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nama Cawangan <span className="text-red-500">*</span></Label>
              <Input placeholder="Cth: HQ Kuala Lumpur" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Alamat</Label>
              <Input placeholder="Cth: No. 1, Jalan ABC..." value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Latitud</Label>
                <Input placeholder="3.1390" value={branchForm.latitude} onChange={e => setBranchForm({ ...branchForm, latitude: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Longitud</Label>
                <Input placeholder="101.6869" value={branchForm.longitude} onChange={e => setBranchForm({ ...branchForm, longitude: e.target.value })} />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleUseMyLocation(setBranchForm, branchForm)}>
              <MapPin className="w-3 h-3" /> Guna Lokasi Semasa Saya
            </Button>
            <div className="space-y-1">
              <Label>Radius Geofence (meter)</Label>
              <Input type="number" placeholder="200" value={branchForm.radius} onChange={e => setBranchForm({ ...branchForm, radius: e.target.value })} />
              <p className="text-[10px] text-slate-400">Jarak maksimum dari titik cawangan yang diterima untuk clock in</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBranchOpen(false)}>Batal</Button>
            <Button onClick={handleAddBranch} disabled={branchLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {branchLoading ? "Menyimpan..." : "Tambah Cawangan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ EDIT BRANCH DIALOG ══ */}
      <Dialog open={!!editBranch} onOpenChange={o => { if (!o) setEditBranch(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Cawangan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nama Cawangan <span className="text-red-500">*</span></Label>
              <Input value={editBranchForm.name} onChange={e => setEditBranchForm({ ...editBranchForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Alamat</Label>
              <Input value={editBranchForm.address} onChange={e => setEditBranchForm({ ...editBranchForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Latitud</Label>
                <Input value={editBranchForm.latitude} onChange={e => setEditBranchForm({ ...editBranchForm, latitude: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Longitud</Label>
                <Input value={editBranchForm.longitude} onChange={e => setEditBranchForm({ ...editBranchForm, longitude: e.target.value })} />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleUseMyLocation(setEditBranchForm, editBranchForm)}>
              <MapPin className="w-3 h-3" /> Guna Lokasi Semasa Saya
            </Button>
            <div className="space-y-1">
              <Label>Radius Geofence (meter)</Label>
              <Input type="number" value={editBranchForm.radius} onChange={e => setEditBranchForm({ ...editBranchForm, radius: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)}>Batal</Button>
            <Button onClick={handleEditBranch} disabled={branchLoading} className="bg-blue-600 hover:bg-blue-700">
              {branchLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DELETE BRANCH DIALOG ══ */}
      <Dialog open={!!deleteBranch} onOpenChange={o => { if (!o) setDeleteBranch(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Padam Cawangan</DialogTitle></DialogHeader>
          <p className="text-sm">Adakah anda pasti ingin memadam cawangan <strong>{deleteBranch?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBranch(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteBranch} disabled={branchLoading}>
              {branchLoading ? "Memadamkan..." : "Ya, Padam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ EDIT LOG DIALOG ══ */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> Edit Rekod</CardTitle>
              <CardDescription>{editingLog.staff_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tarikh & Masa</Label>
                <Input type="datetime-local" value={editingLog.timestamp.slice(0, 16)}
                  onChange={(e) => setEditingLog({ ...editingLog, timestamp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={editingLog.type} onValueChange={(v) => setEditingLog({ ...editingLog, type: v as "in" | "out" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Clock In</SelectItem>
                    <SelectItem value="out">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingLog.status} onValueChange={(v) => setEditingLog({ ...editingLog, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_time">Tepat Masa</SelectItem>
                    <SelectItem value="late">Lewat</SelectItem>
                    <SelectItem value="early_leave">Balik Awal</SelectItem>
                    <SelectItem value="outside_geofence">Luar Kawasan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nota</Label>
                <Input value={editingLog.note || ""} onChange={(e) => setEditingLog({ ...editingLog, note: e.target.value })} placeholder="Tambah nota..." />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleEdit} disabled={loading} className="flex-1">Simpan</Button>
                <Button variant="outline" onClick={() => setEditingLog(null)} className="flex-1">Batal</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ ADD SCHEDULE DIALOG ══ */}
      <Dialog open={isAddSchedOpen} onOpenChange={o => { setIsAddSchedOpen(o); if (!o) setSchedForm(emptySchedule); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Jadual Waktu Kerja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nama Jadual <span className="text-red-500">*</span></Label>
              <Input placeholder="Cth: Waktu Kerja HQ" value={schedForm.name} onChange={e => setSchedForm({ ...schedForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={schedForm.schedule_type} onValueChange={v => setSchedForm({ ...schedForm, schedule_type: v as "branch" | "individual", branch_id: "", staff_id: "", staff_name: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Cawangan</SelectItem>
                  <SelectItem value="individual">Individu (Staff)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {schedForm.schedule_type === "branch" && (
              <div className="space-y-1">
                <Label>Cawangan</Label>
                <Select value={schedForm.branch_id} onValueChange={v => setSchedForm({ ...schedForm, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Semua cawangan (default)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cawangan</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {schedForm.schedule_type === "individual" && (
              <div className="space-y-1">
                <Label>Staff</Label>
                <Select value={schedForm.staff_id} onValueChange={v => {
                  const staff = staffList.find(s => s.id === v);
                  setSchedForm({ ...schedForm, staff_id: v, staff_name: staff?.name || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Pilih staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Waktu Masuk</Label>
                <Input type="time" value={schedForm.work_start} onChange={e => setSchedForm({ ...schedForm, work_start: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Waktu Keluar</Label>
                <Input type="time" value={schedForm.work_end} onChange={e => setSchedForm({ ...schedForm, work_end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Toleransi Lewat (minit)</Label>
              <Input type="number" value={schedForm.late_tolerance} onChange={e => setSchedForm({ ...schedForm, late_tolerance: e.target.value })} />
              <p className="text-[10px] text-slate-400">Tempoh masa selepas waktu masuk sebelum dikira lewat</p>
            </div>
            <div className="space-y-1">
              <Label>Hari Bekerja</Label>
              <div className="flex gap-1 flex-wrap">
                {DAY_LABELS.map((label, idx) => (
                  <button key={idx} type="button" onClick={() => setSchedForm({ ...schedForm, work_days: toggleDay(schedForm.work_days, idx) })}
                    className={cn("text-xs px-2.5 py-1.5 rounded-md border transition-all", schedForm.work_days.includes(idx) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSchedOpen(false)}>Batal</Button>
            <Button onClick={handleAddSchedule} disabled={schedLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {schedLoading ? "Menyimpan..." : "Tambah Jadual"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ EDIT SCHEDULE DIALOG ══ */}
      <Dialog open={!!editSched} onOpenChange={o => { if (!o) setEditSched(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Jadual Waktu Kerja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nama Jadual <span className="text-red-500">*</span></Label>
              <Input value={editSchedForm.name} onChange={e => setEditSchedForm({ ...editSchedForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={editSchedForm.schedule_type} onValueChange={v => setEditSchedForm({ ...editSchedForm, schedule_type: v as "branch" | "individual", branch_id: "", staff_id: "", staff_name: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Cawangan</SelectItem>
                  <SelectItem value="individual">Individu (Staff)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editSchedForm.schedule_type === "branch" && (
              <div className="space-y-1">
                <Label>Cawangan</Label>
                <Select value={editSchedForm.branch_id} onValueChange={v => setEditSchedForm({ ...editSchedForm, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Semua cawangan (default)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cawangan</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editSchedForm.schedule_type === "individual" && (
              <div className="space-y-1">
                <Label>Staff</Label>
                <Select value={editSchedForm.staff_id} onValueChange={v => {
                  const staff = staffList.find(s => s.id === v);
                  setEditSchedForm({ ...editSchedForm, staff_id: v, staff_name: staff?.name || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Pilih staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Waktu Masuk</Label>
                <Input type="time" value={editSchedForm.work_start} onChange={e => setEditSchedForm({ ...editSchedForm, work_start: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Waktu Keluar</Label>
                <Input type="time" value={editSchedForm.work_end} onChange={e => setEditSchedForm({ ...editSchedForm, work_end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Toleransi Lewat (minit)</Label>
              <Input type="number" value={editSchedForm.late_tolerance} onChange={e => setEditSchedForm({ ...editSchedForm, late_tolerance: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Hari Bekerja</Label>
              <div className="flex gap-1 flex-wrap">
                {DAY_LABELS.map((label, idx) => (
                  <button key={idx} type="button" onClick={() => setEditSchedForm({ ...editSchedForm, work_days: toggleDay(editSchedForm.work_days, idx) })}
                    className={cn("text-xs px-2.5 py-1.5 rounded-md border transition-all", editSchedForm.work_days.includes(idx) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSched(null)}>Batal</Button>
            <Button onClick={handleEditSchedule} disabled={schedLoading} className="bg-blue-600 hover:bg-blue-700">
              {schedLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DELETE SCHEDULE DIALOG ══ */}
      <Dialog open={!!deleteSched} onOpenChange={o => { if (!o) setDeleteSched(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Padam Jadual Waktu Kerja</DialogTitle></DialogHeader>
          <p className="text-sm">Adakah anda pasti ingin memadam jadual <strong>{deleteSched?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSched(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteSchedule} disabled={schedLoading}>
              {schedLoading ? "Memadamkan..." : "Ya, Padam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
