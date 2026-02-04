"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Phone, Target, UserCheck, Upload, Download, Calendar, FileSpreadsheet, FileText, AlertTriangle, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { PackageSelect } from "@/components/PackageSelect";

interface LeadReport {
  id: string;
  bulan: string;
  nama_pakej: string;
  date_lead: string;
  no_phone: string;
  lead_from: string;
  remark: string;
  follow_up_status: string;
  date_follow_up: string;
  is_duplicate?: boolean;
  staff?: { id: string; name: string };
}

interface Staff {
  id: string;
  name: string;
}

type SortField = "nama_pakej" | "date_lead" | "no_phone" | "lead_from" | "follow_up_status" | "date_follow_up" | "staff";
type SortDirection = "asc" | "desc" | null;

const ALLOWED_STAFF_NAMES = [
  "Hazirah", "Haini", "Farah", "Ammar", 
  "Alieya", "Airienna", "Sarah", "Diyana"
];

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

const LEAD_FROM_OPTIONS = ["ADS", "PS", "REFERRAL", "WEBSITE", "WHATSAPP", "WALK-IN", "HAIKAL", "LAIN-LAIN"];
const FOLLOW_UP_STATUS = ["Pending", "Fu 1", "Fu 2", "Fu 3", "Fu 4", "Fu 5", "Closed", "Not Interested"];

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0]
  };
}

