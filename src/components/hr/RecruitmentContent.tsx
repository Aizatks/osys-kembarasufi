"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, 
  Plus, 
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Mail,
  Phone,
  Paperclip,
  MoreVertical,
  ExternalLink,
  ChevronRight
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

interface Applicant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  cv_url: string;
  status: "Applied" | "Screening" | "Interview" | "Offered" | "Hired" | "Rejected";
  notes?: string;
  interview_date?: string;
  created_at: string;
}

export function RecruitmentContent() {
  const { user, isAdmin } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const [newApplicant, setNewApplicant] = useState({
    full_name: "",
    email: "",
    phone: "",
    position: "Sales Executive",
    cv_url: "",
    notes: ""
  });

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const res = await fetch("/api/hr/recruitment");
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApplicant = async () => {
    if (!newApplicant.full_name || !newApplicant.email) {
      toast.error("Sila isi nama dan email pemohon");
      return;
    }

    try {
      const res = await fetch("/api/hr/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApplicant)
      });

      if (res.ok) {
        toast.success("Permohonan berjaya didaftarkan");
        setIsAddOpen(false);
        setNewApplicant({ full_name: "", email: "", phone: "", position: "Sales Executive", cv_url: "", notes: "" });
        fetchApplicants();
      }
    } catch (err) {
      toast.error("Gagal mendaftarkan permohonan");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/hr/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (res.ok) {
        toast.success("Status dikemaskini");
        fetchApplicants();
      }
    } catch (err) {
      toast.error("Gagal mengemaskini status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Applied": return <Badge variant="secondary" className="bg-slate-100 text-slate-600">Applied</Badge>;
      case "Screening": return <Badge variant="secondary" className="bg-blue-100 text-blue-600">Screening</Badge>;
      case "Interview": return <Badge variant="secondary" className="bg-amber-100 text-amber-600">Interview</Badge>;
      case "Offered": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-600">Offered</Badge>;
      case "Hired": return <Badge variant="secondary" className="bg-emerald-600 text-white font-bold">Hired</Badge>;
      case "Rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase()) || a.position.toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return matchesSearch;
    return a.status.toLowerCase() === filter.toLowerCase() && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-500" /> Pengurusan Rekrutmen
          </h2>
          <p className="text-muted-foreground">Pantau calon pekerja dan pipeline pengambilan</p>
        </div>

        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Daftar Calon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daftar Calon Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Penuh</Label>
                  <Input placeholder="Ahmad Bin Ali" value={newApplicant.full_name} onChange={e => setNewApplicant({...newApplicant, full_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="ahmad@example.com" value={newApplicant.email} onChange={e => setNewApplicant({...newApplicant, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Telefon</Label>
                    <Input placeholder="0123456789" value={newApplicant.phone} onChange={e => setNewApplicant({...newApplicant, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Posisi Dipohon</Label>
                  <Select value={newApplicant.position} onValueChange={val => setNewApplicant({...newApplicant, position: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales Executive">Sales Executive</SelectItem>
                      <SelectItem value="Marketing Executive">Marketing Executive</SelectItem>
                      <SelectItem value="Operation Executive">Operation Executive</SelectItem>
                      <SelectItem value="Graphic Designer">Graphic Designer</SelectItem>
                      <SelectItem value="Content Creator">Content Creator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link CV (G-Drive/URL)</Label>
                  <Input placeholder="https://..." value={newApplicant.cv_url} onChange={e => setNewApplicant({...newApplicant, cv_url: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAddApplicant} className="bg-blue-600">Daftar Calon</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari calon..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["all", "Applied", "Screening", "Interview", "Offered", "Hired", "Rejected"].map(s => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>{s}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20">Memuatkan data...</div>
        ) : filteredApplicants.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada calon ditemui</p>
          </div>
        ) : (
          filteredApplicants.map(applicant => (
            <Card key={applicant.id} className="group hover:shadow-lg transition-all border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{applicant.full_name}</CardTitle>
                    <CardDescription>{applicant.position}</CardDescription>
                  </div>
                  {getStatusBadge(applicant.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" /> {applicant.email}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" /> {applicant.phone}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <a href={applicant.cv_url} target="_blank" rel="noreferrer">
                      <Paperclip className="w-3 h-3" /> Lihat CV
                    </a>
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <Label className="text-[10px] uppercase text-slate-400">Kemaskini Pipeline</Label>
                  <div className="flex gap-1 mt-1">
                    <Select onValueChange={val => handleUpdateStatus(applicant.id, val)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Pindah ke..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Screening">Screening</SelectItem>
                        <SelectItem value="Interview">Interview</SelectItem>
                        <SelectItem value="Offered">Offered</SelectItem>
                        <SelectItem value="Hired">Hired</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
