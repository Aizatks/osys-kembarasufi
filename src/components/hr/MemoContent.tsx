"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Paperclip, 
  Search,
  Users,
  Eye,
  MoreVertical,
  Filter
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

interface Memo {
  id: string;
  title: string;
  body: string;
  target_type: "COMPANY" | "DEPARTMENT" | "INDIVIDUAL";
  target_id?: string;
  attachments?: string[];
  created_at: string;
  hr_memo_acknowledgements?: { staff_id: string; acknowledged_at: string }[];
}

export function MemoContent() {
  const { user, isAdmin } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // New Memo Form
  const [newMemo, setNewMemo] = useState({
    title: "",
    body: "",
    target_type: "COMPANY",
    target_id: ""
  });

  useEffect(() => {
    fetchMemos();
  }, []);

  const fetchMemos = async () => {
    try {
      const res = await fetch(`/api/hr/memos?staff_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setMemos(data.memos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (memoId: string) => {
    try {
      const res = await fetch("/api/hr/memos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo_id: memoId, staff_id: user?.id })
      });
      if (res.ok) {
        toast.success("Memo diakui terima");
        fetchMemos();
      }
    } catch (err) {
      toast.error("Gagal mengesahkan memo");
    }
  };

  const handleCreateMemo = async () => {
    if (!newMemo.title || !newMemo.body) {
      toast.error("Sila isi tajuk dan kandungan memo");
      return;
    }

    try {
      const res = await fetch("/api/hr/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemo)
      });

      if (res.ok) {
        toast.success("Memo berjaya dicipta");
        setIsCreateOpen(false);
        setNewMemo({ title: "", body: "", target_type: "COMPANY", target_id: "" });
        fetchMemos();
      }
    } catch (err) {
      toast.error("Gagal mencipta memo");
    }
  };

  const filteredMemos = memos.filter(memo => {
    const isAck = memo.hr_memo_acknowledgements?.some(a => a.staff_id === user?.id);
    const matchesSearch = memo.title.toLowerCase().includes(search.toLowerCase()) || 
                          memo.body.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "unread") return !isAck && matchesSearch;
    if (filter === "read") return isAck && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" /> Memo Syarikat
          </h2>
          <p className="text-muted-foreground">Makluman terkini dan pengumuman rasmi</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Cipta Memo Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cipta Memo Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tajuk Memo</Label>
                  <Input 
                    placeholder="Contoh: Cuti Umum Hari Raya" 
                    value={newMemo.title}
                    onChange={e => setNewMemo({...newMemo, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kandungan</Label>
                  <Textarea 
                    placeholder="Tulis kandungan memo di sini..." 
                    rows={5}
                    value={newMemo.body}
                    onChange={e => setNewMemo({...newMemo, body: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sasaran</Label>
                    <Select 
                      value={newMemo.target_type}
                      onValueChange={val => setNewMemo({...newMemo, target_type: val as any})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih sasaran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPANY">Semua Staff</SelectItem>
                        <SelectItem value="DEPARTMENT">Jabatan Spesifik</SelectItem>
                        <SelectItem value="INDIVIDUAL">Individu Spesifik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Sasaran (Pilihan)</Label>
                    <Input 
                      placeholder="Contoh: HR / UUID Staff" 
                      value={newMemo.target_id}
                      onChange={e => setNewMemo({...newMemo, target_id: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                <Button onClick={handleCreateMemo} className="bg-blue-600">Terbitkan Memo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cari memo..." 
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            Semua
          </Button>
          <Button 
            variant={filter === "unread" ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setFilter("unread")}
            className={cn(filter === "unread" && "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200")}
          >
            Belum Baca
          </Button>
          <Button 
            variant={filter === "read" ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setFilter("read")}
            className={cn(filter === "read" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200")}
          >
            Selesai
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuatkan memo...</div>
        ) : filteredMemos.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada memo ditemui</p>
          </div>
        ) : (
          filteredMemos.map(memo => {
            const isAck = memo.hr_memo_acknowledgements?.some(a => a.staff_id === user?.id);
            return (
              <Card key={memo.id} className={cn(
                "overflow-hidden transition-all hover:shadow-md",
                !isAck && "border-l-4 border-l-rose-500"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{memo.title}</CardTitle>
                        {!isAck && <Badge variant="destructive" className="animate-pulse">Baru</Badge>}
                      </div>
                      <CardDescription className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(memo.created_at).toLocaleDateString("ms-MY")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {memo.target_type}</span>
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        <Eye className="w-3 h-3" /> {memo.hr_memo_acknowledgements?.length || 0} Acknowledged
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {memo.body}
                  </p>
                  
                  {memo.attachments && memo.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {memo.attachments.map((url, i) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs hover:bg-slate-200 transition-colors"
                        >
                          <Paperclip className="w-3 h-3" /> Lampiran {i+1}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-slate-500 italic">
                      {isAck ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Anda telah mengesahkan memo ini pada {new Date(memo.hr_memo_acknowledgements?.find(a => a.staff_id === user?.id)?.acknowledged_at!).toLocaleDateString()}
                        </span>
                      ) : (
                        "Sila baca dan sahkan penerimaan memo ini."
                      )}
                    </div>
                    {!isAck && (
                      <Button size="sm" onClick={() => handleAcknowledge(memo.id)} className="bg-emerald-600 hover:bg-emerald-700">
                        Sahkan Penerimaan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
