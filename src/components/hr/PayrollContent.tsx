"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Banknote,
  Plus,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Settings2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PayrollDeduction {
  name: string;
  amount: number;
}

interface PayrollMetadata {
  epf_employer?: number;
  socso_employer?: number;
  eis_employer?: number;
  gross_salary?: number;
  total_deductions?: number;
}

interface Payroll {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  allowances: { name: string; amount: number }[];
  deductions: PayrollDeduction[];
  claims_amount: number;
  total_amount: number;
  status: "Draft" | "Confirmed" | "Paid";
  metadata?: PayrollMetadata;
  paid_at?: string;
  created_at: string;
}

// Helper to extract visible deductions (exclude __hidden__ entries from old workaround)
function getVisibleDeductions(deductions: PayrollDeduction[]) {
  return (deductions || []).filter(d => !d.name.startsWith('__'));
}

// Helper to get metadata — either from metadata field or from hidden deduction entries (backward compat)
function getPayrollMeta(payroll: Payroll): PayrollMetadata {
  if (payroll.metadata && Object.keys(payroll.metadata).length > 0) return payroll.metadata;
  const meta: PayrollMetadata = {};
  for (const d of payroll.deductions || []) {
    if (d.name === '__employer_epf__') meta.epf_employer = d.amount;
    if (d.name === '__employer_socso__') meta.socso_employer = d.amount;
    if (d.name === '__employer_eis__') meta.eis_employer = d.amount;
    if (d.name === '__gross_salary__') meta.gross_salary = d.amount;
    if (d.name === '__total_deductions__') meta.total_deductions = d.amount;
  }
  return meta;
}

interface StaffSalary {
  id: string;
  staff_id: string;
  basic_salary: number;
  allowances: { name: string; amount: number }[];
  epf_employee_rate: number;
  epf_employer_rate: number;
  socso_category: number;
  eis_enabled: boolean;
  tax_category: string;
  pcb_enabled: boolean;
  bank_name: string;
  bank_account: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

type TabView = "payroll" | "salary" | "generate";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
}

function getHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

function getAuthHeader() {
  return { Authorization: `Bearer ${getToken()}` };
}

