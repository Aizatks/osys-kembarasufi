"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, TrendingUp, DollarSign, Users, Upload, Download, Calendar, FileSpreadsheet, FileText, CheckSquare, X, ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface SalesReport {
  id: string;
  bulan: string;
  no_phone: string;
  nama_pakej: string;
  date_closed: string;
  tarikh_trip: string;
  jumlah_pax: number;
  harga_pakej: number;
  amount_others: number;
  discount: number;
  total: number;
  paid: number;
  status_bayaran: string;
  status_peserta: string;
  nama_wakil_peserta: string;
  remark: string;
  staff?: { id: string; name: string };
}

interface Staff {
  id: string;
  name: string;
}

type SortField = "no_phone" | "nama_pakej" | "date_closed" | "tarikh_trip" | "jumlah_pax" | "total" | "paid" | "status_bayaran" | "nama_wakil_peserta" | "staff";
type SortDirection = "asc" | "desc" | null;

const ALLOWED_STAFF_NAMES = [
  "Hazirah", "Haini", "Farah", "Ammar", 
  "Alieya", "Airienna", "Sarah", "Diyana"
];

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

const STATUS_BAYARAN = ["Deposit", "Full Payment", "Pending", "Cancelled"];
const STATUS_PESERTA = ["BARU", "LAMA/REPEAT"];

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0]
  };
}

