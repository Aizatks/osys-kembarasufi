"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  MapPin, 
  Camera, 
  User, 
  CheckCircle2, 
  AlertCircle,
  History,
  Settings as SettingsIcon,
  RefreshCw,
  Download,
  Calendar,
  Search,
  Users,
  Pencil,
  Trash2,
  X,
  Save
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
  type: "in" | "out" | "IN" | "OUT";
  timestamp: string;
  selfie_url: string;
  location_status: string;
  status: string;
  note: string;
}

// Helper to detect iframe environment
const isInIframe = () => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export function AttendanceContent() {
  const { user, isAdmin, isHR, token } = useAuth();
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<AttendanceLog[]>([]);
  const [allStaffLogs, setAllStaffLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [note, setNote] = useState("");
  const [hasHRAccess, setHasHRAccess] = useState(false);
  
  // Edit modal state
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"in" | "out">("in");
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Date range for history
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayDate());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (token) {
      fetchTodayLogs();
    }
    // Check if in iframe/preview mode
    if (isInIframe()) {
      setIsPreviewMode(true);
      setLocError("Preview mode - lokasi tidak tersedia");
    } else {
      requestLocation();
    }
  }, [token]);

  const fetchTodayLogs = async () => {
    if (!token) return;
    const today = getTodayDate();
    try {
      const res = await fetch(`/api/hr/attendance?start_date=${today}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayLogs(data.logs || []);
        setHasHRAccess(data.hasHRAccess || false);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const fetchHistoryLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/hr/attendance?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchAllStaffLogs = async () => {
    if (!token || !hasHRAccess) return;
    const today = getTodayDate();
    try {
      const res = await fetch(`/api/hr/attendance?start_date=${today}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllStaffLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch all staff logs", err);
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
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Sila benarkan akses lokasi dalam tetapan browser");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocError("Lokasi tidak tersedia. Pastikan GPS aktif.");
        } else {
          setLocError("Gagal mendapatkan lokasi. Sila cuba lagi.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setSelfie(dataUrl);
      
      const stream = video.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
      setCapturing(false);
    }
  };

  const handleClockAction = async (type: "IN" | "OUT") => {
    if (!selfie) {
      toast.error("Wajib ambil selfie sebelum clock " + type);
      return;
    }
    if (!location) {
      toast.error("Wajib aktifkan lokasi sebelum clock " + type);
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
        toast.success(`Berjaya Clock ${type}!`);
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

  // Open edit modal
  const openEditModal = (log: AttendanceLog) => {
    const dt = new Date(log.timestamp);
    setEditingLog(log);
    setEditDate(dt.toISOString().split('T')[0]);
    setEditTime(dt.toTimeString().slice(0, 5));
    setEditType(log.type.toLowerCase() as "in" | "out");
    setEditStatus(log.status);
    setEditNote(log.note || "");
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingLog || !token) return;
    
    const newTimestamp = new Date(`${editDate}T${editTime}:00`).toISOString();
    
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingLog.id,
          timestamp: newTimestamp,
          type: editType,
          status: editStatus,
          note: editNote
        })
      });

      if (res.ok) {
        toast.success("Rekod berjaya dikemaskini");
        setEditingLog(null);
        fetchTodayLogs();
        fetchHistoryLogs();
        fetchAllStaffLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal kemaskini rekod");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    }
  };

  // Delete attendance
  const handleDelete = async (id: string) => {
    if (!token) return;
    
    try {
      const res = await fetch(`/api/hr/attendance?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Rekod berjaya dipadam");
        setDeletingId(null);
        fetchTodayLogs();
        fetchHistoryLogs();
        fetchAllStaffLogs();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal padam rekod");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    }
  };

  const renderLogItem = (log: AttendanceLog, showName = false, showActions = false) => {
    const typeUpper = log.type.toUpperCase();
    const statusLabel: Record<string, string> = {
      'on_time': 'Tepat Masa',
      'late': 'Lewat',
      'early_leave': 'Balik Awal',
      'out_of_range': 'Luar Kawasan'
    };
    const displayStatus = statusLabel[log.status] || log.status;
    const locStatusOk = log.location_status === 'ok' || log.location_status === 'OK';
    
    return (
      <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs",
          typeUpper === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
        )}>
          {typeUpper}
        </div>
        <div className="flex-1">
          {showName && (
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">{log.staff_name}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">
              {new Date(log.timestamp).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
              {showName && (
                <span className="font-normal text-muted-foreground ml-2">
                  {new Date(log.timestamp).toLocaleDateString("ms-MY")}
                </span>
              )}
            </p>
            <Badge variant={locStatusOk ? "outline" : "destructive"} className="text-[10px] h-5">
              {locStatusOk ? "OK" : log.location_status.toUpperCase()}
            </Badge>
          </div>
          <p className={cn(
            "text-xs mt-0.5",
            log.status === 'late' || log.status === 'early_leave' ? "text-amber-600 font-medium" : "text-muted-foreground"
          )}>{displayStatus}</p>
          {log.note && <p className="text-[10px] italic mt-1 text-slate-500">"{log.note}"</p>}
        </div>
        {log.selfie_url && (
          <div className="w-10 h-10 rounded-lg overflow-hidden border">
            <img src={log.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
          </div>
        )}
        
        {/* Edit/Delete buttons for HR/Admin */}
        {showActions && hasHRAccess && (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-500 hover:text-blue-600"
              onClick={() => openEditModal(log)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {deletingId === log.id ? (
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-600"
                  onClick={() => handleDelete(log.id)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setDeletingId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-500 hover:text-red-600"
                onClick={() => setDeletingId(log.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const myTodayLogs = todayLogs.filter(log => log.staff_id === user?.id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Edit Rekod Kehadiran</span>
                <Button variant="ghost" size="icon" onClick={() => setEditingLog(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>{editingLog.staff_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarikh</Label>
                  <Input 
                    type="date" 
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Masa</Label>
                  <Input 
                    type="time" 
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis</Label>
                  <Select value={editType} onValueChange={(v) => setEditType(v as "in" | "out")}>
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
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_time">Tepat Masa</SelectItem>
                      <SelectItem value="late">Lewat</SelectItem>
                      <SelectItem value="early_leave">Balik Awal</SelectItem>
                      <SelectItem value="out_of_range">Luar Kawasan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Nota</Label>
                <Input 
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Nota tambahan..."
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditingLog(null)}>
                  Batal
                </Button>
                <Button className="flex-1 gap-2" onClick={handleSaveEdit}>
                  <Save className="w-4 h-4" /> Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" /> Kehadiran Staff
          </h2>
          <p className="text-muted-foreground">Sila clock in/out mengikut waktu kerja</p>
        </div>
        {(isAdmin || isHR) && (
          <Button variant="outline" size="sm" className="gap-2">
            <SettingsIcon className="w-4 h-4" /> Tetapan Geofence
          </Button>
        )}
      </div>

      <Tabs defaultValue="clock" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="clock">Clock In/Out</TabsTrigger>
          <TabsTrigger value="history" onClick={fetchHistoryLogs}>Sejarah Saya</TabsTrigger>
          {hasHRAccess && (
            <TabsTrigger value="all-staff" onClick={fetchAllStaffLogs}>
              <Users className="w-4 h-4 mr-1" /> Semua Staff
            </TabsTrigger>
          )}
          {!hasHRAccess && <TabsTrigger value="disabled" disabled>-</TabsTrigger>}
        </TabsList>

        <TabsContent value="clock">
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
                      onClick={() => handleClockAction("IN")}
                      disabled={loading || !selfie || !location}
                    >
                      CLOCK IN
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleClockAction("OUT")}
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
                  {myTodayLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod untuk hari ini</p>
                    </div>
                  ) : (
                    myTodayLogs.map((log) => renderLogItem(log, false, false))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Sejarah Kehadiran Saya
              </CardTitle>
              <CardDescription>Pilih tarikh untuk melihat rekod kehadiran anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="start-date">Dari Tarikh</Label>
                  <Input 
                    id="start-date"
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="end-date">Hingga Tarikh</Label>
                  <Input 
                    id="end-date"
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchHistoryLogs} className="gap-2">
                    <Search className="w-4 h-4" /> Cari
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {historyLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Tiada rekod dalam tempoh ini</p>
                  </div>
                ) : (
                  historyLogs.map((log) => renderLogItem(log, true, false))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {hasHRAccess && (
          <TabsContent value="all-staff">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" /> Kehadiran Semua Staff Hari Ini
                  </CardTitle>
                  <CardDescription>Pantau kehadiran semua staff (HR/Admin sahaja)</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allStaffLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 text-sm">Tiada rekod kehadiran hari ini</p>
                    </div>
                  ) : (
                    allStaffLogs.map((log) => renderLogItem(log, true, true))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