export function LeadReportTab() {
  const { user } = useAuth();
  const [reports, setReports] = useState<LeadReport[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editingReport, setEditingReport] = useState<LeadReport | null>(null);
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLeadFrom, setFilterLeadFrom] = useState<string>("all");
  const [filterFollowUp, setFilterFollowUp] = useState<string>("all");
  const [importData, setImportData] = useState({
    staffId: "",
    sheetId: "",
    leadGid: "",
    type: "leads",
    importMethod: "sheet" as "sheet" | "file"
  });
  const [importFiles, setImportFiles] = useState<File[]>([]);
    const [formData, setFormData] = useState({
      bulan: MONTHS[new Date().getMonth()],
      nama_pakej: "",
      date_lead: new Date().toISOString().split("T")[0],
      no_phone: "",
      lead_from: "ADS",
      remark: "",
      follow_up_status: "Pending",
      date_follow_up: "",
    });

  useEffect(() => {
    fetchStaffList();
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [dateRange.from, dateRange.to, selectedStaff]);

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
      let url = `/api/lead-reports?date_from=${dateRange.from}&date_to=${dateRange.to}`;
      
      // Kalau bukan superadmin/admin, filter by user's own staff_id
      if (user?.role !== "superadmin" && user?.role !== "admin") {
        url += `&staff_id=${user?.id}`;
      } else if (selectedStaff !== "all") {
        // Admin/superadmin boleh pilih staff atau semua
        url += `&staff_id=${selectedStaff}`;
      }
      
      const token = localStorage.getItem("auth_token");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data) {
        setReports(data.data);
        setSelectedIds(new Set());
      }
    } catch (error) {
      toast.error("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
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
      return <ChevronUp className="w-4 h-4 ml-1 text-blue-600" />;
    }
    return <ChevronDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  const sortReports = (data: LeadReport[]) => {
    if (!sortField || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      switch (sortField) {
        case "nama_pakej":
          aVal = a.nama_pakej || "";
          bVal = b.nama_pakej || "";
          break;
        case "date_lead":
          aVal = a.date_lead || "";
          bVal = b.date_lead || "";
          break;
        case "no_phone":
          aVal = a.no_phone || "";
          bVal = b.no_phone || "";
          break;
        case "lead_from":
          aVal = a.lead_from || "";
          bVal = b.lead_from || "";
          break;
        case "follow_up_status":
          aVal = a.follow_up_status || "";
          bVal = b.follow_up_status || "";
          break;
        case "date_follow_up":
          aVal = a.date_follow_up || "";
          bVal = b.date_follow_up || "";
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredReports.map(r => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      
      setBulkDeleteLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const allIds = Array.from(selectedIds);
        const BATCH_SIZE = 1000;
        let totalDeleted = 0;
        
        toast.info(`Memadam ${allIds.length} rekod... Sila tunggu`);
      
      // Delete in batches to avoid timeout
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        
        const res = await fetch(`/api/lead-reports`, { 
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
        
        // Update progress
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
      setBulkDeleteLoading(false);
    }
  };

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
          report_type: "leads",
          date_from: dateRange.from,
          date_to: dateRange.to,
          staff_id: selectedStaff,
          hide_duplicates: hideDuplicates,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.approved) {
          downloadCSV(data.data, "lead_report");
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

  const downloadCSV = (data: LeadReport[], filename: string) => {
    let exportData = data;
    if (hideDuplicates) {
      exportData = data.filter(r => !r.is_duplicate);
    }
    
    const headers = [
      "Nama Pakej", "Date Lead", "Umur (Hari)", "No. Phone", 
      "Lead From", "Follow Up Status", "Date Follow Up", 
      "Remark", "Duplicate", "Staff"
    ];
    
    const rows = exportData.map(r => {
      const age = calculateLeadAge(r.date_lead);
      return [
        r.nama_pakej || "",
        r.date_lead || "",
        age !== null ? `${age} hari` : "",
        r.no_phone || "",
        r.lead_from || "",
        r.follow_up_status || "",
        r.date_follow_up || "",
        r.remark || "",
        r.is_duplicate ? "Ya" : "Tidak",
        r.staff?.name || ""
      ];
    });
    
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

  const downloadLeadTemplate = () => {
    const headers = [
      "Bulan", "Date Lead", "Nama Pakej", "No Phone", 
      "Lead From", "Remark", "Follow Up Status", "Date Follow Up"
    ];
    
    const sampleRows = [
      ["JANUARY", "2026-01-28", "Pakej Turkiye", "60123456789", "ADS", "Berminat", "Pending", ""],
      ["JANUARY", "2026-01-28", "Pakej Korea", "60198765432", "PS", "Repeat customer", "Fu 1", "2026-01-30"]
    ];
    
    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `template_lead_import.csv`);
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
        if (importData.importMethod === "file" && importFiles.length > 0) {
          const formDataObj = new FormData();
          importFiles.forEach((file) => {
            formDataObj.append("files", file);
          });
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
            setImportFiles([]);
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
            leadGid: importData.leadGid || undefined,
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
      
      const res = await fetch("/api/lead-reports", {
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
      const res = await fetch(`/api/lead-reports?id=${id}`, { 
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

    const resetForm = () => {
      setEditingReport(null);
      setFormData({
        bulan: MONTHS[new Date().getMonth()],
        nama_pakej: "",
        date_lead: new Date().toISOString().split("T")[0],
        no_phone: "",
        lead_from: "ADS",
        remark: "",
        follow_up_status: "Pending",
        date_follow_up: "",
      });
    };

    const openEditDialog = (report: LeadReport) => {
      setEditingReport(report);
      setFormData({
        bulan: report.bulan,
        nama_pakej: report.nama_pakej || "",
        date_lead: report.date_lead || "",
        no_phone: report.no_phone || "",
        lead_from: report.lead_from || "ADS",
        remark: report.remark || "",
        follow_up_status: report.follow_up_status || "Pending",
        date_follow_up: report.date_follow_up || "",
      });
      setIsDialogOpen(true);
    };

  const calculateLeadAge = (dateString: string) => {
    if (!dateString) return null;
    const leadDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - leadDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredReportsBase = hideDuplicates ? reports.filter(r => !r.is_duplicate) : reports;
  
  const filteredReports = useMemo(() => {
    let result = filteredReportsBase;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.nama_pakej?.toLowerCase().includes(query) ||
        r.no_phone?.toLowerCase().includes(query) ||
        r.remark?.toLowerCase().includes(query) ||
        r.staff?.name?.toLowerCase().includes(query)
      );
    }
    
    if (filterLeadFrom !== "all") {
      result = result.filter(r => r.lead_from === filterLeadFrom);
    }
    
    if (filterFollowUp !== "all") {
      result = result.filter(r => r.follow_up_status === filterFollowUp);
    }
    
    return result;
  }, [filteredReportsBase, searchQuery, filterLeadFrom, filterFollowUp]);
  
  const sortedReports = sortReports(filteredReports);
  const totalLeads = filteredReports.length;
  const closedLeads = filteredReports.filter(r => r.follow_up_status === "Closed").length;
  const pendingFollowUp = filteredReports.filter(r => r.follow_up_status?.startsWith("Fu")).length;
  const duplicateCount = reports.filter(r => r.is_duplicate).length;
  const isAllSelected = filteredReports.length > 0 && selectedIds.size === filteredReports.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredReports.length;

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedReports.length / pageSize);
  const paginatedReports = pageSize === 0 
    ? sortedReports 
    : sortedReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, dateRange.from, dateRange.to, selectedStaff, hideDuplicates, searchQuery, filterLeadFrom, filterFollowUp]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Report</h2>
          <p className="text-sm text-muted-foreground">Database kemasukan lead harian & status follow up</p>
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
          
          <Button 
            variant={hideDuplicates ? "default" : "outline"}
            className={hideDuplicates ? "bg-orange-500 hover:bg-orange-600" : "border-orange-300 text-orange-700 hover:bg-orange-50"}
            onClick={() => setHideDuplicates(!hideDuplicates)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {hideDuplicates ? "Tunjuk Semua" : "Sembunyikan Duplicate"}
          </Button>
          
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Lead Report</DialogTitle>
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
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="export-hide-duplicates"
                    checked={hideDuplicates}
                    onChange={(e) => setHideDuplicates(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="export-hide-duplicates" className="text-sm">Sembunyikan nombor duplicate</label>
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
          
          <Dialog open={isImportDialogOpen} onOpenChange={(open) => { setIsImportDialogOpen(open); if (!open) setImportFiles([]); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Lead Data</DialogTitle>
              </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Konfigurasi Import</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadLeadTemplate}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Template
                    </Button>
                  </div>

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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Data akan diimport ke akaun anda: <strong>{user?.name}</strong>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Kaedah Import</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={importData.importMethod === "sheet" ? "default" : "outline"}
                      className={importData.importMethod === "sheet" ? "bg-blue-600" : ""}
                      onClick={() => setImportData({...importData, importMethod: "sheet"})}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Google Sheet
                    </Button>
                    <Button 
                      type="button"
                      variant={importData.importMethod === "file" ? "default" : "outline"}
                      className={importData.importMethod === "file" ? "bg-blue-600" : ""}
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
                        <Label>Lead GID (Optional)</Label>
                        <Input 
                          placeholder="1892509228" 
                          value={importData.leadGid} 
                          onChange={(e) => setImportData({...importData, leadGid: e.target.value})} 
                        />
                      </div>
                    </>
                  ) : (
                      <div className="space-y-2">
                        <Label>Upload Files (Boleh pilih banyak)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls,.html,.htm,.pdf"
                            multiple
                            onChange={(e) => setImportFiles(Array.from(e.target.files || []))}
                            className="hidden"
                            id="lead-file-upload"
                          />
                          <label htmlFor="lead-file-upload" className="cursor-pointer">
                            {importFiles.length > 0 ? (
                              <div className="space-y-2">
                                {importFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-center gap-2 text-blue-600">
                                    <FileText className="w-5 h-5" />
                                    <span className="font-medium text-sm">{file.name}</span>
                                  </div>
                                ))}
                                <p className="text-xs text-gray-500 mt-2">{importFiles.length} file dipilih</p>
                              </div>
                            ) : (
                              <div className="text-gray-500">
                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                <p>Klik untuk pilih file atau drag & drop</p>
                                <p className="text-xs mt-1">Format: CSV, XLSX, HTML, PDF</p>
                                <p className="text-xs text-blue-600 mt-1">Boleh pilih banyak file sekaligus!</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Sistem akan auto-detect nombor duplicate dan mark untuk filtering.
                </div>
                
                  <Button 
                    onClick={handleImport} 
                    disabled={importLoading || (user?.role === "superadmin" && !importData.staffId) || (importData.importMethod === "file" && importFiles.length === 0)} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importLoading ? "Importing..." : "Import Lead Data"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingReport ? "Edit Lead" : "Tambah Lead Baru"}</DialogTitle>
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
                    <Label>Date Lead</Label>
                    <Input type="date" value={formData.date_lead} onChange={(e) => setFormData({...formData, date_lead: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                    <Label>Nama Pakej</Label>
                    <PackageSelect 
                      value={formData.nama_pakej} 
                      onChange={(v) => setFormData({...formData, nama_pakej: v})}
                      placeholder="Pilih pakej..."
                    />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>No. Phone</Label>
                    <Input placeholder="60123456789" value={formData.no_phone} onChange={(e) => setFormData({...formData, no_phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead From</Label>
                    <Select value={formData.lead_from} onValueChange={(v) => setFormData({...formData, lead_from: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_FROM_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Follow Up Status</Label>
                    <Select value={formData.follow_up_status} onValueChange={(v) => setFormData({...formData, follow_up_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FOLLOW_UP_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Follow Up</Label>
                    <Input type="date" value={formData.date_follow_up} onChange={(e) => setFormData({...formData, date_follow_up: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Input placeholder="Catatan tambahan..." value={formData.remark} onChange={(e) => setFormData({...formData, remark: e.target.value})} />
                </div>
                <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingReport ? "Kemaskini" : "Simpan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <Phone className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Closed</p>
                <p className="text-2xl font-bold">{closedLeads}</p>
              </div>
              <UserCheck className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Pending Follow Up</p>
                <p className="text-2xl font-bold">{pendingFollowUp}</p>
              </div>
              <Target className="w-8 h-8 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Duplicate</p>
                <p className="text-2xl font-bold">{duplicateCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-50" />
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
                placeholder="Cari pakej, phone, remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterLeadFrom} onValueChange={setFilterLeadFrom}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Lead From" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sumber</SelectItem>
              {LEAD_FROM_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterFollowUp} onValueChange={setFilterFollowUp}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Follow Up" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {FOLLOW_UP_STATUS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || filterLeadFrom !== "all" || filterFollowUp !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchQuery(""); setFilterLeadFrom("all"); setFilterFollowUp("all"); }}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} rekod dipilih
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteLoading}
          >
            {bulkDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Padam Dipilih
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Batal Pilihan
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
              <p>{searchQuery || filterLeadFrom !== "all" || filterFollowUp !== "all" ? "Tiada rekod yang sepadan dengan carian" : `Tiada rekod untuk tarikh ${dateRange.from} hingga ${dateRange.to}`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Pilih semua"
                          className={isSomeSelected ? "data-[state=checked]:bg-blue-600" : ""}
                        />
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
                        onClick={() => handleSort("date_lead")}
                      >
                        <div className="flex items-center">
                          Date Lead {getSortIcon("date_lead")}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Umur (Hari)</TableHead>
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
                        onClick={() => handleSort("lead_from")}
                      >
                        <div className="flex items-center">
                          Lead From {getSortIcon("lead_from")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("follow_up_status")}
                      >
                        <div className="flex items-center">
                          Follow Up {getSortIcon("follow_up_status")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("date_follow_up")}
                      >
                        <div className="flex items-center">
                          Date FU {getSortIcon("date_follow_up")}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Remark</TableHead>
                      {(user?.role === "superadmin" || user?.role === "admin") && (
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
                    const age = calculateLeadAge(report.date_lead);
                    return (
                      <TableRow key={report.id} className={`hover:bg-gray-50 ${report.is_duplicate ? "bg-orange-50" : ""} ${selectedIds.has(report.id) ? "bg-blue-50" : ""}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(report.id)}
                            onCheckedChange={(checked) => handleSelectOne(report.id, checked as boolean)}
                            aria-label={`Pilih ${report.nama_pakej}`}
                          />
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate font-medium">
                          {report.nama_pakej}
                          {report.is_duplicate && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded">DUPLICATE</span>
                          )}
                        </TableCell>
                        <TableCell>{report.date_lead ? new Date(report.date_lead).toLocaleDateString("ms-MY") : "-"}</TableCell>
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
                        <TableCell className="font-mono text-sm">{report.no_phone || "-"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {report.lead_from}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.follow_up_status === "Closed" ? "bg-green-100 text-green-700" :
                            report.follow_up_status === "Not Interested" ? "bg-red-100 text-red-700" :
                            report.follow_up_status?.startsWith("Fu") ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {report.follow_up_status}
                          </span>
                        </TableCell>
                        <TableCell>{report.date_follow_up ? new Date(report.date_follow_up).toLocaleDateString("ms-MY") : "-"}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm text-gray-600">{report.remark || "-"}</TableCell>
                        {(user?.role === "superadmin" || user?.role === "admin") && (
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
