"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  History,
  Settings as SettingsIcon,
  RefreshCw,
  Download,
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
}

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

const STATUS_LABELS: Record<string, string> = {
  'on_time': 'Tepat Masa',
  'late': 'Lewat',
  'early_leave': 'Balik Awal',
  'outside_geofence': 'Luar Kawasan'
};

const TYPE_LABELS: Record<string, string> = {
  'in': 'Clock In',
  'out': 'Clock Out'
};

export function AttendanceContent() {
  const { user, token, isAdmin, isHR } = useAuth();
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
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canViewAllStaff = user?.role && HR_ROLES.includes(user.role);

  useEffect(() => {
    fetchTodayLogs();
    requestLocation();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryLogs();
    } else if (activeTab === "all" && canViewAllStaff) {
      fetchAllStaffLogs();
    }
  }, [activeTab, startDate, endDate]);

  const fetchTodayLogs = async () => {
    try {
      const res = await fetch(`/api/hr/attendance?staff_id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const fetchHistoryLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hr/attendance?staff_id=${user?.id}&start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStaffLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hr/attendance?all=true&start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAllLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch all logs", err);
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation tidak disokong oleh pelayar anda");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setLocError(null);
      },
      (err) => {
        setLocError("Gagal mendapatkan lokasi. Sila aktifkan GPS.");
        console.error(err);
      },
      { enableHighAccuracy: true }
    );
  };

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Gagal akses kamera");
      setCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setSelfie(dataUrl);
      
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCapturing(false);
    }
  };

  const handleClockAction = async (type: "in" | "out") => {
    if (!selfie) {
      toast.error("Wajib ambil selfie sebelum clock " + type.toUpperCase());
      return;
    }
    if (!location) {
      toast.error("Wajib aktifkan lokasi sebelum clock " + type.toUpperCase());
      requestLocation();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: user?.id,
          staff_name: user?.name,
          type,
          selfie_url: selfie,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          note
        })
      });

      if (res.ok) {
        toast.success(`Berjaya Clock ${type.toUpperCase()}!`);
        setSelfie(null);
        setNote("");
        fetchTodayLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal merekod kehadiran");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingLog) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingLog.id,
          type: editingLog.type,
          status: editingLog.status,
          timestamp: editingLog.timestamp,
          note: editingLog.note
        })
      });

      if (res.ok) {
        toast.success("Rekod berjaya dikemaskini");
        setEditingLog(null);
        fetchAllStaffLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal kemaskini rekod");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Rekod berjaya dipadam");
        setDeletingId(null);
        fetchAllStaffLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal padam rekod");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setLoading(false);
    }
  };

  const renderLogCard = (log: AttendanceLog, showActions = false) => (
    <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all">
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
        log.type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
      )}>
        {log.type === "in" ? "IN" : "OUT"}
      </div>
      <div className="flex-1 min-w-0">
        {showActions && (
          <p className="font-medium text-sm truncate">{log.staff_name}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">
            {new Date(log.timestamp).toLocaleString("ms-MY", { 
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit" 
            })}
          </p>
          <Badge variant={log.location_status === "OK" ? "outline" : "destructive"} className="text-[10px] h-5">
            {log.location_status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{STATUS_LABELS[log.status] || log.status}</p>
        {log.note && <p className="text-[10px] italic mt-1 text-slate-500 truncate">"{log.note}"</p>}
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" /> Kehadiran Staff
          </h2>
          <p className="text-muted-foreground">Sila clock in/out mengikut waktu kerja</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: canViewAllStaff ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
          <TabsTrigger value="clock" className="gap-2">
            <Camera className="w-4 h-4" /> Clock In/Out
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Sejarah Saya
          </TabsTrigger>
          {canViewAllStaff && (
            <TabsTrigger value="all" className="gap-2">
              <Users className="w-4 h-4" /> Semua Staff
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clock" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-emerald-100 dark:border-emerald-900/30">
              <CardHeader>
                <CardTitle>Clock In / Out</CardTitle>
                <CardDescription>Keperluan: Selfie + Lokasi GPS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                  {selfie ? (
                    <img src={selfie} className="w-full h-full object-cover" alt="Selfie" />
                  ) : capturing ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Camera className="w-12 h-12 mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500">Ambil selfie untuk teruskan</p>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {!selfie && !capturing && (
                      <Button onClick={startCamera} className="rounded-full shadow-lg">
                        <Camera className="w-4 h-4 mr-2" /> Buka Kamera
                      </Button>
                    )}
                    {capturing && (
                      <Button onClick={capturePhoto} className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Tangkap Gambar
                      </Button>
                    )}
                    {selfie && (
                      <Button variant="secondary" onClick={() => setSelfie(null)} className="rounded-full shadow-lg">
                        <RefreshCw className="w-4 h-4 mr-2" /> Ambil Semula
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
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
                      <Button variant="ghost" size="sm" onClick={requestLocation}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">Nota (Pilihan)</Label>
                    <Input 
                      id="note" 
                      placeholder="Contoh: Kerja luar, Site visit, dll" 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Button 
                      size="lg" 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleClockAction("in")}
                      disabled={loading || !selfie || !location}
                    >
                      CLOCK IN
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleClockAction("out")}
                      disabled={loading || !selfie || !location}
                    >
                      CLOCK OUT
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" /> Log Hari Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod untuk hari ini</p>
                    </div>
                  ) : (
                    logs.map((log) => renderLogCard(log))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Sejarah Kehadiran Saya
              </CardTitle>
              <CardDescription>Lihat rekod kehadiran anda mengikut tarikh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Dari Tarikh</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hingga Tarikh</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={fetchHistoryLogs} disabled={loading} variant="secondary">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cari"}
                </Button>
              </div>

              <div className="space-y-3 mt-4">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" />
                  </div>
                ) : historyLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Tiada rekod dalam tempoh ini</p>
                  </div>
                ) : (
                  historyLogs.map((log) => renderLogCard(log))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewAllStaff && (
          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" /> Kehadiran Semua Staff
                  </CardTitle>
                  <CardDescription>Pantau dan uruskan kehadiran semua staff</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <Download className="w-4 h-4" /> Export
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Dari Tarikh</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hingga Tarikh</Label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button onClick={fetchAllStaffLogs} disabled={loading} variant="secondary">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cari"}
                  </Button>
                </div>

                <div className="space-y-3 mt-4">
                  {loading ? (
                    <div className="text-center py-12">
                      <RefreshCw className="w-8 h-8 mx-auto text-slate-300 animate-spin" />
                    </div>
                  ) : allLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod dalam tempoh ini</p>
                    </div>
                  ) : (
                    allLogs.map((log) => renderLogCard(log, true))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" /> Edit Rekod Kehadiran
              </CardTitle>
              <CardDescription>{editingLog.staff_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tarikh & Masa</Label>
                <Input 
                  type="datetime-local"
                  value={editingLog.timestamp.slice(0, 16)}
                  onChange={(e) => setEditingLog({...editingLog, timestamp: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select 
                  value={editingLog.type} 
                  onValueChange={(v) => setEditingLog({...editingLog, type: v as "in" | "out"})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Clock In</SelectItem>
                    <SelectItem value="out">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editingLog.status} 
                  onValueChange={(v) => setEditingLog({...editingLog, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input 
                  value={editingLog.note || ""}
                  onChange={(e) => setEditingLog({...editingLog, note: e.target.value})}
                  placeholder="Tambah nota..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleEdit} disabled={loading} className="flex-1">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan
                </Button>
                <Button variant="outline" onClick={() => setEditingLog(null)} className="flex-1">
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