// Searchable staff picker component
function StaffPicker({ staffList, value, onChange }: { staffList: Staff[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!q) return staffList;
    return staffList.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase()));
  }, [staffList, q]);

  const selected = staffList.find((s) => s.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Pilih staff..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <Input
              placeholder="Cari nama atau email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Tiada staff dijumpai</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); setOpen(false); setQ(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${s.id === value ? "bg-accent font-medium" : ""}`}
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email} &middot; {s.role}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PayrollContent() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<TabView>("payroll");
  const [payrollList, setPayrollList] = useState<Payroll[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaryList, setSalaryList] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedPayroll, setExpandedPayroll] = useState<string | null>(null);

  // Salary form
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    staff_id: "",
    basic_salary: 0,
    allowances: [] as { name: string; amount: number }[],
    epf_employee_rate: 11,
    epf_employer_rate: 13,
    socso_category: 1,
    eis_enabled: true,
    tax_category: "single",
    pcb_enabled: true,
    bank_name: "",
    bank_account: "",
  });

  // Generate form
  const [generating, setGenerating] = useState(false);
  const now = new Date();
  const [genPeriod, setGenPeriod] = useState({
    period_start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    period_end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
  });

  const fetchPayroll = useCallback(async () => {
    try {
      const url = isAdmin ? "/api/hr/payroll" : `/api/hr/payroll?staff_id=${user?.id}`;
      const res = await fetch(url, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setPayrollList(data.payroll || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.id]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setStaffList((data.staff || []).filter((s: Staff) => s.status === "approved" && s.role !== "unassigned"));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSalaries = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/salary", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setSalaryList(data.salaries || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
    if (isAdmin) {
      fetchStaff();
      fetchSalaries();
    }
  }, [fetchPayroll, fetchStaff, fetchSalaries, isAdmin]);

  const getStaffName = (staffId: string) => {
    return staffList.find((s) => s.id === staffId)?.name || "Unknown";
  };

  const resetSalaryForm = () => {
    setSalaryForm({
      staff_id: "",
      basic_salary: 0,
      allowances: [],
      epf_employee_rate: 11,
      epf_employer_rate: 13,
      socso_category: 1,
      eis_enabled: true,
      tax_category: "single",
      pcb_enabled: true,
      bank_name: "",
      bank_account: "",
    });
  };

  const handleSaveSalary = async () => {
    if (!salaryForm.staff_id || salaryForm.basic_salary <= 0) {
      toast.error("Sila pilih staff dan masukkan gaji asas");
      return;
    }
    try {
      const res = await fetch("/api/hr/salary", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(salaryForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Konfigurasi gaji disimpan");
        setSalaryDialogOpen(false);
        fetchSalaries();
        resetSalaryForm();
      } else {
        toast.error(data.error || "Gagal simpan");
      }
    } catch (e) {
      console.error("Save salary error:", e);
      toast.error("Gagal simpan konfigurasi gaji");
    }
  };

  const handleEditSalary = (sal: StaffSalary) => {
    setSalaryForm({
      staff_id: sal.staff_id,
      basic_salary: Number(sal.basic_salary),
      allowances: sal.allowances || [],
      epf_employee_rate: sal.epf_employee_rate,
      epf_employer_rate: sal.epf_employer_rate,
      socso_category: sal.socso_category,
      eis_enabled: sal.eis_enabled,
      tax_category: sal.tax_category,
      pcb_enabled: sal.pcb_enabled,
      bank_name: sal.bank_name || "",
      bank_account: sal.bank_account || "",
    });
    setSalaryDialogOpen(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/hr/payroll/generate", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(genPeriod),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Payroll dijana untuk ${data.count} staff`);
        fetchPayroll();
        setTab("payroll");
      } else {
        toast.error(data.error || "Gagal menjana payroll");
      }
    } catch {
      toast.error("Gagal menjana payroll");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "Confirmed" | "Paid") => {
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Payroll di${status === "Confirmed" ? "sahkan" : "bayar"}kan`);
        fetchPayroll();
      }
    } catch {
      toast.error("Gagal mengemaskini status");
    }
  };

  // Allowance helpers
  const addAllowance = () => {
    setSalaryForm({ ...salaryForm, allowances: [...salaryForm.allowances, { name: "", amount: 0 }] });
  };
  const removeAllowance = (idx: number) => {
    setSalaryForm({ ...salaryForm, allowances: salaryForm.allowances.filter((_, i) => i !== idx) });
  };
  const updateAllowance = (idx: number, field: "name" | "amount", val: string | number) => {
    const updated = [...salaryForm.allowances];
    if (field === "name") updated[idx].name = val as string;
    else updated[idx].amount = Number(val);
    setSalaryForm({ ...salaryForm, allowances: updated });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-500">Draft</Badge>;
      case "Confirmed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-600">Disahkan</Badge>;
      case "Paid":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 font-bold">Dibayar</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayroll = payrollList.filter((p) => {
    if (!search) return true;
    const name = getStaffName(p.staff_id).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const totalAllowances = salaryForm.allowances.reduce((a, b) => a + (b.amount || 0), 0);

  const tabs = [
    { id: "payroll" as TabView, label: "Senarai Payroll", icon: FileText },
    ...(isAdmin
      ? [
          { id: "salary" as TabView, label: "Tetapan Gaji", icon: Settings2 },
          { id: "generate" as TabView, label: "Jana Payroll", icon: RefreshCw },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-500" /> Payroll & Slip Gaji
          </h2>
          <p className="text-muted-foreground">Pengurusan gaji bulanan, konfigurasi gaji, dan rekod pembayaran</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 font-medium">Jumlah Dibayar</CardDescription>
            <CardTitle className="text-2xl font-bold">
              RM {payrollList.filter((p) => p.status === "Paid").reduce((a, p) => a + p.total_amount, 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 font-medium">Dalam Proses</CardDescription>
            <CardTitle className="text-2xl font-bold">
              RM {payrollList.filter((p) => p.status !== "Paid").reduce((a, p) => a + p.total_amount, 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-medium">Staff Dengan Gaji</CardDescription>
            <CardTitle className="text-2xl font-bold">{salaryList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium">Jumlah Payroll</CardDescription>
            <CardTitle className="text-2xl font-bold">{payrollList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-slate-800 border border-b-white dark:border-b-slate-800 text-emerald-600 -mb-[1px]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Payroll List */}
      {tab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Memuatkan data...</div>
          ) : filteredPayroll.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">Tiada rekod payroll ditemui</p>
              {isAdmin && (
                <Button className="mt-4 gap-2" onClick={() => setTab("generate")}>
                  <RefreshCw className="w-4 h-4" /> Jana Payroll Sekarang
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayroll.map((payroll) => (
                <Card key={payroll.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpandedPayroll(expandedPayroll === payroll.id ? null : payroll.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-600">
                        {getStaffName(payroll.staff_id).charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{getStaffName(payroll.staff_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payroll.period_start).toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">RM {payroll.total_amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Net Pay</p>
                      </div>
                      {getStatusBadge(payroll.status)}
                      {expandedPayroll === payroll.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {expandedPayroll === payroll.id && (() => {
                    const visibleDeductions = getVisibleDeductions(payroll.deductions);
                    const meta = getPayrollMeta(payroll);
                    const totalDeductions = meta.total_deductions ?? visibleDeductions.reduce((s, d) => s + d.amount, 0);
                    const grossSalary = meta.gross_salary ?? payroll.basic_salary;
                    const totalAllowances = (payroll.allowances || []).reduce((s, a) => s + a.amount, 0);
                    return (
                    <div className="border-t p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                      {/* Salary Breakdown Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Gaji Asas</p>
                          <p className="font-semibold">RM {payroll.basic_salary.toFixed(2)}</p>
                        </div>
                        {totalAllowances > 0 && (
                          <div>
                            <p className="text-muted-foreground">Elaun</p>
                            <p className="font-semibold text-green-600">+ RM {totalAllowances.toFixed(2)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Gaji Kasar</p>
                          <p className="font-semibold">RM {grossSalary.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Jumlah Potongan</p>
                          <p className="font-semibold text-red-500">- RM {totalDeductions.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gaji Bersih</p>
                          <p className="font-bold text-emerald-600 text-lg">RM {payroll.total_amount.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Tempoh: {new Date(payroll.period_start).toLocaleDateString("ms-MY")} — {new Date(payroll.period_end).toLocaleDateString("ms-MY")}
                      </div>

                      {payroll.allowances && payroll.allowances.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Elaun:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {payroll.allowances.map((a, i) => (
                              <div key={i} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-sm">
                                <p className="text-muted-foreground text-xs">{a.name}</p>
                                <p className="font-medium text-green-600">+ RM {a.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {visibleDeductions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Potongan Berkanun (Pekerja):</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {visibleDeductions.map((d, i) => (
                              <div key={i} className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2 text-sm border border-red-100 dark:border-red-900/20">
                                <p className="text-muted-foreground text-xs">{d.name}</p>
                                <p className="font-medium text-red-600">- RM {d.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(meta.epf_employer || meta.socso_employer || meta.eis_employer) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Caruman Majikan:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {meta.epf_employer ? (
                              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2 text-sm border border-blue-100 dark:border-blue-900/20">
                                <p className="text-muted-foreground text-xs">EPF (Majikan)</p>
                                <p className="font-medium text-blue-600">RM {meta.epf_employer.toFixed(2)}</p>
                              </div>
                            ) : null}
                            {meta.socso_employer ? (
                              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2 text-sm border border-blue-100 dark:border-blue-900/20">
                                <p className="text-muted-foreground text-xs">SOCSO (Majikan)</p>
                                <p className="font-medium text-blue-600">RM {meta.socso_employer.toFixed(2)}</p>
                              </div>
                            ) : null}
                            {meta.eis_employer ? (
                              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2 text-sm border border-blue-100 dark:border-blue-900/20">
                                <p className="text-muted-foreground text-xs">EIS (Majikan)</p>
                                <p className="font-medium text-blue-600">RM {meta.eis_employer.toFixed(2)}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        {isAdmin && payroll.status === "Draft" && (
                          <Button size="sm" onClick={() => handleUpdateStatus(payroll.id, "Confirmed")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Sahkan
                          </Button>
                        )}
                        {isAdmin && payroll.status === "Confirmed" && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus(payroll.id, "Paid")}>
                            <DollarSign className="w-4 h-4 mr-1" /> Tandai Dibayar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-3 h-3" /> Muat Turun Slip
                        </Button>
                      </div>
                    </div>
                    );
                  })()}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Salary Config */}
      {tab === "salary" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tetapkan gaji asas, elaun, kadar EPF, SOCSO, EIS dan PCB untuk setiap staff.</p>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { resetSalaryForm(); setSalaryDialogOpen(true); }}
            >
              <Plus className="w-4 h-4" /> Tetapkan Gaji
            </Button>
          </div>

          {/* Salary Dialog */}
          <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Konfigurasi Gaji Staff</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <StaffPicker staffList={staffList} value={salaryForm.staff_id} onChange={(id) => setSalaryForm({ ...salaryForm, staff_id: id })} />
                </div>
                <div className="space-y-2">
                  <Label>Gaji Asas (RM)</Label>
                  <Input type="number" value={salaryForm.basic_salary || ""} onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: parseFloat(e.target.value) || 0 })} placeholder="cth: 2500" />
                </div>

                {/* Allowances */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Elaun</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addAllowance} className="gap-1 h-7 text-xs">
                      <Plus className="w-3 h-3" /> Tambah Elaun
                    </Button>
                  </div>
                  {salaryForm.allowances.length === 0 && (
                    <p className="text-xs text-muted-foreground">Tiada elaun ditetapkan</p>
                  )}
                  {salaryForm.allowances.map((al, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Nama elaun (cth: Transport)"
                        value={al.name}
                        onChange={(e) => updateAllowance(idx, "name", e.target.value)}
                        className="flex-1 h-9 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="RM"
                        value={al.amount || ""}
                        onChange={(e) => updateAllowance(idx, "amount", e.target.value)}
                        className="w-28 h-9 text-sm"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeAllowance(idx)} className="h-9 w-9 p-0 text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {totalAllowances > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">Jumlah Elaun: RM {totalAllowances.toFixed(2)}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EPF Pekerja (%)</Label>
                    <Input type="number" value={salaryForm.epf_employee_rate} onChange={(e) => setSalaryForm({ ...salaryForm, epf_employee_rate: parseFloat(e.target.value) || 11 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>EPF Majikan (%)</Label>
                    <Input type="number" value={salaryForm.epf_employer_rate} onChange={(e) => setSalaryForm({ ...salaryForm, epf_employer_rate: parseFloat(e.target.value) || 13 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategori Cukai</Label>
                    <Select value={salaryForm.tax_category} onValueChange={(v) => setSalaryForm({ ...salaryForm, tax_category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Bujang</SelectItem>
                        <SelectItem value="married">Berkahwin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>SOCSO Kategori</Label>
                    <Select value={String(salaryForm.socso_category)} onValueChange={(v) => setSalaryForm({ ...salaryForm, socso_category: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Kategori 1</SelectItem>
                        <SelectItem value="2">Kategori 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Bank</Label>
                    <Input value={salaryForm.bank_name} onChange={(e) => setSalaryForm({ ...salaryForm, bank_name: e.target.value })} placeholder="cth: Maybank" />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Akaun Bank</Label>
                    <Input value={salaryForm.bank_account} onChange={(e) => setSalaryForm({ ...salaryForm, bank_account: e.target.value })} placeholder="cth: 1234567890" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={salaryForm.eis_enabled} onChange={(e) => setSalaryForm({ ...salaryForm, eis_enabled: e.target.checked })} className="rounded" />
                    EIS Enabled
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={salaryForm.pcb_enabled} onChange={(e) => setSalaryForm({ ...salaryForm, pcb_enabled: e.target.checked })} className="rounded" />
                    PCB Enabled
                  </label>
                </div>

                {salaryForm.basic_salary > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-emerald-700">Ringkasan:</p>
                    <p>Gaji Asas: RM {salaryForm.basic_salary.toFixed(2)}</p>
                    {totalAllowances > 0 && <p>Elaun: + RM {totalAllowances.toFixed(2)}</p>}
                    <p className="font-bold mt-1">Jumlah Kasar: RM {(salaryForm.basic_salary + totalAllowances).toFixed(2)}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSalaryDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSaveSalary} className="bg-emerald-600 hover:bg-emerald-700">Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {salaryList.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
              <Settings2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-muted-foreground">Tiada konfigurasi gaji. Sila tetapkan gaji staff.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                    <th className="text-left p-3 font-semibold">Staff</th>
                    <th className="text-right p-3 font-semibold">Gaji Asas</th>
                    <th className="text-right p-3 font-semibold">Elaun</th>
                    <th className="text-center p-3 font-semibold">EPF</th>
                    <th className="text-center p-3 font-semibold">EIS/PCB</th>
                    <th className="text-left p-3 font-semibold">Bank</th>
                    <th className="text-right p-3 font-semibold">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryList.map((sal) => {
                    const allAmt = (sal.allowances || []).reduce((a: number, b: { amount: number }) => a + b.amount, 0);
                    return (
                      <tr key={sal.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                          <p className="font-medium">{getStaffName(sal.staff_id)}</p>
                          <p className="text-xs text-muted-foreground">{sal.tax_category === "married" ? "Berkahwin" : "Bujang"}</p>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">RM {Number(sal.basic_salary).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right text-xs">
                          {allAmt > 0 ? <span className="text-green-600">+RM {allAmt.toFixed(2)}</span> : "-"}
                        </td>
                        <td className="p-3 text-center text-xs">{sal.epf_employee_rate}% / {sal.epf_employer_rate}%</td>
                        <td className="p-3 text-center text-xs">
                          {sal.eis_enabled ? "EIS" : ""}{sal.eis_enabled && sal.pcb_enabled ? " / " : ""}{sal.pcb_enabled ? "PCB" : ""}
                          {!sal.eis_enabled && !sal.pcb_enabled && "-"}
                        </td>
                        <td className="p-3 text-xs">
                          {sal.bank_name ? `${sal.bank_name} - ${sal.bank_account || "-"}` : "-"}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleEditSalary(sal)}>Edit</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Auto Generate Payroll */}
      {tab === "generate" && isAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-500" />
                Jana Payroll Automatik
              </CardTitle>
              <CardDescription>
                Sistem akan mengira EPF, SOCSO, EIS dan PCB secara automatik berdasarkan gaji yang telah ditetapkan untuk setiap staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarikh Mula Tempoh</Label>
                  <Input type="date" value={genPeriod.period_start} onChange={(e) => setGenPeriod({ ...genPeriod, period_start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tarikh Akhir Tempoh</Label>
                  <Input type="date" value={genPeriod.period_end} onChange={(e) => setGenPeriod({ ...genPeriod, period_end: e.target.value })} />
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Nota Penting
                </p>
                <ul className="mt-2 space-y-1 text-amber-600 dark:text-amber-300 list-disc ml-5">
                  <li>Payroll akan dijana untuk semua staff yang mempunyai konfigurasi gaji</li>
                  <li>Potongan EPF, SOCSO, EIS, dan PCB dikira automatik mengikut kadar semasa</li>
                  <li>Payroll sedia ada untuk tempoh sama akan dikemaskini (bukan duplicate)</li>
                  <li>Status awal: Draft — perlu disahkan sebelum pembayaran</li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Staff Layak ({salaryList.length} orang):</p>
                <div className="flex flex-wrap gap-2">
                  {salaryList.map((sal) => (
                    <Badge key={sal.id} variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {getStaffName(sal.staff_id)} — RM {Number(sal.basic_salary).toLocaleString()}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating || salaryList.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" size="lg">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                {generating ? "Menjana payroll..." : `Jana Payroll untuk ${salaryList.length} Staff`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
