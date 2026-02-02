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
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AttendanceLog {
  id: string;
  type: "IN" | "OUT";
  timestamp: string;
  selfie_url: string;
  location_status: string;
  status: string;
  note: string;
}

export function AttendanceContent() {
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchLogs();
    requestLocation();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/hr/attendance?staff_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
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
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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
        headers: { "Content-Type": "application/json" },
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
        fetchLogs();
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" /> Kehadiran Staff
          </h2>
          <p className="text-muted-foreground">Sila clock in/out mengikut waktu kerja</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" className="gap-2">
            <SettingsIcon className="w-4 h-4" /> Tetapan Geofence
          </Button>
        )}
      </div>

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
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Tiada rekod untuk hari ini</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs",
                      log.type === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {log.type}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">
                          {new Date(log.timestamp).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <Badge variant={log.location_status === "OK" ? "outline" : "destructive"} className="text-[10px] h-5">
                          {log.location_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.status}</p>
                      {log.note && <p className="text-[10px] italic mt-1 text-slate-500">"{log.note}"</p>}
                    </div>
                    {log.selfie_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border">
                        <img src={log.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Laporan Kehadiran Keseluruhan</CardTitle>
              <CardDescription>Pantau kehadiran semua staff</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-center py-8 text-muted-foreground">Admin boleh view senarai penuh di sini.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
