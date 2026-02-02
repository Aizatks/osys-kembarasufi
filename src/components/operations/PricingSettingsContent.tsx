"use client";

import { useState, useEffect } from "react";
import { 
  Tag, 
  Plus, 
  Search,
  Download,
  Settings,
  DollarSign,
  Info,
  CheckCircle2,
  RefreshCw,
  MoreVertical,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Loader2,
  X,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OptionalPlace {
  name: string;
  price: number;
}

interface PricingItem {
  id: string;
  package_id: string;
  base_price: number;
  visa_fee_malaysia: number;
  visa_fee_singapore: number;
  insurance_fee: number;
  tipping_fee: number;
  cwob_fee: number;
  cwb_fee: number;
  default_surcharge: number;
  optional_places: OptionalPlace[];
  effective_from: string;
}

export function PricingSettingsContent() {
  const { user, isAdmin } = useAuth();
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useManualPricing, setUseManualPricing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newPackage, setNewPackage] = useState({
    package_id: "",
    base_price: 0,
    visa_fee_malaysia: 0,
    visa_fee_singapore: 0,
    insurance_fee: 0,
    tipping_fee: 0,
    cwob_fee: 0,
    cwb_fee: 0,
    default_surcharge: 0,
    optional_places: [] as OptionalPlace[]
  });

  const [newOptional, setNewOptional] = useState({ name: "", price: 0 });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/packages/pricing");
      if (res.ok) {
        const data = await res.json();
        setPricing(data.pricing || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async (item: PricingItem) => {
    try {
      const res = await fetch("/api/packages/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });

      if (res.ok) {
        toast.success("Tetapan harga dikemaskini");
        fetchPricing();
      }
    } catch (err) {
      toast.error("Gagal mengemaskini harga");
    }
  };

  const handleAddPackage = async () => {
    if (!newPackage.package_id) {
      toast.error("Sila masukkan Nama Pakej");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/packages/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPackage)
      });

      if (res.ok) {
        toast.success("Pakej baru ditambah");
        setIsAddDialogOpen(false);
        setNewPackage({
          package_id: "",
          base_price: 0,
          visa_fee_malaysia: 0,
          visa_fee_singapore: 0,
          insurance_fee: 0,
          tipping_fee: 0,
          cwob_fee: 0,
          cwb_fee: 0,
          default_surcharge: 0,
          optional_places: []
        });
        fetchPricing();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menambah pakej");
      }
    } catch (err) {
      toast.error("Ralat sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOptionalToNew = () => {
    if (!newOptional.name) return;
    setNewPackage({
      ...newPackage,
      optional_places: [...newPackage.optional_places, newOptional]
    });
    setNewOptional({ name: "", price: 0 });
  };

  const removeOptionalFromNew = (index: number) => {
    const updated = [...newPackage.optional_places];
    updated.splice(index, 1);
    setNewPackage({ ...newPackage, optional_places: updated });
  };

  const addOptionalToItem = (item: PricingItem, name: string, price: number) => {
    if (!name) return;
    const updatedPlaces = [...(item.optional_places || []), { name, price }];
    item.optional_places = updatedPlaces;
    setPricing([...pricing]);
  };

  const removeOptionalFromItem = (item: PricingItem, index: number) => {
    const updatedPlaces = [...(item.optional_places || [])];
    updatedPlaces.splice(index, 1);
    item.optional_places = updatedPlaces;
    setPricing([...pricing]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Tag className="w-6 h-6 text-amber-500" /> Tetapan Harga Pakej
          </h2>
          <p className="text-muted-foreground">Urus harga asas, fee tambahan, surcharge, dan tempat optional secara manual</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pakej
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Pakej Harga Baru</DialogTitle>
                <DialogDescription>
                  Masukkan butiran harga untuk pakej baru. Harga ini akan digunakan jika Manual Mode diaktifkan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Pakej (ID)</Label>
                  <Input 
                    id="name" 
                    placeholder="Contoh: TURKEY 2026" 
                    value={newPackage.package_id}
                    onChange={e => setNewPackage({...newPackage, package_id: e.target.value.toUpperCase()})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="base">Harga Asas (RM)</Label>
                    <Input 
                      id="base" 
                      type="number" 
                      value={newPackage.base_price}
                      onChange={e => setNewPackage({...newPackage, base_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="surcharge">Default Surcharge (RM)</Label>
                    <Input 
                      id="surcharge" 
                      type="number" 
                      value={newPackage.default_surcharge}
                      onChange={e => setNewPackage({...newPackage, default_surcharge: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="visa_mal">Visa Malaysia (RM)</Label>
                    <Input 
                      id="visa_mal" 
                      type="number" 
                      value={newPackage.visa_fee_malaysia}
                      onChange={e => setNewPackage({...newPackage, visa_fee_malaysia: Number(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="visa_sin">Visa Singapore (RM)</Label>
                    <Input 
                      id="visa_sin" 
                      type="number" 
                      value={newPackage.visa_fee_singapore}
                      onChange={e => setNewPackage({...newPackage, visa_fee_singapore: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cwb">CWB (RM)</Label>
                    <Input 
                      id="cwb" 
                      type="number" 
                      value={newPackage.cwb_fee}
                      onChange={e => setNewPackage({...newPackage, cwb_fee: Number(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cwob">CWOB (RM)</Label>
                    <Input 
                      id="cwob" 
                      type="number" 
                      value={newPackage.cwob_fee}
                      onChange={e => setNewPackage({...newPackage, cwob_fee: Number(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="insurance">Insurans (RM)</Label>
                    <Input 
                      id="insurance" 
                      type="number" 
                      value={newPackage.insurance_fee}
                      onChange={e => setNewPackage({...newPackage, insurance_fee: Number(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tipping">Tipping (RM)</Label>
                    <Input 
                      id="tipping" 
                      type="number" 
                      value={newPackage.tipping_fee}
                      onChange={e => setNewPackage({...newPackage, tipping_fee: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label>Tempat Optional (Lawatan Pilihan)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nama tempat" 
                      value={newOptional.name}
                      onChange={e => setNewOptional({...newOptional, name: e.target.value})}
                    />
                    <Input 
                      type="number" 
                      className="w-24" 
                      placeholder="Harga" 
                      value={newOptional.price || ""}
                      onChange={e => setNewOptional({...newOptional, price: Number(e.target.value)})}
                    />
                    <Button type="button" size="icon" onClick={addOptionalToNew}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newPackage.optional_places.map((place, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1 py-1 pl-2 pr-1">
                        {place.name} (RM{place.price})
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeOptionalFromNew(idx)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
                <Button 
                  onClick={handleAddPackage} 
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Pakej
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="bg-slate-50 dark:bg-slate-800/50 p-2 flex items-center gap-3 border shadow-sm">
            <div className="flex items-center gap-2">
              <Label htmlFor="pricing-mode" className="text-[10px] font-bold uppercase text-slate-500">Manual Mode</Label>
              <Switch 
                id="pricing-mode" 
                checked={useManualPricing} 
                onCheckedChange={setUseManualPricing} 
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-slate-500">Memuatkan tetapan...</p>
          </div>
        ) : pricing.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50">
            <Tag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada tetapan harga manual. Sila tambah harga untuk pakej.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
            >
              Tambah Pakej Pertama
            </Button>
          </div>
        ) : (
          pricing.map(item => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                      {item.package_id.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg uppercase text-slate-900 dark:text-white">{item.package_id}</CardTitle>
                      <CardDescription className="text-[10px]">Terakhir dikemaskini: {new Date(item.effective_from).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdatePricing(item)}
                    className="hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Base Price</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.base_price} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.base_price = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Default Surcharge</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.default_surcharge} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.default_surcharge = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Visa Malaysia</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.visa_fee_malaysia} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.visa_fee_malaysia = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Visa Singapore</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.visa_fee_singapore} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.visa_fee_singapore = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">CWB</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.cwb_fee} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.cwb_fee = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">CWOB</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.cwob_fee} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.cwob_fee = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Insurans</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.insurance_fee} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.insurance_fee = Number(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Tipping</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">RM</span>
                      <Input 
                        defaultValue={item.tipping_fee} 
                        className="pl-8 h-8 text-sm font-medium" 
                        type="number" 
                        onChange={(e) => item.tipping_fee = Number(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase text-slate-500">Lawatan Pilihan (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(item.optional_places || []).map((place, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 group/item">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{place.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">RM {place.price}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover/item:opacity-100 text-red-500 hover:bg-red-50"
                          onClick={() => removeOptionalFromItem(item, idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300">
                          <Plus className="w-4 h-4 mr-1" /> Tambah Optional
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Tambah Lawatan Pilihan</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Nama Tempat</Label>
                            <Input id="opt-name" placeholder="cth: Cappadocia Hot Air Balloon" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Harga (RM)</Label>
                            <Input id="opt-price" type="number" defaultValue="0" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => {
                            const name = (document.getElementById('opt-name') as HTMLInputElement).value;
                            const price = Number((document.getElementById('opt-price') as HTMLInputElement).value);
                            addOptionalToItem(item, name, price);
                          }}>Tambah</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
