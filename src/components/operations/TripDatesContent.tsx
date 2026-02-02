"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CalendarDays, 
  Plus, 
  Search,
  Download,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Table as TableIcon,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TripDate {
  id: string;
  package_id: string;
  depart_date: string;
  return_date: string;
  seats_total: number;
  seats_available: number;
  base_price_override: number | null;
  surcharge_override: number | null;
  last_synced_at: string;
}

// MANUAL FILTER LIST - EDITABLE HERE
const MANUAL_FILTERS = [
  "WEST EUROPE (11 HARI 8 MALAM)",
  "KEMBARA EROPAH (10 HARI 7 MALAM)",
  "SWITZERLAND (9 HARI 6 MALAM)",
  "UNITED KINGDOM (11 HARI 8 MALAM)",
  "CENTRAL EASTERN EUROPE (11 HARI 9 MALAM)",
  "BALKAN 8 NEGARA (13 HARI 10 MALAM)",
  "TURKIYE (10 HARI 7 MALAM)",
  "KEMBARA CAUCASUS (11 HARI 8 MALAM)",
  "MESIR JEJAK RASUL (11 HARI 8 MALAM)",
  "MESIR NILE CRUISE (15 HARI 13 MALAM)",
  "PALESTIN,JORDAN & AQSA (10 HARI 7 MALAM)",
  "SPAIN, PORTUGAL & MOROCCO (12 HARI 9 HARI)",
  "KOREA SEOUL NAMI (6 HARI 4 MALAM)",
  "JAPAN (8 HARI 5 MALAM)",
  "BEIJING + INNER MONGOLIA (7 HARI 5 MALAM)",
  "BEIJING+ XIAN (7 HARI 5 MALAM)",
  "WILAYAH YUNNAN (9 HARI 7 MALAM)",
  "VIETNAM 6 NEGERI (6 HARI 5 MALAM)",
  "VIETNAM DA NANG (4 HARI 3 MALAM)",
  "VIETNAM PHU QUOC (4 HARI 3 MALAM)",
  "VIETNAM HANOI (5 HARI 4 MALAM)",
  "VIETNAM 12 NEGERI (10 HARI 9 MALAM)",
  "KEMBOJA (6 HARI 5 MALAM)",
  "KASHMIR & AGRA TOUR (7 HARI 5 MALAM)",
  "PAKISTAN PANORAMA (11 HARI 9 MALAM)",
  "TAIWAN (5 HARI 4 MALAM)",
  "TIMOR LESTE + ATAURO ISLAND (4 HARI 3 MALAM)",
  "SYRIA & LEBANON (9 HARI 8 MALAM)",
  "TRANS INDONESIA (9 HARI 8 MALAM)",
  "JAKARTA & BANDUNG (4 HARI 3 MALAM)",
  "BALI (4 HARI 3 MALAM)",
  "MEDAN (4 HARI 3 MALAM)",
  "ACEH + PULAU SABANG (5 HARI 4 MALAM)",
  "PADANG & BUKIT TINGGI (5 HARI 4 MALAM)",
  "HATYAI SONGKHLA (4 HARI 2 MALAM)",
  "TASIK KENYIR (3 HARI 2 MALAM)",
  "TAMAN NEGARA (3 HARI 2 MALAM)",
  "NEW ZEALAND (10 HARI 8 MALAM)",
  "NORWAY LOFOTEN (15 HARI 13 MALAM)",
  "NORWAY LOFOTEN + ICELAND (15 HARI 13 MALAM)",
  "FAROE ISLAND + NORWAY LOFOTEN (14 HARI 12 MALAM)",
  "FAROE ISLAND + ICELAND (14 HARI 12 MALAM)",
  "CENTRAL ASIA (15 HARI 13 MALAM)",
  "SCANDINAVIA 3 NEGARA (11 HARI 9 MALAM)",
  "ICELAND (9 HARI 6 MALAM)",
  "SOUTH AMERICA (16 HARI 14 MALAM)",
  "CANADA (11 HARI 9 MALAM)",
  "MEXICO + CUBA (12 HARI 10 MALAM)",
  "GREENLAND + LOFOTEN ISLAND (13 HARI 11 MALAM)",
  "MAGESTIC ANTARTICA (15 HARI 13 MALAM)",
  "HARBIN (7 HARI 6 MALAM)",
  "CHENGDU + CHONGQING (8 HARI 6 MALAM)",
  "SILK ROAD CHINA (12 HARI 10 MALAM)",
  "UMRAH BARAKAH (12 HARI 10 MALAM)",
  "UMRAH MUMZTAZ (12 HARI 10 MALAM)"
];

