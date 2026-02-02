"use client";

import { useState, useEffect } from "react";
import { 
  Banknote, 
  Plus, 
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight
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
import { cn } from "@/lib/utils";

interface Payroll {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  claims_amount: number;
  total_amount: number;
  status: "Draft" | "Confirmed" | "Paid";
  paid_at?: string;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

export function PayrollContent() {
  const { user, isAdmin } = useAuth();
  const [payrollList, setPayrollList] = useState<Payroll[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const [newPayroll, setNewPayroll] = useState({
    staff_id: "",
    period_start: new Date().toISOString().slice(0, 7) + "-01",
    period_end: new Date().toISOString().slice(0, 7) + "-28",
    basic_salary: 0,
    claims_amount: 0
  });

  useEffect(() => {
    fetchPayroll();
    if (isAdmin) fetchStaff();
  }, []);

  const fetchPayroll = async () => {
    try {
      const url = isAdmin ? "/api/hr/payroll" : `/api/hr/payroll?staff_id=${user?.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayrollList(data.payroll || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if (!newPayroll.staff_id || !newPayroll.basic_salary) {
      toast.error("Sila pilih staff dan masukkan gaji asas");
      return;
    }

    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayroll)
      });

      if (res.ok) {
        toast.success("Payroll dijana sebagai Deraf");
        setIsGenerateOpen(false);
        fetchPayroll();
      }
    } catch (err) {
      toast.error("Gagal menjana payroll");
    }
  };

  const handleUpdateStatus = async (id: string, status: "Confirmed" | "Paid") => {
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (res.ok) {
        toast.success(`Payroll di${status === "Confirmed" ? "sahkan" : "bayar"}kan`);
        fetchPayroll();
      }
    } catch (err) {
      toast.error("Gagal mengemaskini status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft": return <Badge variant="secondary" className="bg-slate-100 text-slate-500">Draft</Badge>;
      case "Confirmed": return <Badge variant="secondary" className="bg-blue-100 text-blue-600">Disahkan</Badge>;
      case "Paid": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 font-bold">Dibayar</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-500" /> Payroll & Slip Gaji
          </h2>
          <p className="text-muted-foreground">Pengurusan gaji bulanan dan rekod pembayaran</p>
        </div>

        {isAdmin && (
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" /> Jana Payroll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Jana Payroll Bulanan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <Select 
                    value={newPayroll.staff_id}
                    onValueChange={val => setNewPayroll({...newPayroll, staff_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dari</Label>
                    <Input type="date" value={newPayroll.period_start} onChange={e => setNewPayroll({...newPayroll, period_start: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hingga</Label>
                    <Input type="date" value={newPayroll.period_end} onChange={e => setNewPayroll({...newPayroll, period_end: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gaji Asas (RM)</Label>
                    <Input type="number" value={newPayroll.basic_salary} onChange={e => setNewPayroll({...newPayroll, basic_salary: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Claims (RM)</Label>
                    <Input type="number" value={newPayroll.claims_amount} onChange={e => setNewPayroll({...newPayroll, claims_amount: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Batal</Button>
                <Button onClick={handleGenerate} className="bg-emerald-600">Jana Deraf</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 dark:text-emerald-400 font-medium">Jumlah Payroll Dibayar</CardDescription>
            <CardTitle className="text-3xl font-bold">RM {payrollList.filter(p => p.status === "Paid").reduce((acc, p) => acc + p.total_amount, 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">Dalam Proses</CardDescription>
            <CardTitle className="text-3xl font-bold">RM {payrollList.filter(p => p.status !== "Paid").reduce((acc, p) => acc + p.total_amount, 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium">Staff Terlibat</CardDescription>
            <CardTitle className="text-3xl font-bold">{new Set(payrollList.map(p => p.staff_id)).size}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10">Memuatkan data...</div>
        ) : payrollList.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">Tiada rekod payroll ditemui</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                  <th className="text-left p-4 font-semibold">Staff</th>
                  <th className="text-left p-4 font-semibold">Tempoh</th>
                  <th className="text-right p-4 font-semibold">Gaji Kasar</th>
                  <th className="text-right p-4 font-semibold">Total (Net)</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {payrollList.map(payroll => (
                  <tr key={payroll.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">
                          {staffList.find(s => s.id === payroll.staff_id)?.name.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="font-medium">{staffList.find(s => s.id === payroll.staff_id)?.name || "Unknown Staff"}</p>
                          <p className="text-[10px] text-muted-foreground">{payroll.staff_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs">{new Date(payroll.period_start).toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}</p>
                      <p className="text-[10px] text-muted-foreground">{payroll.period_start} - {payroll.period_end}</p>
                    </td>
                    <td className="p-4 text-right">RM {payroll.basic_salary.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">RM {payroll.total_amount.toFixed(2)}</td>
                    <td className="p-4 text-center">{getStatusBadge(payroll.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && payroll.status === "Draft" && (
                          <Button size="sm" onClick={() => handleUpdateStatus(payroll.id, "Confirmed")}>Sahkan</Button>
                        )}
                        {isAdmin && payroll.status === "Confirmed" && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus(payroll.id, "Paid")}>Mark Paid</Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-3 h-3" /> Slip
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
