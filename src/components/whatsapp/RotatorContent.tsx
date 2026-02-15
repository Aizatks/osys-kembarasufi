"use client";

import { useState, useEffect } from "react";
import { 
  RefreshCw, 
  Plus, 
  Search,
  MoreVertical,
  Trash2,
  ExternalLink,
  Copy,
  Users,
  Settings,
  Shield,
  BarChart2,
  CheckCircle2,
  Link as LinkIcon
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
import { waUrl } from "@/lib/wa-client";
import { cn } from "@/lib/utils";

interface Rotator {
  id: string;
  name: string;
  slug: string;
  logic: "ROUND_ROBIN" | "WEIGHTED";
  pixel_id?: string;
  tiktok_pixel_id?: string;
  whatsapp_rotator_numbers: RotatorNumber[];
}

interface RotatorNumber {
  id: string;
  phone_number: string;
  name: string;
  weight: number;
  is_active: boolean;
}

export function RotatorContent() {
  const { user, isAdmin } = useAuth();
  const [rotators, setRotators] = useState<Rotator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newRotator, setNewRotator] = useState({
    name: "",
    slug: "",
    logic: "ROUND_ROBIN"
  });

  useEffect(() => {
    fetchRotators();
  }, []);

  const fetchRotators = async () => {
    try {
      const res = await fetch(waUrl("/api/whatsapp/rotator"));
      if (res.ok) {
        const data = await res.json();
        setRotators(data.rotators || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRotator = async () => {
    if (!newRotator.name || !newRotator.slug) {
      toast.error("Sila isi nama dan slug");
      return;
    }

    try {
      const res = await fetch(waUrl("/api/whatsapp/rotator"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRotator)
      });

      if (res.ok) {
        toast.success("Rotator berjaya dicipta");
        setIsAddOpen(false);
        fetchRotators();
      }
    } catch (err) {
      toast.error("Gagal mencipta rotator");
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/inquiry/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link inquiry disalin!");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-emerald-500" /> WhatsApp Rotator
          </h2>
          <p className="text-muted-foreground">Agihkan lead WhatsApp kepada staff secara automatik</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Rotator Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cipta Link Rotator Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Rotator</Label>
                <Input placeholder="Contoh: Sales Team HQ" value={newRotator.name} onChange={e => setNewRotator({...newRotator, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md text-sm">
                  <span className="text-slate-400">/inquiry/</span>
                  <input 
                    className="bg-transparent border-none focus:ring-0 p-0 flex-1 font-medium" 
                    placeholder="promosi-raya" 
                    value={newRotator.slug}
                    onChange={e => setNewRotator({...newRotator, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logic Agihan</Label>
                <Select value={newRotator.logic} onValueChange={val => setNewRotator({...newRotator, logic: val as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUND_ROBIN">Round Robin (Giliran Adil)</SelectItem>
                    <SelectItem value="WEIGHTED">Weighted (Ikut Pemberat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button onClick={handleAddRotator} className="bg-emerald-600">Cipta Rotator</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20">Memuatkan rotator...</div>
        ) : rotators.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <RefreshCw className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada rotator ditemui</p>
          </div>
        ) : (
          rotators.map(rotator => (
            <Card key={rotator.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 md:w-1/3 bg-slate-50 dark:bg-slate-800/50 border-r">
                    <div className="space-y-4">
                      <div>
                        <CardTitle className="text-xl mb-1">{rotator.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px]">{rotator.logic}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500">Link Utama</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            readOnly 
                            value={`${window.location.origin}/inquiry/${rotator.slug}`} 
                            className="h-8 text-xs bg-white dark:bg-slate-900"
                          />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => copyLink(rotator.slug)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-4 pt-2">
                        <div className="text-center">
                          <p className="text-lg font-bold">0</p>
                          <p className="text-[9px] uppercase text-slate-500">Total Leads</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">{rotator.whatsapp_rotator_numbers.length}</p>
                          <p className="text-[9px] uppercase text-slate-500">Agents</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Senarai Ejen</h4>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Tambah Ejen</Button>
                    </div>
                    <div className="space-y-2">
                      {rotator.whatsapp_rotator_numbers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">Tiada ejen didaftarkan untuk rotator ini.</p>
                      ) : (
                        rotator.whatsapp_rotator_numbers.map(num => (
                          <div key={num.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-lg hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">{num.name.charAt(0)}</div>
                              <div>
                                <p className="text-sm font-medium">{num.name}</p>
                                <p className="text-[10px] text-slate-500">+{num.phone_number}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right mr-4">
                                <p className="text-xs font-bold">{num.weight}%</p>
                                <p className="text-[9px] text-slate-400 uppercase">Weight</p>
                              </div>
                              <Badge className={cn(num.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                {num.is_active ? "Active" : "Paused"}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
