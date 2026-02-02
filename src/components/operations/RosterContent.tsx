"use client";

import { useState, useEffect } from "react";
import { 
  Plane, 
  Plus, 
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  ShieldCheck,
  Lock,
  Unlock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RosterItem {
  id: string;
  staff_id: string;
  trip_date_id: string;
  staff: { name: string; role: string };
  trip_dates: { depart_date: string; return_date: string; package_id: string };
  is_locked: boolean;
  created_at: string;
}

export function RosterContent() {
  const { user, isAdmin } = useAuth();
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRoster();
  }, []);

  const fetchRoster = async () => {
    try {
      const res = await fetch("/api/operations/roster");
      if (res.ok) {
        const data = await res.json();
        setRoster(data.roster || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/operations/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GENERATE_ROSTER" })
      });

      if (res.ok) {
        toast.success("Jadual Airport Duty berjaya dijana secara automatik");
        fetchRoster();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menjana jadual");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="w-6 h-6 text-rose-500" /> Airport Duty Roster
          </h2>
          <p className="text-muted-foreground">Jadual tugasan staff di lapangan terbang (Departure/Arrival)</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchRoster}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 bg-rose-600 hover:bg-rose-700" onClick={handleGenerate} disabled={generating}>
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Auto-Generate Jadual
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20">Memuatkan roster...</div>
        ) : roster.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <Plane className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium">Tiada jadual ditemui</p>
            <p className="text-xs text-slate-400 mt-1">Klik 'Auto-Generate' untuk menyusun jadual staff</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                  <th className="text-left p-4 font-semibold text-slate-600">Tarikh Trip</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Staff Assigned</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                  <th className="text-right p-4 font-semibold text-slate-600">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(item => (
                  <tr key={item.id} className="border-b hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                          {new Date(item.trip_dates.depart_date).getDate()}
                        </div>
                        <div>
                          <p className="font-bold">{new Date(item.trip_dates.depart_date).toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{item.trip_dates.package_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{item.staff.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1 h-4">{item.staff.role}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.is_locked ? (
                        <Badge className="bg-slate-100 text-slate-600 gap-1 border-slate-200"><Lock className="w-3 h-3" /> Terkunci</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 gap-1 border-emerald-200"><Unlock className="w-3 h-3" /> Auto</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="bg-rose-50/50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-rose-700">
              <ShieldCheck className="w-4 h-4" /> Polisi Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-rose-600 space-y-2">
            <p>• 1 staff bertugas bagi setiap 25 orang peserta.</p>
            <p>• Sistem menggunakan logic Round-robin untuk penggiliran adil.</p>
            <p>• Staff yang mempunyai clash dalam kalendar akan diabaikan.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <Clock className="w-4 h-4" /> Notifikasi Tugas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-600 space-y-2">
            <p>• Notifikasi WhatsApp akan dihantar 24 jam sebelum tugas.</p>
            <p>• Calendar event akan dimasukkan secara automatik ke dalam workspace staff.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
