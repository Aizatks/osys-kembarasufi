"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Clock, 
  MapPin, 
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Link,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AllowedLocation {
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

interface AttendanceSettings {
  id?: string;
  geofence_enabled: boolean;
  geofence_radius: number;
  allowed_locations: AllowedLocation[];
  remote_allowed: boolean;
  working_hours: {
    start: string;
    end: string;
  };
}



export function AttendanceSettingsContent() {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractingUrl, setExtractingUrl] = useState<number | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings>({
    geofence_enabled: true,
    geofence_radius: 100,
    allowed_locations: [],
    remote_allowed: false,
    working_hours: { start: "09:00", end: "18:00" }
  });
  
  // Google Maps URL input for each location
  const [mapsUrls, setMapsUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/hr/attendance/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          // Initialize maps URLs array to match locations
          setMapsUrls(new Array(data.settings.allowed_locations?.length || 0).fill(""));
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/hr/attendance/settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        toast.success("Tetapan berjaya disimpan!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menyimpan tetapan");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    setSettings(prev => ({
      ...prev,
      allowed_locations: [
        ...prev.allowed_locations,
        { name: "", lat: 0, lng: 0, radius: 100 }
      ]
    }));
    setMapsUrls(prev => [...prev, ""]);
  };

  const removeLocation = (index: number) => {
    setSettings(prev => ({
      ...prev,
      allowed_locations: prev.allowed_locations.filter((_, i) => i !== index)
    }));
    setMapsUrls(prev => prev.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof AllowedLocation, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      allowed_locations: prev.allowed_locations.map((loc, i) => 
        i === index ? { ...loc, [field]: value } : loc
      )
    }));
  };

  const getCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak disokong");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(index, "lat", pos.coords.latitude);
        updateLocation(index, "lng", pos.coords.longitude);
        toast.success("Lokasi semasa diambil");
      },
      (err) => {
        toast.error("Gagal mendapatkan lokasi");
      }
    );
  };

  const handleMapsUrlChange = (index: number, url: string) => {
    setMapsUrls(prev => prev.map((u, i) => i === index ? url : u));
  };

  const extractFromMapsUrl = async (index: number) => {
    const url = mapsUrls[index];
    if (!url) {
      toast.error("Sila masukkan link Google Maps");
      return;
    }

    setExtractingUrl(index);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/hr/attendance/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        updateLocation(index, "lat", data.lat);
        updateLocation(index, "lng", data.lng);
        toast.success(`Koordinat berjaya diambil: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`);
      } else {
        toast.error(data.error || "Tidak dapat mengekstrak koordinat. Pastikan link Google Maps betul.");
      }
    } catch (err) {
      toast.error("Ralat semasa memproses URL");
    } finally {
      setExtractingUrl(null);
    }
  };

  const openInGoogleMaps = (loc: AllowedLocation) => {
    if (loc.lat && loc.lng) {
      window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, "_blank");
    }
  };

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
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-500" /> Tetapan Kehadiran
          </h2>
          <p className="text-muted-foreground">Konfigurasi waktu kerja dan geofencing</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Waktu Kerja
          </CardTitle>
          <CardDescription>Tetapkan waktu masuk dan keluar standard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Waktu Masuk</Label>
              <Input
                type="time"
                value={settings.working_hours.start}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  working_hours: { ...prev.working_hours, start: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Waktu Keluar</Label>
              <Input
                type="time"
                value={settings.working_hours.end}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  working_hours: { ...prev.working_hours, end: e.target.value }
                }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Staff akan ditandakan LEWAT jika clock in lebih 15 minit selepas waktu masuk.
            Staff akan ditandakan BALIK AWAL jika clock out lebih 30 minit sebelum waktu keluar.
          </p>
        </CardContent>
      </Card>

      {/* Geofencing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Geofencing
          </CardTitle>
          <CardDescription>Hadkan clock in/out kepada lokasi tertentu sahaja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Aktifkan Geofencing</Label>
              <p className="text-xs text-muted-foreground">Staff mesti berada dalam kawasan yang dibenarkan</p>
            </div>
            <Switch
              checked={settings.geofence_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, geofence_enabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Benarkan Kerja Remote</Label>
              <p className="text-xs text-muted-foreground">Staff boleh clock in dari mana-mana lokasi</p>
            </div>
            <Switch
              checked={settings.remote_allowed}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, remote_allowed: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Radius Default (meter)</Label>
            <Input
              type="number"
              value={settings.geofence_radius}
              onChange={(e) => setSettings(prev => ({ ...prev, geofence_radius: parseInt(e.target.value) || 100 }))}
              className="w-32"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Lokasi Dibenarkan</Label>
              <Button variant="outline" size="sm" onClick={addLocation} className="gap-2">
                <Plus className="w-4 h-4" /> Tambah Lokasi
              </Button>
            </div>

            {settings.allowed_locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                Tiada lokasi ditetapkan. Tambah lokasi untuk aktifkan geofencing.
              </p>
            ) : (
              <div className="space-y-4">
                {settings.allowed_locations.map((loc, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Lokasi #{index + 1}</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeLocation(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nama Lokasi</Label>
                        <Input
                          placeholder="cth: Pejabat HQ"
                          value={loc.name}
                          onChange={(e) => updateLocation(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Radius (m)</Label>
                        <Input
                          type="number"
                          value={loc.radius}
                          onChange={(e) => updateLocation(index, "radius", parseInt(e.target.value) || 100)}
                        />
                      </div>
                    </div>

                      {/* Google Maps URL Input */}
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Link className="w-3 h-3" /> Link Google Maps
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Paste link Google Maps di sini..."
                            value={mapsUrls[index] || ""}
                            onChange={(e) => handleMapsUrlChange(index, e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => extractFromMapsUrl(index)}
                            disabled={extractingUrl === index}
                            className="shrink-0"
                          >
                            {extractingUrl === index ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                Memproses...
                              </>
                            ) : (
                              "Ambil Koordinat"
                            )}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Buka Google Maps, cari lokasi, copy link dan paste di sini (termasuk link pendek maps.app.goo.gl)
                        </p>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Latitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={loc.lat}
                          onChange={(e) => updateLocation(index, "lat", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Longitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={loc.lng}
                          onChange={(e) => updateLocation(index, "lng", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => getCurrentLocation(index)}
                        className="gap-2"
                      >
                        <MapPin className="w-4 h-4" /> Guna Lokasi Semasa
                      </Button>
                      {loc.lat !== 0 && loc.lng !== 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openInGoogleMaps(loc)}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" /> Lihat di Google Maps
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