export function TripDatesContent() {
  const { user, isAdmin } = useAuth();
  const canEdit = user?.role === 'tour-coordinator' || 
                  user?.role === 'tour-coordinator-manager' || 
                  user?.role === 'superadmin';
  const [tripDates, setTripDates] = useState<TripDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [masterPackages, setMasterPackages] = useState<string[]>([]);

  useEffect(() => {
    fetchTripDates(false); // Pass false to skip sync on mount
    fetchMasterPackages();
  }, []);

  const fetchMasterPackages = async () => {
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setMasterPackages(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch master packages", err);
    }
  };

  const fetchTripDates = async (shouldSync = true) => {
    try {
      setLoading(true);
      
      if (shouldSync) {
        // Only sync if explicitly requested
        const syncRes = await fetch("/api/operations/trip-dates/sync", { method: "POST" });
        if (!syncRes.ok) throw new Error("Sync failed");
        toast.success("Data berjaya di-sync dari Google Sheets");
      }

      const res = await fetch("/api/operations/trip-dates");
      if (res.ok) {
        const data = await res.json();
        setTripDates(data.trip_dates || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mendapatkan data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOverride = async (id: string, field: string, value: string) => {
    let finalValue: any = value;
    
    // Check if it's a number field
    if (["seats_available", "base_price_override", "surcharge_override", "seats_total"].includes(field)) {
      finalValue = value === "" ? null : parseFloat(value);
    }
    
    try {
      const res = await fetch("/api/operations/trip-dates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: finalValue })
      });

      if (res.ok) {
        toast.success("Maklumat dikemaskini");
        setTripDates(prev => prev.map(td => td.id === id ? { ...td, [field]: finalValue } : td));
      }
    } catch (err) {
      toast.error("Gagal mengemaskini maklumat");
    }
  };

  const filteredDates = tripDates.filter(td => {
    const pkgName = (td.package_id || "").trim().toUpperCase();
    const matchesSearch = pkgName.toLowerCase().includes(search.toLowerCase());
    
    if (packageFilter === "all") return matchesSearch;

    const filterDest = packageFilter.split('(')[0].trim().toUpperCase();
    const isExactMatch = pkgName === filterDest;
    const isPartialMatch = pkgName.includes(filterDest) || filterDest.includes(pkgName);
    
    const specialMappings: Record<string, string[]> = {
      "BEIJING + INNER MONGOLIA": ["BIM", "BEIJING INNER MONGOLIA"],
      "BEIJING+ XIAN": ["BEIJING XIAN"],
      "CENTRAL EASTERN EUROPE": ["CEE", "CENTRAL EASTERN"],
      "BALKAN 8 NEGARA": ["BALKAN"],
      "KOREA SEOUL NAMI": ["KOREA"],
      "UMRAH BARAKAH": ["BARAKAH"],
      "UMRAH MUMZTAZ": ["MUMZTAZ"],
      "KASHMIR & AGRA TOUR": ["AGRA", "KASHMIR"],
      "SYRIA & LEBANON": ["SYRIA", "LEBANON"],
    };

    const mappedAliases = specialMappings[filterDest] || [];
    const isMappedMatch = mappedAliases.some(alias => pkgName.includes(alias.toUpperCase()));

    return matchesSearch && (isExactMatch || isPartialMatch || isMappedMatch);
  });

  return (
    <div className="space-y-6 max-w-full mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-rose-500" /> Tarikh Trip 2026
          </h2>
          <p className="text-muted-foreground">Ejas tarikh, surcharge, dan kekosongan mengikut keperluan</p>
        </div>

          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-2" onClick={fetchTripDates}>
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Sync Google Sheet
              </Button>
            )}
            <Button className="gap-2 bg-rose-600">
              <Download className="w-4 h-4" /> Export Jualan
            </Button>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs uppercase text-slate-500">Cari Pakej</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Contoh: Turkey, Eropah..." 
              className="pl-10" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5 w-64">
          <Label className="text-xs uppercase text-slate-500">Filter Pakej</Label>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger><SelectValue placeholder="Semua Pakej" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pakej</SelectItem>
                {MANUAL_FILTERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[700px] relative">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b shadow-sm">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 p-4 text-left font-bold text-slate-600 border-r w-[200px]">Pakej</th>
                  <th className="p-4 text-left font-bold text-slate-600 border-r min-w-[160px]">Tarikh Pergi</th>
                  <th className="p-4 text-left font-bold text-slate-600 border-r min-w-[160px]">Tarikh Balik</th>
                  <th className="p-4 text-center font-bold text-slate-600 border-r w-[100px]">Seats</th>
                  <th className="p-4 text-center font-bold text-slate-600 border-r w-[100px]">Kekosongan</th>
                  <th className="p-4 text-center font-bold text-slate-600 border-r w-[120px]">Price (O)</th>
                  <th className="p-4 text-center font-bold text-slate-600 border-r w-[120px]">Surcharge (O)</th>
                  <th className="p-4 text-center font-bold text-slate-600 w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="p-20 text-center text-slate-500">Memuatkan data...</td></tr>
                ) : filteredDates.length === 0 ? (
                  <tr><td colSpan={8} className="p-20 text-center text-slate-500 italic">Tiada tarikh trip ditemui</td></tr>
                ) : (
                  filteredDates.map(td => {
                    return (
                      <tr key={td.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-4 border-r font-bold uppercase text-[11px] truncate shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          {td.package_id}
                        </td>
                          <td className="p-4 border-r">
                            <input 
                              type="date"
                              disabled={!canEdit}
                              defaultValue={td.depart_date ? td.depart_date.split('T')[0] : ""}
                              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-rose-500 rounded p-1 disabled:opacity-50"
                              onBlur={e => handleUpdateOverride(td.id, "depart_date", e.target.value)}
                            />
                          </td>
                          <td className="p-4 border-r">
                            <input 
                              type="date"
                              disabled={!canEdit}
                              defaultValue={td.return_date ? td.return_date.split('T')[0] : ""}
                              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-rose-500 rounded p-1 disabled:opacity-50"
                              onBlur={e => handleUpdateOverride(td.id, "return_date", e.target.value)}
                            />
                          </td>
                          <td className="p-4 border-r text-center">
                            <input 
                              type="number"
                              disabled={!canEdit}
                              defaultValue={td.seats_total}
                              className="w-12 text-center bg-transparent border-none focus:ring-1 focus:ring-slate-500 rounded font-medium disabled:opacity-50"
                              onBlur={e => handleUpdateOverride(td.id, "seats_total", e.target.value)}
                            />
                          </td>
                          <td className="p-4 border-r text-center">
                            <input 
                              type="number"
                              disabled={!canEdit}
                              defaultValue={td.seats_available}
                              className={cn(
                                "w-12 text-center bg-transparent border-none focus:ring-1 focus:ring-rose-500 rounded font-bold disabled:opacity-50",
                                td.seats_available < 5 ? "text-rose-600" : "text-emerald-600"
                              )}
                              onBlur={e => handleUpdateOverride(td.id, "seats_available", e.target.value)}
                            />
                          </td>
                          <td className="p-4 border-r text-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold">RM</span>
                              <input 
                                type="number"
                                disabled={!canEdit}
                                placeholder="Defau"
                                defaultValue={td.base_price_override || ""}
                                className="w-16 text-center text-xs bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-blue-500 rounded p-1 disabled:opacity-50"
                                onBlur={e => handleUpdateOverride(td.id, "base_price_override", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="p-4 border-r text-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold">RM</span>
                              <input 
                                type="number"
                                disabled={!canEdit}
                                placeholder="0"
                                defaultValue={td.surcharge_override || ""}
                                className="w-16 text-center text-xs bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-amber-500 rounded p-1 disabled:opacity-50"
                                onBlur={e => handleUpdateOverride(td.id, "surcharge_override", e.target.value)}
                              />
                            </div>
                          </td>
                        <td className="p-4 text-center">
                          {td.seats_available === 0 ? (
                            <Badge variant="destructive" className="text-[9px] uppercase font-bold">Full</Badge>
                          ) : td.seats_available < 10 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[9px] uppercase font-bold">Low</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] uppercase font-bold border-none">Open</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><TableIcon className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase">Sync Status</p>
            <p className="text-[10px] text-blue-500">Terakhir: {tripDates[0] ? new Date(tripDates[0].last_synced_at).toLocaleString() : "-"}</p>
          </div>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase">Seats Available</p>
            <p className="text-[10px] text-emerald-500">{tripDates.reduce((acc, td) => acc + td.seats_available, 0)} total seats open</p>
          </div>
        </div>
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-rose-600 uppercase">Override Active</p>
            <p className="text-[10px] text-rose-500">{tripDates.filter(td => td.base_price_override || td.surcharge_override).length} dates customized</p>
          </div>
        </div>
      </div>
    </div>
  );
}
