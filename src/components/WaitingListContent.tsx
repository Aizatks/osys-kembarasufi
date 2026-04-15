"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PackageSelect } from "@/components/PackageSelect";
import { Clock, Plus, Pencil, Trash2, Loader2, MessageCircle, Phone, X, Package } from "lucide-react";
import { toast } from "sonner";

interface Trip {
  id?: string;
  nama_pakej: string;
  tarikh_requested: string;
  remark: string;
  status: string;
}

interface WaitingListEntry {
  id: string;
  customer_name: string;
  no_phone: string;
  lead_id?: string;
  staff_id?: string;
  staff?: { id: string; name: string };
  trips: Trip[];
  created_at: string;
  updated_at: string;
}

interface Staff {
  id: string;
  name: string;
  status?: string;
  is_sales?: boolean;
}

function formatWhatsAppUrl(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("0")) cleaned = "60" + cleaned.slice(1);
  if (!cleaned.startsWith("60")) cleaned = "60" + cleaned;
  return `https://wa.me/${cleaned}`;
}

const TRIP_STATUS_OPTIONS = ["pending", "confirmed", "cancelled"];

export function WaitingListContent() {
  const { user, isAdmin, hasPermission } = useAuth();
  const canViewAll = hasPermission("view-all-staff", isAdmin);
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitingListEntry | null>(null);

  const [formData, setFormData] = useState({
    customer_name: "",
    no_phone: "",
    trips: [{ nama_pakej: "", tarikh_requested: "", remark: "", status: "pending" }] as Trip[],
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = "/api/waiting-list";
      if (!canViewAll) {
        url += `?staff_id=${user?.id}`;
      } else if (selectedStaff !== "all") {
        url += `?staff_id=${selectedStaff}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setEntries(data.data);
      }
    } catch {
      toast.error("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
  }, [user?.id, canViewAll, selectedStaff]);

  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/staff", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.staff) {
        setStaffList(data.staff.filter((s: Staff) => s.status === "approved"));
      }
    } catch {
      console.error("Failed to fetch staff list");
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      customer_name: "",
      no_phone: "",
      trips: [{ nama_pakej: "", tarikh_requested: "", remark: "", status: "pending" }],
    });
  };

  const openEditDialog = (entry: WaitingListEntry) => {
    setEditingEntry(entry);
    setFormData({
      customer_name: entry.customer_name || "",
      no_phone: entry.no_phone || "",
      trips: entry.trips.length > 0
        ? entry.trips.map((t) => ({
            nama_pakej: t.nama_pakej,
            tarikh_requested: t.tarikh_requested || "",
            remark: t.remark || "",
            status: t.status || "pending",
          }))
        : [{ nama_pakej: "", tarikh_requested: "", remark: "", status: "pending" }],
    });
    setIsDialogOpen(true);
  };

  const addTrip = () => {
    setFormData({
      ...formData,
      trips: [...formData.trips, { nama_pakej: "", tarikh_requested: "", remark: "", status: "pending" }],
    });
  };

  const removeTrip = (idx: number) => {
    if (formData.trips.length <= 1) return;
    setFormData({
      ...formData,
      trips: formData.trips.filter((_, i) => i !== idx),
    });
  };

  const updateTrip = (idx: number, field: keyof Trip, value: string) => {
    const updated = [...formData.trips];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, trips: updated });
  };

  const handleSubmit = async () => {
    if (!formData.customer_name && !formData.no_phone) {
      toast.error("Sila masukkan nama atau nombor telefon");
      return;
    }

    const validTrips = formData.trips.filter((t) => t.nama_pakej);
    if (validTrips.length === 0) {
      toast.error("Sila masukkan sekurang-kurangnya satu pakej");
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const method = editingEntry ? "PUT" : "POST";
      const body = editingEntry
        ? { id: editingEntry.id, ...formData, trips: validTrips }
        : { ...formData, trips: validTrips };

      const res = await fetch("/api/waiting-list", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingEntry ? "Rekod dikemaskini" : "Rekod ditambah");
        setIsDialogOpen(false);
        resetForm();
        fetchEntries();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menyimpan");
      }
    } catch {
      toast.error("Ralat berlaku");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Padam rekod ini?")) return;
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/waiting-list?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Rekod dipadam");
        fetchEntries();
      } else {
        toast.error("Gagal memadam");
      }
    } catch {
      toast.error("Ralat berlaku");
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.customer_name?.toLowerCase().includes(q) ||
      e.no_phone?.toLowerCase().includes(q) ||
      e.trips.some((t) => t.nama_pakej?.toLowerCase().includes(q) || t.remark?.toLowerCase().includes(q))
    );
  });

  const totalTrips = filteredEntries.reduce((sum, e) => sum + e.trips.length, 0);
  const pendingTrips = filteredEntries.reduce(
    (sum, e) => sum + e.trips.filter((t) => t.status === "pending").length,
    0
  );
  const confirmedTrips = filteredEntries.reduce(
    (sum, e) => sum + e.trips.filter((t) => t.status === "confirmed").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Waiting List
          </h2>
          <p className="text-sm text-muted-foreground">
            Senarai pelanggan yang menunggu tarikh trip dibuka
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {canViewAll && (
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Pilih Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Staff</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative">
            <Input
              placeholder="Cari nama, phone, pakej..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[220px] pl-3"
            />
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Edit Waiting List" : "Tambah ke Waiting List"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Pelanggan</Label>
                    <Input
                      placeholder="Nama pelanggan"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Telefon</Label>
                    <Input
                      placeholder="60123456789"
                      value={formData.no_phone}
                      onChange={(e) => setFormData({ ...formData, no_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Trip yang Diminati</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTrip}>
                      <Plus className="w-3 h-3 mr-1" /> Tambah Trip
                    </Button>
                  </div>

                  {formData.trips.map((trip, idx) => (
                    <Card key={idx} className="relative">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Trip #{idx + 1}
                          </span>
                          {formData.trips.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                              onClick={() => removeTrip(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Pakej</Label>
                          <PackageSelect
                            value={trip.nama_pakej}
                            onChange={(v) => updateTrip(idx, "nama_pakej", v)}
                            placeholder="Pilih pakej..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Tarikh Diminta</Label>
                            <Input
                              placeholder="cth: Jun 2026 / bila-bila"
                              value={trip.tarikh_requested}
                              onChange={(e) => updateTrip(idx, "tarikh_requested", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={trip.status}
                              onValueChange={(v) => updateTrip(idx, "status", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TRIP_STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s === "pending" ? "Menunggu" : s === "confirmed" ? "Disahkan" : "Dibatalkan"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Catatan</Label>
                          <Input
                            placeholder="Catatan tambahan..."
                            value={trip.remark}
                            onChange={(e) => updateTrip(idx, "remark", e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700">
                  {editingEntry ? "Kemaskini" : "Simpan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Jumlah Pelanggan</p>
                <p className="text-2xl font-bold">{filteredEntries.length}</p>
              </div>
              <Clock className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Jumlah Trip</p>
                <p className="text-2xl font-bold">{totalTrips}</p>
              </div>
              <Package className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Menunggu</p>
                <p className="text-2xl font-bold">{pendingTrips}</p>
              </div>
              <Clock className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Disahkan</p>
                <p className="text-2xl font-bold">{confirmedTrips}</p>
              </div>
              <Phone className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="w-12 h-12 mb-4 opacity-20" />
              <p>{searchQuery ? "Tiada rekod yang sepadan" : "Tiada pelanggan dalam waiting list"}</p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg truncate">
                        {entry.customer_name || "Pelanggan"}
                      </h3>
                      {entry.staff && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                          {entry.staff.name}
                        </span>
                      )}
                    </div>

                    {entry.no_phone && (
                      <a
                        href={formatWhatsAppUrl(entry.no_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors text-sm font-medium mb-3"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {entry.no_phone}
                      </a>
                    )}

                    {/* Trips */}
                    <div className="space-y-2 mt-3">
                      {entry.trips.map((trip, idx) => (
                        <div
                          key={trip.id || idx}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border"
                        >
                          <Package className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {trip.nama_pakej}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  trip.status === "confirmed"
                                    ? "bg-green-100 text-green-700"
                                    : trip.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {trip.status === "pending"
                                  ? "Menunggu"
                                  : trip.status === "confirmed"
                                  ? "Disahkan"
                                  : "Dibatalkan"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {trip.tarikh_requested && (
                                <span>Tarikh: {trip.tarikh_requested}</span>
                              )}
                              {trip.remark && <span>• {trip.remark}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {entry.trips.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Tiada trip ditambah</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(entry)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>
                    Ditambah: {new Date(entry.created_at).toLocaleDateString("ms-MY")}
                  </span>
                  {entry.updated_at !== entry.created_at && (
                    <span>
                      • Dikemaskini: {new Date(entry.updated_at).toLocaleDateString("ms-MY")}
                    </span>
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
