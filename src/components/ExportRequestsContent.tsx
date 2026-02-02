"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Check, X, FileText, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ExportRequest {
  id: string;
  report_type: "sales" | "leads";
  date_from: string;
  date_to: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  staff: { id: string; name: string };
  approver?: { id: string; name: string };
  approved_at?: string;
}

export function ExportRequestsContent() {
  const { user, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/export-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data) {
        setRequests(data.data);
      }
    } catch (error) {
      toast.error("Gagal memuatkan permohonan export");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/export-requests", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id, action }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (action === "approve" && data.reportData) {
          downloadCSV(data.reportData, requests.find(r => r.id === id)?.report_type || "report", id);
        }
        fetchRequests();
      } else {
        toast.error(data.error || "Gagal memproses permohonan");
      }
    } catch (error) {
      toast.error("Ralat berlaku");
    } finally {
      setProcessingId(null);
    }
  };

  const downloadCSV = (data: any[], type: string, id: string) => {
    const request = requests.find(r => r.id === id);
    const filename = `${type}_report_${request?.date_from}_to_${request?.date_to}`;
    
    let headers: string[] = [];
    let rows: any[][] = [];

    if (type === "sales") {
      headers = [
        "No. Phone", "Nama Pakej", "Date Closed", "Tarikh Trip", 
        "Jumlah Pax", "Harga Pakej", "Total", "Paid", "Status Bayaran", "Staff"
      ];
      rows = data.map(r => [
        r.no_phone || "", r.nama_pakej || "", r.date_closed || "", r.tarikh_trip || "",
        r.jumlah_pax || 0, r.harga_pakej || 0, r.total || 0, r.paid || 0, r.status_bayaran || "", r.staff?.name || ""
      ]);
    } else {
      headers = [
        "Nama Pakej", "Date Lead", "No. Phone", "Lead From", "Follow Up Status", "Staff"
      ];
      rows = data.map(r => [
        r.nama_pakej || "", r.date_lead || "", r.no_phone || "", r.lead_from || "", r.follow_up_status || "", r.staff?.name || ""
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Diluluskan</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Ditolak</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Menunggu</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Download className="w-6 h-6" /> Permohonan Export
        </h2>
        <p className="text-sm text-muted-foreground">Senarai permohonan export data daripada staff</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permohonan Terkini</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p>Tiada permohonan export ditemui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Jenis Laporan</TableHead>
                  <TableHead>Tempoh Data</TableHead>
                  <TableHead>Tarikh Mohon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{req.staff?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {req.report_type} Report
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {req.date_from} hingga {req.date_to}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(req.created_at).toLocaleDateString("ms-MY")}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {req.status === "pending" && isSuperAdmin ? (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 h-8"
                              onClick={() => handleAction(req.id, "approve")}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                              Lulus
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                              onClick={() => handleAction(req.id, "reject")}
                              disabled={processingId === req.id}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Tolak
                            </Button>
                          </>
                        ) : req.status === "approved" ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 h-8"
                            onClick={() => handleAction(req.id, "approve")} // Re-download
                          >
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
