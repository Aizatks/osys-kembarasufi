"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";

export function MarketingSpendingForm({ 
  onSuccess, 
  initialData,
  trigger
}: { 
  onSuccess?: () => void;
  initialData?: any;
  trigger?: React.ReactNode;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    platform: "Meta Ads",
    is_tiktok_live: false,
    nama_pakej: "",
    amount: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        platform: initialData.platform,
        is_tiktok_live: initialData.is_tiktok_live,
        nama_pakej: initialData.nama_pakej,
        amount: initialData.amount.toString(),
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (open && token) {
      fetchPackages();
    }
  }, [open, token]);

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.data) {
        setPackages(result.data);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pakej || !formData.amount) {
      toast.error("Sila isi semua maklumat");
      return;
    }

    setLoading(true);
    try {
      const url = "/api/marketing-spending";
      const method = initialData ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          id: initialData?.id,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      toast.success(initialData ? "Data berjaya dikemaskini" : "Data perbelanjaan berjaya disimpan");
      setOpen(false);
      if (!initialData) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          platform: "Meta Ads",
          is_tiktok_live: false,
          nama_pakej: "",
          amount: "",
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Ralat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Isi Spending Marketing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Input Perbelanjaan Harian</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Tarikh</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select 
              value={formData.platform} 
              onValueChange={(v) => setFormData({ ...formData, platform: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.platform === "TikTok Ads" && (
            <div className="flex items-center space-x-2">
              <Switch
                id="tiktok-live"
                checked={formData.is_tiktok_live}
                onCheckedChange={(checked) => setFormData({ ...formData, is_tiktok_live: checked })}
              />
              <Label htmlFor="tiktok-live">TikTok Live Ads</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="package">Pakej</Label>
            <Select 
              value={formData.nama_pakej} 
              onValueChange={(v) => setFormData({ ...formData, nama_pakej: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Pakej" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Atau taip nama pakej baru..."
              value={formData.nama_pakej}
              onChange={(e) => setFormData({ ...formData, nama_pakej: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah Spending (RM)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simpan Data
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
