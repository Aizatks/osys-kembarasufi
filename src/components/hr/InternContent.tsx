"use client";

import { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Plus, 
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Star,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  BookOpen,
  School
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Intern {
  id: string;
  full_name: string;
  university: string;
  course: string;
  start_date: string;
  end_date: string;
  supervisor_id?: string;
  status: "Active" | "Completed" | "Terminated";
  evaluation_score?: number;
  remarks?: string;
  created_at: string;
}

export function InternContent() {
  const { user, isAdmin } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newIntern, setNewIntern] = useState({
    full_name: "",
    university: "",
    course: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    supervisor_id: ""
  });

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    try {
      const res = await fetch("/api/hr/interns");
      if (res.ok) {
        const data = await res.json();
        setInterns(data.interns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntern = async () => {
    if (!newIntern.full_name || !newIntern.university) {
      toast.error("Sila isi nama dan universiti pelatih");
      return;
    }

    try {
      const res = await fetch("/api/hr/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIntern)
      });

      if (res.ok) {
        toast.success("Pelatih berjaya didaftarkan");
        setIsAddOpen(false);
        setNewIntern({ full_name: "", university: "", course: "", start_date: new Date().toISOString().split("T")[0], end_date: "", supervisor_id: "" });
        fetchInterns();
      }
    } catch (err) {
      toast.error("Gagal mendaftarkan pelatih");
    }
  };

  const handleEvaluate = async (id: string, score: number, remarks: string) => {
    try {
      const res = await fetch("/api/hr/interns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, evaluation_score: score, remarks })
      });

      if (res.ok) {
        toast.success("Penilaian disimpan");
        fetchInterns();
      }
    } catch (err) {
      toast.error("Gagal menyimpan penilaian");
    }
  };

  const filteredInterns = interns.filter(i => 
    i.full_name.toLowerCase().includes(search.toLowerCase()) || 
    i.university.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" /> Profil Intern (Pelatih)
          </h2>
          <p className="text-muted-foreground">Urus maklumat pelatih industri dan penilaian prestasi</p>
        </div>

        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Tambah Intern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daftar Intern Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Penuh</Label>
                  <Input placeholder="Ali Bin Ahmad" value={newIntern.full_name} onChange={e => setNewIntern({...newIntern, full_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Universiti / Kolej</Label>
                  <Input placeholder="Universiti Malaya" value={newIntern.university} onChange={e => setNewIntern({...newIntern, university: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Kursus / Pengajian</Label>
                  <Input placeholder="Ijazah Sarjana Muda Pemasaran" value={newIntern.course} onChange={e => setNewIntern({...newIntern, course: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tarikh Mula</Label>
                    <Input type="date" value={newIntern.start_date} onChange={e => setNewIntern({...newIntern, start_date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarikh Tamat</Label>
                    <Input type="date" value={newIntern.end_date} onChange={e => setNewIntern({...newIntern, end_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAddIntern} className="bg-indigo-600">Daftar Intern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cari intern..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20">Memuatkan data...</div>
        ) : filteredInterns.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada intern ditemui</p>
          </div>
        ) : (
          filteredInterns.map(intern => (
            <Card key={intern.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{intern.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1"><School className="w-3 h-3" /> {intern.university}</CardDescription>
                  </div>
                  <Badge variant={intern.status === "Active" ? "secondary" : "outline"} className={cn(intern.status === "Active" && "bg-emerald-100 text-emerald-700")}>
                    {intern.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="w-4 h-4" /> {intern.course}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" /> {new Date(intern.start_date).toLocaleDateString()} - {new Date(intern.end_date).toLocaleDateString()}
                  </div>
                </div>

                {intern.evaluation_score !== undefined ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase text-slate-400">Skor Penilaian</span>
                      <span className="font-bold text-indigo-600">{intern.evaluation_score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all" style={{ width: `${intern.evaluation_score}%` }} />
                    </div>
                  </div>
                ) : (
                  isAdmin && (
                    <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => handleEvaluate(intern.id, 85, "Good performance")}>
                      Beri Penilaian
                    </Button>
                  )
                )}

                <div className="flex gap-2 border-t pt-4">
                  <Button variant="ghost" size="sm" className="w-full gap-1">
                    <Clock className="w-3 h-3" /> Kehadiran
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full gap-1">
                    <FileText className="w-3 h-3" /> Tugasan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
