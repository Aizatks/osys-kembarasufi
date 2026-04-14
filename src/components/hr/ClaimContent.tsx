"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wallet, Plus, CheckCircle2, Clock, Paperclip, Search,
  DollarSign, XCircle, FileText, MoreVertical, Upload, X, Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchAuth, fetchJsonAuth, fetchUploadAuth } from "@/lib/fetch-utils";

interface Claim {
  id: string;
  staff_id: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  attachments?: string[];
  remarks?: string;
  created_at: string;
  hr_claim_actions?: any[];
}

export function ClaimContent() {
  const { user, isAdmin } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newClaim, setNewClaim] = useState({
    amount: "",
    category: "meal",
    date: new Date().toISOString().split("T")[0],
    remarks: ""
  });

  useEffect(() => { fetchClaims(); }, []);

  const fetchClaims = async () => {
    try {
      const url = isAdmin ? "/api/hr/claims" : `/api/hr/claims?staff_id=${user?.id}`;
      const res = await fetchAuth(url);
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "claims");

        const res = await fetchUploadAuth("/api/hr/upload", formData);
        if (res.ok) {
          const data = await res.json();
          setAttachmentUrls(prev => [...prev, data.url]);
        } else {
          const err = await res.json();
          toast.error(err.error || "Gagal upload");
        }
      }
    } catch {
      toast.error("Gagal upload fail");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachmentUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitClaim = async () => {
    if (!newClaim.amount || !newClaim.date) {
      toast.error("Sila isi amaun dan tarikh tuntutan");
      return;
    }
    try {
      const res = await fetchJsonAuth("/api/hr/claims", {
        method: "POST",
        body: JSON.stringify({
          ...newClaim,
          staff_id: user?.id,
          amount: parseFloat(newClaim.amount),
          attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
        })
      });
      if (res.ok) {
        toast.success("Tuntutan berjaya dihantar");
        setIsSubmitOpen(false);
        setNewClaim({ amount: "", category: "meal", date: new Date().toISOString().split("T")[0], remarks: "" });
        setAttachmentUrls([]);
        fetchClaims();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menghantar tuntutan");
      }
    } catch {
      toast.error("Gagal menghantar tuntutan");
    }
  };

  const handleAction = async (claimId: string, action: "APPROVE" | "REJECT" | "PAY", note: string = "") => {
    try {
      const res = await fetchJsonAuth("/api/hr/claims", {
        method: "PATCH",
        body: JSON.stringify({ claim_id: claimId, action_by: user?.id, action, note })
      });
      if (res.ok) {
        toast.success(`Tuntutan berjaya di${action === "APPROVE" ? "lulus" : action === "REJECT" ? "tolak" : "bayar"}kan`);
        fetchClaims();
      }
    } catch {
      toast.error("Gagal mengemaskini status tuntutan");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge variant="secondary" className="bg-slate-100 text-slate-600">Dihantar</Badge>;
      case "approved": return <Badge variant="secondary" className="bg-blue-100 text-blue-600">Diluluskan</Badge>;
      case "paid": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 font-bold">Dibayar</Badge>;
      case "rejected": return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredClaims = claims.filter(c => filter === "all" || c.status.toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" /> Tuntutan (Claim)
          </h2>
          <p className="text-muted-foreground">Urus tuntutan perjalanan, makan, dan lain-lain</p>
        </div>

        <Dialog open={isSubmitOpen} onOpenChange={(open) => { setIsSubmitOpen(open); if (!open) setAttachmentUrls([]); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4" /> Tuntutan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hantar Tuntutan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={newClaim.category} onValueChange={val => setNewClaim({...newClaim, category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meal">Makan (Meal)</SelectItem>
                      <SelectItem value="travel">Perjalanan (Travel)</SelectItem>
                      <SelectItem value="parking">Parking/Tol</SelectItem>
                      <SelectItem value="accommodation">Penginapan</SelectItem>
                      <SelectItem value="other">Lain-lain / Perubatan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tarikh</Label>
                  <Input type="date" value={newClaim.date} onChange={e => setNewClaim({...newClaim, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amaun (RM)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="number" placeholder="0.00" className="pl-10" value={newClaim.amount} onChange={e => setNewClaim({...newClaim, amount: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catatan / Remarks</Label>
                <Textarea placeholder="Terangkan tujuan tuntutan..." value={newClaim.remarks} onChange={e => setNewClaim({...newClaim, remarks: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Resit / Lampiran</Label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" multiple className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {uploading ? (
                    <p className="text-sm text-blue-500">Memuat naik...</p>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs text-slate-500">Klik untuk upload resit (PDF/JPG/PNG) — maks 10MB</p>
                    </>
                  )}
                </div>
                {attachmentUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {attachmentUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <div className="w-16 h-16 border rounded overflow-hidden">
                          {url.match(/\.(pdf)$/i) ? (
                            <div className="w-full h-full flex items-center justify-center bg-red-50"><FileText className="w-6 h-6 text-red-500" /></div>
                          ) : (
                            <img src={url} className="w-full h-full object-cover" alt="Attachment" />
                          )}
                        </div>
                        <button onClick={() => removeAttachment(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>Batal</Button>
              <Button onClick={handleSubmitClaim} className="bg-amber-600" disabled={uploading}>Hantar Tuntutan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Semua</Button>
        <Button variant={filter === "submitted" ? "secondary" : "outline"} size="sm" onClick={() => setFilter("submitted")}>Dihantar</Button>
        <Button variant={filter === "approved" ? "secondary" : "outline"} size="sm" onClick={() => setFilter("approved")}>Diluluskan</Button>
        <Button variant={filter === "paid" ? "secondary" : "outline"} size="sm" onClick={() => setFilter("paid")}>Dibayar</Button>
        <Button variant={filter === "rejected" ? "secondary" : "outline"} size="sm" onClick={() => setFilter("rejected")}>Ditolak</Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20">Memuatkan tuntutan...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
            <Wallet className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada rekod tuntutan ditemui</p>
          </div>
        ) : (
          filteredClaims.map(claim => (
            <Card key={claim.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">RM {claim.amount.toFixed(2)}</p>
                      {getStatusBadge(claim.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{claim.category}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(claim.date).toLocaleDateString("ms-MY")}</span>
                      {claim.attachments && claim.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-500"><Paperclip className="w-3 h-3" />{claim.attachments.length} lampiran</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && claim.status === "submitted" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-rose-600" onClick={() => handleAction(claim.id, "REJECT")}>Tolak</Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleAction(claim.id, "APPROVE")}>Lulus</Button>
                    </div>
                  )}
                  {isAdmin && claim.status === "approved" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(claim.id, "PAY")}>Mark Paid</Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Butiran Tuntutan</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-slate-500">Tarikh</p><p className="font-medium">{new Date(claim.date).toLocaleDateString("ms-MY")}</p></div>
                          <div><p className="text-slate-500">Kategori</p><p className="font-medium">{claim.category}</p></div>
                        </div>
                        <div><p className="text-slate-500 text-sm">Remarks</p><p className="text-sm italic">"{claim.remarks || "Tiada nota"}"</p></div>
                        {claim.attachments && claim.attachments.length > 0 && (
                          <div>
                            <p className="text-slate-500 text-sm mb-2">Lampiran Resit</p>
                            <div className="flex gap-2 flex-wrap">
                              {claim.attachments.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 border rounded overflow-hidden">
                                  {url.match(/\.pdf$/i) ? (
                                    <div className="w-full h-full flex items-center justify-center bg-red-50"><FileText className="w-8 h-8 text-red-500" /></div>
                                  ) : (
                                    <img src={url} className="w-full h-full object-cover" alt="Receipt" />
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
