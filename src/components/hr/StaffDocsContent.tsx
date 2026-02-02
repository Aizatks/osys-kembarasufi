"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Search,
  Download,
  Trash2,
  Calendar,
  Tag,
  Upload,
  User,
  ShieldAlert,
  FileBadge,
  MoreVertical,
  ExternalLink
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StaffDocument {
  id: string;
  staff_id: string;
  doc_type: string;
  title: string;
  file_url: string;
  issued_at: string;
  tags?: string[];
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

export function StaffDocsContent() {
  const { user, isAdmin } = useAuth();
  const [docs, setDocs] = useState<StaffDocument[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [newDoc, setNewDoc] = useState({
    staff_id: "",
    doc_type: "Offer Letter",
    title: "",
    file_url: "",
    issued_at: new Date().toISOString().split("T")[0],
    tags: ""
  });

  useEffect(() => {
    fetchDocs();
    if (isAdmin) fetchStaff();
  }, []);

  const fetchDocs = async () => {
    try {
      const url = isAdmin ? "/api/hr/staff-docs" : `/api/hr/staff-docs?staff_id=${user?.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!newDoc.staff_id || !newDoc.title || !newDoc.file_url) {
      toast.error("Sila isi semua maklumat dokumen");
      return;
    }

    try {
      const res = await fetch("/api/hr/staff-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDoc,
          tags: newDoc.tags.split(",").map(t => t.trim()).filter(t => t)
        })
      });

      if (res.ok) {
        toast.success("Dokumen berjaya disimpan");
        setIsUploadOpen(false);
        setNewDoc({ staff_id: "", doc_type: "Offer Letter", title: "", file_url: "", issued_at: new Date().toISOString().split("T")[0], tags: "" });
        fetchDocs();
      }
    } catch (err) {
      toast.error("Gagal menyimpan dokumen");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Adakah anda pasti mahu memadam dokumen ini?")) return;
    try {
      const res = await fetch(`/api/hr/staff-docs?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Dokumen dipadam");
        fetchDocs();
      }
    } catch (err) {
      toast.error("Gagal memadam dokumen");
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.doc_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileBadge className="w-6 h-6 text-indigo-500" /> Profil & Dokumen Staff
          </h2>
          <p className="text-muted-foreground">Urus surat tawaran, amaran, dan dokumen rasmi lain</p>
        </div>

        {isAdmin && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Tambah Dokumen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Dokumen Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pilih Staff</Label>
                  <Select 
                    value={newDoc.staff_id}
                    onValueChange={val => setNewDoc({...newDoc, staff_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jenis Dokumen</Label>
                    <Select 
                      value={newDoc.doc_type}
                      onValueChange={val => setNewDoc({...newDoc, doc_type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Offer Letter">Surat Tawaran</SelectItem>
                        <SelectItem value="Warning Letter">Surat Amaran</SelectItem>
                        <SelectItem value="Job Description">Job Description (JD)</SelectItem>
                        <SelectItem value="SOP">SOP Jawatan</SelectItem>
                        <SelectItem value="Appraisal">Penilaian (Appraisal)</SelectItem>
                        <SelectItem value="Other">Lain-lain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tarikh Dikeluarkan</Label>
                    <Input 
                      type="date" 
                      value={newDoc.issued_at}
                      onChange={e => setNewDoc({...newDoc, issued_at: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tajuk Dokumen</Label>
                  <Input 
                    placeholder="Contoh: Surat Tawaran - Ahmad" 
                    value={newDoc.title}
                    onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Dokumen (G-Drive/URL)</Label>
                  <Input 
                    placeholder="https://..." 
                    value={newDoc.file_url}
                    onChange={e => setNewDoc({...newDoc, file_url: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tag (Asingkan dengan koma)</Label>
                  <Input 
                    placeholder="HR, Confidential, Urgent" 
                    value={newDoc.tags}
                    onChange={e => setNewDoc({...newDoc, tags: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Batal</Button>
                <Button onClick={handleUpload} className="bg-indigo-600">Simpan Dokumen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Cari dokumen..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20">Memuatkan dokumen...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
            <FileBadge className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada dokumen rasmi ditemui</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    doc.doc_type === "Warning Letter" ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold">{doc.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-indigo-600">{doc.doc_type}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(doc.issued_at).toLocaleDateString("ms-MY")}</span>
                      {isAdmin && (
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <User className="w-3 h-3" /> {staffList.find(s => s.id === doc.staff_id)?.name || "Staff"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:flex gap-1">
                    {doc.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] py-0">{tag}</Badge>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.file_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
