"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Users,
  Upload,
  Zap,
  MoreVertical,
  History,
  Shield,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Play,
  Pause,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  Copy,
  ChevronDown,
  BarChart3,
  Timer,
  RefreshCw,
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
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { waUrl } from "@/lib/wa-client";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  staff_id: string;
  instance_staff_id: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  timezone: string;
  min_delay_ms: number;
  max_delay_ms: number;
  daily_limit: number;
  created_at: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  read_count: number;
  steps: any[];
}

interface WaSession {
  staff_id: string;
  staff_name: string;
  phone_number: string;
  status: string;
}

interface Step {
  message_type: string;
  message_text: string;
  media_url: string;
  delay_after_hours: number;
}

interface Recipient {
  phone_number: string;
  name: string;
}

const WIZARD_TABS = ["Tetapan", "Mesej", "Penerima", "Anti-Ban", "Semak & Hantar"];

export function BlastingContent() {
  const { user, token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    instance_staff_id: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
    timezone: "Asia/Kuala_Lumpur",
    min_delay_ms: 3000,
    max_delay_ms: 8000,
    daily_limit: 500,
  });

  const [steps, setSteps] = useState<Step[]>([
    { message_type: "text", message_text: "", media_url: "", delay_after_hours: 0 },
  ]);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientInput, setRecipientInput] = useState("");

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/blasting"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/monitoring"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchCampaigns();
    fetchSessions();
  }, [fetchCampaigns, fetchSessions]);

  const resetWizard = () => {
    setForm({
      name: "",
      description: "",
      instance_staff_id: "",
      scheduled_at: new Date().toISOString().slice(0, 16),
      timezone: "Asia/Kuala_Lumpur",
      min_delay_ms: 3000,
      max_delay_ms: 8000,
      daily_limit: 500,
    });
    setSteps([{ message_type: "text", message_text: "", media_url: "", delay_after_hours: 0 }]);
    setRecipients([]);
    setRecipientInput("");
    setWizardStep(0);
  };

  const handleCreateCampaign = async () => {
    if (!token) return;
    if (!form.name || !form.instance_staff_id) {
      toast.error("Sila isi nama kempen dan pilih WhatsApp instance");
      return;
    }
    if (steps.length === 0 || !steps[0].message_text) {
      toast.error("Sila tambah sekurang-kurangnya satu mesej");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Sila tambah penerima");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(waUrl("/api/whatsapp/blasting"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          steps,
          recipients: recipients.map(r => ({ phone_number: r.phone_number, name: r.name })),
        }),
      });

      if (res.ok) {
        toast.success("Kempen berjaya dicipta!");
        setShowWizard(false);
        resetWizard();
        fetchCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal mencipta kempen");
      }
    } catch {
      toast.error("Ralat rangkaian");
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: string) => {
    if (!token) return;
    try {
      const res = await fetch(waUrl(`/api/whatsapp/blasting/${campaignId}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(action === "start" ? "Kempen dimulakan!" : action === "pause" ? "Kempen dijeda" : "Kempen diteruskan");
        fetchCampaigns();
      }
    } catch {
      toast.error("Gagal");
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!token || !confirm("Padam kempen ini?")) return;
    try {
      await fetch(waUrl(`/api/whatsapp/blasting/${campaignId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Kempen dipadam");
      fetchCampaigns();
    } catch {}
  };

  const parseRecipients = (text: string) => {
    const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const newRecipients: Recipient[] = [];
    for (const line of lines) {
      const parts = line.split(/[\t|]/).map(p => p.trim());
      const phone = parts[0]?.replace(/\D/g, "");
      if (phone && phone.length >= 10) {
        newRecipients.push({ phone_number: phone, name: parts[1] || "" });
      }
    }
    return newRecipients;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseRecipients(text);
      setRecipients(prev => [...prev, ...parsed]);
      toast.success(`${parsed.length} penerima ditambah`);
    };
    reader.readAsText(file);
  };

  const filteredCampaigns = campaigns.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSentThisMonth = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failed_count, 0);
  const totalAll = campaigns.reduce((sum, c) => sum + c.total_recipients, 0);
  const successRate = totalAll > 0 ? ((totalAll - totalFailed) / totalAll * 100).toFixed(1) : "0";
  const failRate = totalAll > 0 ? (totalFailed / totalAll * 100).toFixed(1) : "0";

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-100 text-blue-700",
    running: "bg-amber-100 text-amber-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draf",
    scheduled: "Dijadualkan",
    running: "Berjalan",
    paused: "Dijeda",
    completed: "Selesai",
    failed: "Gagal",
  };

  if (showWizard) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setShowWizard(false); resetWizard(); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Kempen Blasting Baru</h2>
            <p className="text-xs text-muted-foreground">Reka bentuk kempen mesej automatik untuk kenalan anda</p>
          </div>
        </div>

        <div className="flex border-b">
          {WIZARD_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setWizardStep(i)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                wizardStep === i
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {wizardStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maklumat Asas</CardTitle>
              <CardDescription>Tetapkan nama, penerangan dan tarikh mula kempen anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  <span className="text-red-500">*</span> WhatsApp Instance
                </Label>
                <Select value={form.instance_staff_id} onValueChange={v => setForm(f => ({ ...f, instance_staff_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih instance" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.filter(s => s.status === "CONNECTED").map(s => (
                      <SelectItem key={s.staff_id} value={s.staff_id}>
                        {s.staff_name} ({s.phone_number || "Tiada nombor"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Pilih WhatsApp instance yang akan menghantar mesej kempen</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold"><span className="text-red-500">*</span> Nama Kempen</Label>
                <Input placeholder="cth. Welcome Series, Follow-up Sequence" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Penerangan</Label>
                <Textarea placeholder="Apakah kempen ini?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold"><span className="text-red-500">*</span> Tarikh & Masa Mula</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                  <p className="text-[10px] text-muted-foreground">Bila penerima didaftarkan, mesej pertama akan dijadualkan berdasarkan tarikh dan masa ini</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Zon Masa</Label>
                  <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Jakarta">Asia/Jakarta (UTC+7)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (UTC+8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Langkah Mesej</CardTitle>
                <CardDescription>Reka bentuk urutan mesej yang akan dihantar kepada penerima</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">Langkah {idx + 1}</Badge>
                      {steps.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSteps(s => s.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Jenis Mesej</Label>
                      <Select value={step.message_type} onValueChange={v => setSteps(s => s.map((st, i) => i === idx ? { ...st, message_type: v } : st))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Teks</SelectItem>
                          <SelectItem value="image">Gambar + Kapsyen</SelectItem>
                          <SelectItem value="video">Video + Kapsyen</SelectItem>
                          <SelectItem value="document">Dokumen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {step.message_type !== "text" && (
                      <div className="space-y-2">
                        <Label className="text-xs">URL Media</Label>
                        <Input placeholder="https://..." value={step.media_url} onChange={e => setSteps(s => s.map((st, i) => i === idx ? { ...st, media_url: e.target.value } : st))} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs">{step.message_type === "text" ? "Teks Mesej" : "Kapsyen"}</Label>
                      <Textarea
                        placeholder="Tulis mesej anda di sini... Gunakan {name} untuk nama penerima"
                        value={step.message_text}
                        onChange={e => setSteps(s => s.map((st, i) => i === idx ? { ...st, message_text: e.target.value } : st))}
                        rows={4}
                        className="font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-slate-100" onClick={() => {
                          setSteps(s => s.map((st, i) => i === idx ? { ...st, message_text: st.message_text + "{name}" } : st));
                        }}>
                          {"{ name }"}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-slate-100" onClick={() => {
                          setSteps(s => s.map((st, i) => i === idx ? { ...st, message_text: st.message_text + "{phone}" } : st));
                        }}>
                          {"{ phone }"}
                        </Badge>
                      </div>
                    </div>

                    {idx > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Jeda Selepas Langkah Sebelum (jam)</Label>
                        <Input type="number" min={0} value={step.delay_after_hours} onChange={e => setSteps(s => s.map((st, i) => i === idx ? { ...st, delay_after_hours: parseInt(e.target.value) || 0 } : st))} className="w-32" />
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={() => setSteps(s => [...s, { message_type: "text", message_text: "", media_url: "", delay_after_hours: 24 }])}
                >
                  <Plus className="w-3 h-3" /> Tambah Langkah
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {wizardStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penerima</CardTitle>
              <CardDescription>Tambah nombor telefon penerima kempen ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Muat Naik CSV/TXT
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                <p className="text-[10px] text-muted-foreground self-center">Format: satu nombor per baris, atau nombor|nama</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tambah Manual</Label>
                <Textarea
                  placeholder={"60123456789\n60198765432|Ahmad\n60111222333|Siti"}
                  value={recipientInput}
                  onChange={e => setRecipientInput(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    const parsed = parseRecipients(recipientInput);
                    if (parsed.length > 0) {
                      setRecipients(prev => [...prev, ...parsed]);
                      setRecipientInput("");
                      toast.success(`${parsed.length} penerima ditambah`);
                    } else {
                      toast.error("Tiada nombor sah dijumpai");
                    }
                  }}
                >
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>

              {recipients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{recipients.length} Penerima</Label>
                    <Button variant="ghost" size="sm" className="text-red-500 text-xs h-7" onClick={() => setRecipients([])}>
                      <Trash2 className="w-3 h-3 mr-1" /> Padam Semua
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">#</th>
                          <th className="text-left px-3 py-2 font-medium">Nombor</th>
                          <th className="text-left px-3 py-2 font-medium">Nama</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.slice(0, 100).map((r, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-mono">{r.phone_number}</td>
                            <td className="px-3 py-1.5">{r.name || "-"}</td>
                            <td className="px-1">
                              <button onClick={() => setRecipients(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {recipients.length > 100 && (
                      <p className="text-center text-[10px] text-slate-400 py-2">... dan {recipients.length - 100} lagi</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {wizardStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" /> Polisi Anti-Ban
              </CardTitle>
              <CardDescription>Tetapan untuk mengurangkan risiko akaun WhatsApp disekat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800">Amaran Penting</p>
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4">
                  <li>Jangan hantar lebih 500 mesej sehari bagi setiap nombor</li>
                  <li>Gunakan jeda rawak antara mesej untuk kelihatan semulajadi</li>
                  <li>Elakkan hantar mesej yang sama kepada semua penerima</li>
                  <li>Gunakan variable <code className="bg-amber-100 px-1 rounded">{"{name}"}</code> untuk personalisasi</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Jeda Minimum (ms)
                  </Label>
                  <Input
                    type="number"
                    min={1000}
                    value={form.min_delay_ms}
                    onChange={e => setForm(f => ({ ...f, min_delay_ms: parseInt(e.target.value) || 3000 }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Minimum: 1000ms (1 saat)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Jeda Maksimum (ms)
                  </Label>
                  <Input
                    type="number"
                    min={2000}
                    value={form.max_delay_ms}
                    onChange={e => setForm(f => ({ ...f, max_delay_ms: parseInt(e.target.value) || 8000 }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Cadangan: 5000-10000ms</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" /> Had Harian
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.daily_limit}
                    onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value) || 500 }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Max mesej sehari per nombor</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold">Simulasi Penghantaran</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{recipients.length}</p>
                    <p className="text-[10px] text-muted-foreground">Penerima</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {Math.ceil(recipients.length / (form.daily_limit || 500))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Hari Diperlukan</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">
                      ~{(((form.min_delay_ms + form.max_delay_ms) / 2 / 1000) * Math.min(recipients.length, form.daily_limit) / 60).toFixed(0)} min
                    </p>
                    <p className="text-[10px] text-muted-foreground">Masa Sehari</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Semak & Hantar</CardTitle>
              <CardDescription>Semak semula kempen anda sebelum menghantar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Nama Kempen</p>
                  <p className="text-sm font-semibold">{form.name || "-"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">WhatsApp Instance</p>
                  <p className="text-sm font-semibold">
                    {sessions.find(s => s.staff_id === form.instance_staff_id)?.staff_name || "-"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Penerima</p>
                  <p className="text-sm font-semibold">{recipients.length} orang</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Langkah Mesej</p>
                  <p className="text-sm font-semibold">{steps.length} langkah</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Had Harian</p>
                  <p className="text-sm font-semibold">{form.daily_limit} mesej/hari</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Jeda</p>
                  <p className="text-sm font-semibold">{(form.min_delay_ms / 1000).toFixed(1)}s - {(form.max_delay_ms / 1000).toFixed(1)}s</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold">Pratonton Mesej</p>
                {steps.map((step, idx) => (
                  <div key={idx} className="bg-[#efeae2] rounded-lg p-3">
                    <Badge variant="outline" className="text-[9px] mb-2">Langkah {idx + 1} - {step.message_type}</Badge>
                    <div className="bg-[#d9fdd3] rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-[13px] whitespace-pre-wrap">{step.message_text || "(kosong)"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => wizardStep > 0 ? setWizardStep(s => s - 1) : (setShowWizard(false), resetWizard())}
            className="gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> {wizardStep > 0 ? "Kembali" : "Batal"}
          </Button>
          <div className="flex gap-2">
            {wizardStep < WIZARD_TABS.length - 1 ? (
              <Button onClick={() => setWizardStep(s => s + 1)} className="gap-1 bg-amber-600 hover:bg-amber-700">
                Seterusnya <ArrowRight className="w-3 h-3" />
              </Button>
            ) : (
              <Button onClick={handleCreateCampaign} disabled={saving} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Cipta & Simpan Kempen
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> WhatsApp Blasting
          </h2>
          <p className="text-muted-foreground">Hantar mesej pukal kepada pelanggan dan lead</p>
        </div>
        <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => { resetWizard(); setShowWizard(true); }}>
          <Plus className="w-4 h-4" /> Kempen Blasting Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Jumlah Mesej Bulan Ini</CardDescription>
            <CardTitle className="text-2xl">{totalSentThisMonth.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-emerald-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-emerald-600">Kadar Berjaya</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">{successRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-rose-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-rose-600">Kadar Gagal</CardDescription>
            <CardTitle className="text-2xl text-rose-700">{failRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4" /> Rekod Kempen</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input
              placeholder="Cari kempen..."
              className="pl-8 h-8 text-xs w-48"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Memuatkan...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">Tiada kempen blasting ditemui</p>
              <p className="text-xs text-slate-400 mt-1">Klik &quot;Kempen Blasting Baru&quot; untuk bermula</p>
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const progress = campaign.total_recipients > 0
                ? Math.round((campaign.sent_count + campaign.failed_count) / campaign.total_recipients * 100)
                : 0;

              return (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <Send className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-sm truncate">{campaign.name}</p>
                            <Badge className={cn("text-[9px] shrink-0", statusColors[campaign.status] || "bg-slate-100")}>
                              {statusLabels[campaign.status] || campaign.status}
                            </Badge>
                          </div>
                          {campaign.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{campaign.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1.5">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {campaign.total_recipients} Penerima</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
                            {campaign.steps?.length > 0 && (
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {campaign.steps.length} langkah</span>
                            )}
                          </div>

                          {campaign.total_recipients > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                  <div className="bg-emerald-500 rounded-full h-1.5 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">{progress}%</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px]">
                                {campaign.sent_count > 0 && (
                                  <span className="text-emerald-600 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Dihantar: {campaign.sent_count}
                                  </span>
                                )}
                                {campaign.failed_count > 0 && (
                                  <span className="text-red-500 flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> Gagal: {campaign.failed_count}
                                  </span>
                                )}
                                {campaign.delivered_count > 0 && (
                                  <span className="text-blue-500">Diterima: {campaign.delivered_count}</span>
                                )}
                                {campaign.read_count > 0 && (
                                  <span className="text-purple-500">Dibaca: {campaign.read_count}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {campaign.status === "draft" && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => handleCampaignAction(campaign.id, "start")}>
                            <Play className="w-3 h-3" /> Mula
                          </Button>
                        )}
                        {campaign.status === "running" && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-orange-600" onClick={() => handleCampaignAction(campaign.id, "pause")}>
                            <Pause className="w-3 h-3" /> Jeda
                          </Button>
                        )}
                        {campaign.status === "paused" && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => handleCampaignAction(campaign.id, "resume")}>
                            <Play className="w-3 h-3" /> Teruskan
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteCampaign(campaign.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Card className="bg-slate-900 text-white border-none overflow-hidden relative">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h4 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> Polisi Anti-Ban</h4>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Sistem blasting Kembara Sufi menggunakan teknologi <b>Random Delay</b> dan <b>Human-like Typing Simulation</b> untuk mengurangkan risiko akaun WhatsApp disekat. Kami menasihatkan agar tidak menghantar lebih daripada 500 mesej sehari bagi setiap nombor.
              </p>
            </div>
            <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">Lihat Panduan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
