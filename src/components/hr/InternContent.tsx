"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Search, Calendar, BookOpen, School,
  Clock, FileText, Trash2, Pencil, X, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchAuth, fetchJsonAuth } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";

interface Intern {
  id: string;
  full_name: string;
  university: string;
  course?: string;
  start_date?: string;
  end_date?: string;
  supervisor_id?: string;
  status: "Active" | "Completed" | "Terminated";
  evaluation_score?: number;
  remarks?: string;
  created_at: string;
}

const emptyForm = {
  full_name: "",
  university: "",
  course: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  status: "Active" as const,
};

// Defined OUTSIDE InternContent to prevent re-mount on every keystroke
function InternFormFields({ form, setForm }: { form: typeof emptyForm; setForm: (f: typeof emptyForm) => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label>Nama Penuh <span className="text-red-500">*</span></Label>
        <Input
          placeholder="Ali Bin Ahmad"
          value={form.full_name}
          onChange={e => setForm({ ...form, full_name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Universiti / Kolej <span className="text-red-500">*</span></Label>
        <Input
          placeholder="Universiti Malaya"
          value={form.university}
          onChange={e => setForm({ ...form, university: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Kursus / Pengajian</Label>
        <Input
          placeholder="Diploma Pemasaran"
          value={form.course}
          onChange={e => setForm({ ...form, course: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tarikh Mula</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Tarikh Tamat</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function InternContent() {
  const { isAdmin } = useAuth();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [setupSql, setSetupSql] = useState("");

  // Add dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit dialog
  const [editIntern, setEditIntern] = useState<Intern | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete dialog
  const [deleteIntern, setDeleteIntern] = useState<Intern | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth("/api/hr/interns");
      const data = await res.json();
      if (data.needsSetup) {
        setSetupNeeded(true);
        setSetupSql(data.setupSql || "");
        setInterns([]);
      } else if (res.ok) {
        setInterns(data.interns || []);
        setSetupNeeded(false);
      } else {
        // Column missing - fetch migration SQL
        const mRes = await fetchJsonAuth("/api/hr/interns/migrate", { method: "POST", body: JSON.stringify({}) });
        const mData = await mRes.json();
        if (mData.sql) { setSetupNeeded(true); setSetupSql(mData.sql); }
        toast.error(data.error || "Gagal memuatkan data");
        setInterns([]);
      }
    } catch (err) {
      console.error(err);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const checkMigration = async () => {
    try {
      const res = await fetchJsonAuth("/api/hr/interns/migrate", { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (data.sql) {
        setSetupSql(data.sql);
      }
    } catch {}
  };

  // ── ADD ──────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.full_name.trim() || !addForm.university.trim()) {
      toast.error("Nama penuh dan universiti wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchJsonAuth("/api/hr/interns", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Intern berjaya didaftarkan!");
        setIsAddOpen(false);
        setAddForm(emptyForm);
        fetchInterns();
      } else {
        if (data.needsSetup) {
          setSetupNeeded(true);
          setSetupSql(data.setupSql || "");
        } else if (data.error?.includes("column") || data.error?.includes("schema")) {
          // Column missing - get migration SQL
          const mRes = await fetchJsonAuth("/api/hr/interns/migrate", { method: "POST", body: JSON.stringify({}) });
          const mData = await mRes.json();
          if (mData.sql) { setSetupNeeded(true); setSetupSql(mData.sql); }
        }
        toast.error(data.error || "Gagal mendaftarkan intern");
      }
    } catch (err) {
      toast.error("Ralat sambungan. Sila cuba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── EDIT ─────────────────────────────────────────────
  const openEdit = (intern: Intern) => {
    setEditIntern(intern);
    setEditForm({
      full_name: intern.full_name,
      university: intern.university,
      course: intern.course || "",
      start_date: intern.start_date || new Date().toISOString().split("T")[0],
      end_date: intern.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: intern.status,
    });
  };

  const handleEdit = async () => {
    if (!editIntern) return;
    if (!editForm.full_name.trim() || !editForm.university.trim()) {
      toast.error("Nama penuh dan universiti wajib diisi");
      return;
    }
    setIsEditSubmitting(true);
    try {
      const res = await fetchJsonAuth("/api/hr/interns", {
        method: "PATCH",
        body: JSON.stringify({ id: editIntern.id, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Rekod intern berjaya dikemaskini!");
        setEditIntern(null);
        fetchInterns();
      } else {
        toast.error(data.error || "Gagal mengemaskini rekod");
      }
    } catch (err) {
      toast.error("Ralat sambungan. Sila cuba lagi.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ── DELETE ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteIntern) return;
    setIsDeleting(true);
    try {
      const res = await fetchAuth(`/api/hr/interns?id=${deleteIntern.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Rekod intern berjaya dipadam");
        setDeleteIntern(null);
        fetchInterns();
      } else {
        toast.error(data.error || "Gagal memadam rekod");
      }
    } catch (err) {
      toast.error("Ralat sambungan. Sila cuba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = interns.filter(i =>
    i.full_name.toLowerCase().includes(search.toLowerCase()) ||
    i.university.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) =>
    s === "Active" ? "bg-emerald-100 text-emerald-700" :
    s === "Completed" ? "bg-blue-100 text-blue-700" :
    "bg-red-100 text-red-700";

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">

      {/* Setup / Migration Notice */}
      {setupNeeded && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Kemaskini diperlukan pada database</p>
              <p className="text-sm text-amber-700 mt-1">
                Sila pergi ke <strong>Supabase → SQL Editor</strong>, tampal dan jalankan SQL berikut, kemudian klik "Cuba Semula":
              </p>
            </div>
          </div>
          <pre className="bg-white border border-amber-200 rounded p-3 text-xs overflow-auto text-slate-700 mt-2 max-h-48">{setupSql}</pre>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={fetchInterns}>
              Cuba Semula Selepas Setup
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-slate-500"
              onClick={() => { navigator.clipboard.writeText(setupSql); toast.success("SQL disalin!"); }}>
              Salin SQL
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" /> Profil Intern (Pelatih)
          </h2>
          <p className="text-muted-foreground">Urus maklumat pelatih industri dan penilaian prestasi</p>
        </div>
        {isAdmin && (
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4" /> Tambah Intern
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cari intern..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-20 text-slate-400">Memuatkan data...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada intern ditemui</p>
          </div>
        ) : (
          filtered.map(intern => (
            <Card key={intern.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <CardTitle className="text-base leading-tight">{intern.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <School className="w-3 h-3" /> {intern.university}
                    </CardDescription>
                  </div>
                  <Badge className={cn("text-xs shrink-0", statusColor(intern.status))} variant="outline">
                    {intern.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {intern.course && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" /> {intern.course}
                  </div>
                )}
                {(intern.start_date || intern.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {intern.start_date ? new Date(intern.start_date).toLocaleDateString("ms-MY") : "?"} –{" "}
                    {intern.end_date ? new Date(intern.end_date).toLocaleDateString("ms-MY") : "?"}
                  </div>
                )}

                {intern.evaluation_score !== undefined && intern.evaluation_score !== null && (
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Skor Penilaian</span>
                      <span className="font-bold text-indigo-600">{intern.evaluation_score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${intern.evaluation_score}%` }} />
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex gap-1 border-t pt-3">
                    <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs">
                      <Clock className="w-3 h-3" /> Kehadiran
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs">
                      <FileText className="w-3 h-3" /> Tugasan
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="gap-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2"
                      onClick={() => openEdit(intern)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                      onClick={() => setDeleteIntern(intern)}
                      title="Padam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── ADD DIALOG ── */}
      <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) setAddForm(emptyForm); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Daftar Intern Baru</DialogTitle>
          </DialogHeader>
          <InternFormFields form={addForm} setForm={setAddForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Batal</Button>
            <Button onClick={handleAdd} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? "Mendaftarkan..." : "Daftar Intern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editIntern} onOpenChange={open => { if (!open) setEditIntern(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rekod Intern</DialogTitle>
          </DialogHeader>
          <InternFormFields form={editForm} setForm={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIntern(null)} disabled={isEditSubmitting}>Batal</Button>
            <Button onClick={handleEdit} disabled={isEditSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ── */}
      <Dialog open={!!deleteIntern} onOpenChange={open => { if (!open) setDeleteIntern(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Padam Rekod Intern
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Adakah anda pasti ingin memadam rekod <strong>{deleteIntern?.full_name}</strong>? Tindakan ini tidak boleh dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteIntern(null)} disabled={isDeleting}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Memadamkan..." : "Ya, Padam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