export function SalesReportTab() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editingReport, setEditingReport] = useState<SalesReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>("");
  const [bulkEditValue, setBulkEditValue] = useState<string>("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [importData, setImportData] = useState({
    staffId: "",
    sheetId: "",
    salesGid: "",
    type: "sales",
    importMethod: "sheet" as "sheet" | "file"
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    bulan: MONTHS[new Date().getMonth()],
    no_phone: "",
    nama_pakej: "",
    date_closed: new Date().toISOString().split("T")[0],
    tarikh_trip: "",
    jumlah_pax: 0,
    harga_pakej: 0,
    amount_others: 0,
    discount: 0,
    total: 0,
    paid: 0,
    status_bayaran: "Deposit",
    status_peserta: "BARU",
    nama_wakil_peserta: "",
    remark: "",
  });

  useEffect(() => {
    fetchStaffList();
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [dateRange.from, dateRange.to, selectedStaff]);

  useEffect(() => {
    const total = (formData.jumlah_pax * formData.harga_pakej) + formData.amount_others - formData.discount;
    setFormData(prev => ({ ...prev, total: Math.max(0, total) }));
  }, [formData.jumlah_pax, formData.harga_pakej, formData.amount_others, formData.discount]);

  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/staff", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.staff) {
        const filteredStaff = data.staff.filter((s: Staff) => 
          ALLOWED_STAFF_NAMES.some(name => 
            s.name.toLowerCase().includes(name.toLowerCase())
          )
        );
        setStaffList(filteredStaff);
      }
    } catch (error) {
      console.error("Failed to fetch staff list");
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = `/api/sales-reports?date_from=${dateRange.from}&date_to=${dateRange.to}`;
      if ((user?.role === "superadmin" || user?.role === "admin") && !user?.impersonatedBy && selectedStaff !== "all") {
        url += `&staff_id=${selectedStaff}`;
      }
      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
        }
      });
      const data = await res.json();
      if (data.data) {
        setReports(data.data);
      }
    } catch (error) {
      toast.error("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    let result = reports;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.nama_pakej?.toLowerCase().includes(query) ||
        r.no_phone?.toLowerCase().includes(query) ||
        r.nama_wakil_peserta?.toLowerCase().includes(query) ||
        r.remark?.toLowerCase().includes(query) ||
        r.staff?.name?.toLowerCase().includes(query)
      );
    }
    
    if (filterStatus !== "all") {
      result = result.filter(r => r.status_bayaran === filterStatus);
    }
    
    return result;
  }, [reports, searchQuery, filterStatus]);

    const handleExport = async () => {
      setExportLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/export-requests", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            report_type: "sales",
            date_from: dateRange.from,
            date_to: dateRange.to,
            staff_id: selectedStaff,
          }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          if (data.approved) {
            downloadCSV(data.data, "sales_report");
            toast.success("Export berjaya!");
          } else {
            toast.success(data.message);
          }
          setIsExportDialogOpen(false);
        } else {
          toast.error(data.error || "Export gagal");
        }
      } catch (error) {
        toast.error("Ralat semasa export");
      } finally {
        setExportLoading(false);
      }
    };


  const downloadCSV = (data: SalesReport[], filename: string) => {
    const headers = [
      "No. Phone", "Nama Pakej", "Date Closed", "Tarikh Trip", 
      "Jumlah Pax", "Harga Pakej", "Amount Others", "Discount",
      "Total", "Paid", "Status Bayaran", "Status Peserta", 
      "Nama Wakil Peserta", "Remark", "Staff"
    ];
    
    const rows = data.map(r => [
      r.no_phone || "",
      r.nama_pakej || "",
      r.date_closed || "",
      r.tarikh_trip || "",
      r.jumlah_pax || 0,
      r.harga_pakej || 0,
      r.amount_others || 0,
      r.discount || 0,
      r.total || 0,
      r.paid || 0,
      r.status_bayaran || "",
      r.status_peserta || "",
      r.nama_wakil_peserta || "",
      r.remark || "",
      r.staff?.name || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${dateRange.from}_${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    const staffIdToUse = user?.role === "superadmin" ? importData.staffId : user?.id;
    
    if (!staffIdToUse) {
      toast.error("Staff ID tidak ditemui");
      return;
    }
    
    setImportLoading(true);
    try {
      if (importData.importMethod === "file" && importFile) {
        const formDataObj = new FormData();
        formDataObj.append("file", importFile);
        formDataObj.append("staffId", staffIdToUse);
        formDataObj.append("type", importData.type);
        
        const res = await fetch("/api/import-reports", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formDataObj,
        });
        
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message);
          setIsImportDialogOpen(false);
          setImportFile(null);
          fetchReports();
        } else {
          toast.error(data.error || "Import gagal");
        }
      } else {
        const res = await fetch("/api/import-reports", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            type: importData.type,
            staffId: staffIdToUse,
            sheetId: importData.sheetId || undefined,
            salesGid: importData.salesGid || undefined,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success(data.message);
          setIsImportDialogOpen(false);
          fetchReports();
        } else {
          toast.error(data.error || "Import gagal");
        }
      }
    } catch (error) {
      toast.error("Ralat semasa import");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const method = editingReport ? "PUT" : "POST";
      const body = editingReport ? { ...formData, id: editingReport.id } : formData;
      
      const res = await fetch("/api/sales-reports", {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        toast.success(editingReport ? "Rekod dikemaskini" : "Rekod ditambah");
        setIsDialogOpen(false);
        resetForm();
        fetchReports();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menyimpan");
      }
    } catch (error) {
      toast.error("Ralat berlaku");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/sales-reports?id=${id}`, { 
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Rekod dipadam");
        fetchReports();
      }
    } catch (error) {
      toast.error("Gagal memadam");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const allIds = Array.from(selectedIds);
      const BATCH_SIZE = 1000;
      let totalDeleted = 0;
      
      toast.info(`Memadam ${allIds.length} rekod... Sila tunggu`);
      
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        
        const res = await fetch(`/api/sales-reports`, { 
          method: "DELETE",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ids: batchIds }),
        });
        
        if (res.ok) {
          const data = await res.json();
          totalDeleted += data.deleted || batchIds.length;
        } else {
          const err = await res.json();
          toast.error(err.error || `Gagal memadam batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }
        
        if (allIds.length > BATCH_SIZE) {
          const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / allIds.length) * 100));
          toast.info(`Progress: ${progress}%`, { id: "bulk-delete-progress" });
        }
      }
      
      toast.dismiss("bulk-delete-progress");
      toast.success(`${totalDeleted} rekod berjaya dipadam`);
      setSelectedIds(new Set());
      fetchReports();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.error("Timeout - Cuba padam dalam batch yang lebih kecil");
      } else {
        toast.error("Ralat semasa memadam");
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.size === 0 || !bulkEditField || !bulkEditValue) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const updates = Array.from(selectedIds).map(id => ({
        id,
        [bulkEditField]: bulkEditField.includes("pax") || bulkEditField.includes("harga") || 
                         bulkEditField.includes("others") || bulkEditField.includes("discount") || 
                         bulkEditField.includes("total") || bulkEditField.includes("paid")
          ? parseFloat(bulkEditValue) || 0
          : bulkEditValue
      }));
      
      let successCount = 0;
      for (const update of updates) {
        const res = await fetch("/api/sales-reports", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(update),
        });
        if (res.ok) successCount++;
      }
      
      toast.success(`${successCount} rekod berjaya dikemaskini`);
      setSelectedIds(new Set());
      setIsBulkEditDialogOpen(false);
      setBulkEditField("");
      setBulkEditValue("");
      fetchReports();
    } catch (error) {
      toast.error("Ralat semasa kemaskini");
    }
  };

  const resetForm = () => {
    setEditingReport(null);
    setFormData({
      bulan: MONTHS[new Date().getMonth()],
      no_phone: "",
      nama_pakej: "",
      date_closed: new Date().toISOString().split("T")[0],
      tarikh_trip: "",
      jumlah_pax: 0,
      harga_pakej: 0,
      amount_others: 0,
      discount: 0,
      total: 0,
      paid: 0,
      status_bayaran: "Deposit",
      status_peserta: "BARU",
      nama_wakil_peserta: "",
      remark: "",
    });
  };

  const openEditDialog = (report: SalesReport) => {
    setEditingReport(report);
    setFormData({
      bulan: report.bulan,
      no_phone: report.no_phone || "",
      nama_pakej: report.nama_pakej || "",
      date_closed: report.date_closed || "",
      tarikh_trip: report.tarikh_trip || "",
      jumlah_pax: report.jumlah_pax || 0,
      harga_pakej: report.harga_pakej || 0,
      amount_others: report.amount_others || 0,
      discount: report.discount || 0,
      total: report.total || 0,
      paid: report.paid || 0,
      status_bayaran: report.status_bayaran || "Deposit",
      status_peserta: report.status_peserta || "BARU",
      nama_wakil_peserta: report.nama_wakil_peserta || "",
      remark: report.remark || "",
    });
    setIsDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-40" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="w-4 h-4 ml-1 text-emerald-600" />;
    }
    return <ChevronDown className="w-4 h-4 ml-1 text-emerald-600" />;
  };

  const sortReports = (data: SalesReport[]) => {
    if (!sortField || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      switch (sortField) {
        case "no_phone":
          aVal = a.no_phone || "";
          bVal = b.no_phone || "";
          break;
        case "nama_pakej":
          aVal = a.nama_pakej || "";
          bVal = b.nama_pakej || "";
          break;
        case "date_closed":
          aVal = a.date_closed || "";
          bVal = b.date_closed || "";
          break;
        case "tarikh_trip":
          aVal = a.tarikh_trip || "";
          bVal = b.tarikh_trip || "";
          break;
        case "jumlah_pax":
          aVal = a.jumlah_pax || 0;
          bVal = b.jumlah_pax || 0;
          break;
        case "total":
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case "paid":
          aVal = a.paid || 0;
          bVal = b.paid || 0;
          break;
        case "status_bayaran":
          aVal = a.status_bayaran || "";
          bVal = b.status_bayaran || "";
          break;
        case "nama_wakil_peserta":
          aVal = a.nama_wakil_peserta || "";
          bVal = b.nama_wakil_peserta || "";
          break;
        case "staff":
          aVal = a.staff?.name || "";
          bVal = b.staff?.name || "";
          break;
      }
      
      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  const calculateLeadAge = (dateString: string) => {
    if (!dateString) return null;
    const leadDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - leadDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalSales = filteredReports.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalPaid = filteredReports.reduce((sum, r) => sum + (r.paid || 0), 0);
  const totalPax = filteredReports.reduce((sum, r) => sum + (r.jumlah_pax || 0), 0);
  const sortedReports = sortReports(filteredReports);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedReports.length / pageSize);
  const paginatedReports = pageSize === 0 
    ? sortedReports 
    : sortedReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, dateRange.from, dateRange.to, selectedStaff, searchQuery, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Report</h2>
          <p className="text-sm text-muted-foreground">Database jualan yang berjaya close</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(user?.role === "superadmin" || user?.role === "admin") && (
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Pilih Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Staff</SelectItem>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input 
              type="date" 
              value={dateRange.from} 
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="border-0 p-0 h-auto w-[130px] focus-visible:ring-0"
            />
            <span className="text-gray-400">-</span>
            <Input 
              type="date" 
              value={dateRange.to} 
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="border-0 p-0 h-auto w-[130px] focus-visible:ring-0"
            />
          </div>
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Sales Report</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tarikh Dari</Label>
                  <Input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tarikh Hingga</Label>
                  <Input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
                </div>
                  {user?.role !== "superadmin" || user?.impersonatedBy ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      Permintaan export akan dihantar kepada Admin untuk kelulusan.
                    </div>
                  ) : null}
                  <Button onClick={handleExport} disabled={exportLoading} className="w-full bg-purple-600 hover:bg-purple-700">
                    {exportLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    {exportLoading ? "Processing..." : (user?.role === "superadmin" && !user?.impersonatedBy) ? "Export Sekarang" : "Hantar Permintaan"}
                  </Button>

              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isImportDialogOpen} onOpenChange={(open) => { setIsImportDialogOpen(open); if (!open) setImportFile(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Data Sales</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {user?.role === "superadmin" ? (
                  <div className="space-y-2">
                    <Label>Pilih Staff</Label>
                    <Select value={importData.staffId} onValueChange={(v) => setImportData({...importData, staffId: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih staff..." /></SelectTrigger>
                      <SelectContent>
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    Data akan diimport ke akaun anda: <strong>{user?.name}</strong>
                  </div>
                )}
                  
                <div className="space-y-2">
                  <Label>Kaedah Import</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={importData.importMethod === "sheet" ? "default" : "outline"}
                      className={importData.importMethod === "sheet" ? "bg-emerald-600" : ""}
                      onClick={() => setImportData({...importData, importMethod: "sheet"})}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Google Sheet
                    </Button>
                    <Button 
                      type="button"
                      variant={importData.importMethod === "file" ? "default" : "outline"}
                      className={importData.importMethod === "file" ? "bg-emerald-600" : ""}
                      onClick={() => setImportData({...importData, importMethod: "file"})}
                    >
                      <FileText className="w-4 h-4 mr-2" /> CSV/XLSX File
                    </Button>
                  </div>
                </div>
                
                {importData.importMethod === "sheet" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Sheet ID (Optional)</Label>
                      <Input 
                        placeholder="1C0jdJxjkdwTULNMPqgqbXyOctnOfkrVM_K_u1ywM4Hs" 
                        value={importData.sheetId} 
                        onChange={(e) => setImportData({...importData, sheetId: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sales GID (Optional)</Label>
                      <Input 
                        placeholder="1789979154" 
                        value={importData.salesGid} 
                        onChange={(e) => setImportData({...importData, salesGid: e.target.value})} 
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Upload File (CSV atau XLSX)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {importFile ? (
                          <div className="flex items-center justify-center gap-2 text-emerald-600">
                            <FileText className="w-6 h-6" />
                            <span className="font-medium">{importFile.name}</span>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p>Klik untuk pilih file atau drag & drop</p>
                            <p className="text-xs mt-1">Format: CSV, XLSX</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleImport} 
                  disabled={importLoading || (user?.role === "superadmin" && !importData.staffId) || (importData.importMethod === "file" && !importFile)} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importLoading ? "Importing..." : "Import Sales Data"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Sales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReport ? "Edit Sales" : "Tambah Sales Baru"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={formData.bulan} onValueChange={(v) => setFormData({...formData, bulan: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>No. Phone</Label>
                    <Input value={formData.no_phone} onChange={(e) => setFormData({...formData, no_phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nama Pakej</Label>
                  <Input value={formData.nama_pakej} onChange={(e) => setFormData({...formData, nama_pakej: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Closed</Label>
                    <Input type="date" value={formData.date_closed} onChange={(e) => setFormData({...formData, date_closed: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarikh Trip</Label>
                    <Input placeholder="29 AUG - 06 SEPT 2026" value={formData.tarikh_trip} onChange={(e) => setFormData({...formData, tarikh_trip: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Jumlah Pax</Label>
                    <Input type="number" value={formData.jumlah_pax || ""} onChange={(e) => setFormData({...formData, jumlah_pax: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Pakej</Label>
                    <Input type="number" value={formData.harga_pakej || ""} onChange={(e) => setFormData({...formData, harga_pakej: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Others</Label>
                    <Input type="number" value={formData.amount_others || ""} onChange={(e) => setFormData({...formData, amount_others: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input type="number" value={formData.discount || ""} onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total (Auto)</Label>
                    <Input type="number" value={formData.total} readOnly className="bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid</Label>
                    <Input type="number" value={formData.paid || ""} onChange={(e) => setFormData({...formData, paid: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status Bayaran</Label>
                    <Select value={formData.status_bayaran} onValueChange={(v) => setFormData({...formData, status_bayaran: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_BAYARAN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Peserta</Label>
                    <Select value={formData.status_peserta} onValueChange={(v) => setFormData({...formData, status_peserta: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_PESERTA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Wakil Peserta</Label>
                    <Input value={formData.nama_wakil_peserta} onChange={(e) => setFormData({...formData, nama_wakil_peserta: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Input value={formData.remark} onChange={(e) => setFormData({...formData, remark: e.target.value})} />
                </div>
                <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {editingReport ? "Kemaskini" : "Simpan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Sales</p>
                <p className="text-2xl font-bold">RM {totalSales.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Paid</p>
                <p className="text-2xl font-bold">RM {totalPaid.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Pax</p>
                <p className="text-2xl font-bold">{totalPax}</p>
              </div>
              <Users className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari pakej, phone, wakil, remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status Bayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_BAYARAN.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || filterStatus !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} rekod dipilih</span>
          <div className="flex-1" />
          <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                <Pencil className="w-4 h-4 mr-1" /> Edit Bulk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit {selectedIds.size} Rekod Sekaligus</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Pilih Field untuk dikemaskini</Label>
                  <Select value={bulkEditField} onValueChange={setBulkEditField}>
                    <SelectTrigger><SelectValue placeholder="Pilih field..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulan">Bulan</SelectItem>
                      <SelectItem value="status_bayaran">Status Bayaran</SelectItem>
                      <SelectItem value="status_peserta">Status Peserta</SelectItem>
                      <SelectItem value="nama_pakej">Nama Pakej</SelectItem>
                      <SelectItem value="tarikh_trip">Tarikh Trip</SelectItem>
                      <SelectItem value="remark">Remark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nilai Baru</Label>
                  {bulkEditField === "bulan" ? (
                    <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                      <SelectTrigger><SelectValue placeholder="Pilih bulan..." /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : bulkEditField === "status_bayaran" ? (
                    <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                      <SelectTrigger><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                      <SelectContent>
                        {STATUS_BAYARAN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : bulkEditField === "status_peserta" ? (
                    <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                      <SelectTrigger><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                      <SelectContent>
                        {STATUS_PESERTA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="Masukkan nilai baru..." 
                      value={bulkEditValue} 
                      onChange={(e) => setBulkEditValue(e.target.value)} 
                    />
                  )}
                </div>
                <Button onClick={handleBulkEdit} disabled={!bulkEditField || !bulkEditValue} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Pencil className="w-4 h-4 mr-2" /> Kemaskini {selectedIds.size} Rekod
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-700 hover:bg-red-100"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Padam {selectedIds.size}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p>{searchQuery || filterStatus !== "all" ? "Tiada rekod yang sepadan dengan carian" : `Tiada rekod untuk tarikh ${dateRange.from} hingga ${dateRange.to}`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedIds.size === filteredReports.length && filteredReports.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("no_phone")}
                    >
                      <div className="flex items-center">
                        No. Phone {getSortIcon("no_phone")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("nama_pakej")}
                    >
                      <div className="flex items-center">
                        Pakej {getSortIcon("nama_pakej")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("date_closed")}
                    >
                      <div className="flex items-center">
                        Date Closed {getSortIcon("date_closed")}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Umur (Hari)</TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("tarikh_trip")}
                    >
                      <div className="flex items-center">
                        Tarikh Trip {getSortIcon("tarikh_trip")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-center cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("jumlah_pax")}
                    >
                      <div className="flex items-center justify-center">
                        Pax {getSortIcon("jumlah_pax")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-right cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center justify-end">
                        Total {getSortIcon("total")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-right cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("paid")}
                    >
                      <div className="flex items-center justify-end">
                        Paid {getSortIcon("paid")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("status_bayaran")}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon("status_bayaran")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("nama_wakil_peserta")}
                    >
                      <div className="flex items-center">
                        Wakil {getSortIcon("nama_wakil_peserta")}
                      </div>
                    </TableHead>
                    {user?.role === "superadmin" && (
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("staff")}
                      >
                        <div className="flex items-center">
                          Staff {getSortIcon("staff")}
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReports.map((report) => {
                    const age = calculateLeadAge(report.date_closed);
                    return (
                      <TableRow key={report.id} className={`hover:bg-gray-50 ${selectedIds.has(report.id) ? "bg-blue-50" : ""}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(report.id)}
                            onCheckedChange={() => toggleSelect(report.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{report.no_phone}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{report.nama_pakej}</TableCell>
                        <TableCell>{report.date_closed ? new Date(report.date_closed).toLocaleDateString("ms-MY") : "-"}</TableCell>
                        <TableCell>
                          {age !== null && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              age <= 7 ? "bg-green-100 text-green-700" :
                              age <= 30 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {age} hari
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{report.tarikh_trip || "-"}</TableCell>
                        <TableCell className="text-center">{report.jumlah_pax}</TableCell>
                        <TableCell className="text-right font-semibold">RM {(report.total || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">RM {(report.paid || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.status_bayaran === "Full Payment" ? "bg-green-100 text-green-700" :
                            report.status_bayaran === "Deposit" ? "bg-yellow-100 text-yellow-700" :
                            report.status_bayaran === "Cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {report.status_bayaran}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">{report.nama_wakil_peserta}</TableCell>
                        {user?.role === "superadmin" && (
                          <TableCell className="text-sm text-gray-600">{report.staff?.name || "-"}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(report)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(report.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="0">Semua</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    Menunjukkan {pageSize === 0 ? sortedReports.length : Math.min(pageSize, sortedReports.length - (currentPage - 1) * pageSize)} daripada {sortedReports.length} rekod
                  </span>
                </div>
                
                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      ««
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      «
                    </Button>
                    <span className="px-3 text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      »
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      »»
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
