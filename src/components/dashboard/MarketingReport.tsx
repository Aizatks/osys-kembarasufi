"use client";

// Marketing Report Component
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, Wallet, BarChart3, PieChart, Edit2, Trash2, History } from "lucide-react";
import { MarketingSpendingForm } from "./MarketingSpendingForm";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SpendingRecord {
  id: string;
  date: string;
  platform: string;
  is_tiktok_live: boolean;
  nama_pakej: string;
  campaign_name?: string;
  amount: number;
  staff?: { name: string };
}

interface PlatformStat {
  spending: number;
  leads: number;
}

interface PackageReport {
  name: string;
  spending: number;
  pax: number;
  leads: number;
  topCloser: string;
}

interface CampaignSpending {
  name: string;
  amount: number;
}

interface MarketingReportData {
  overview: {
    totalSpending: number;
    totalPax: number;
    totalLeads: number;
    platformStats: Record<string, PlatformStat>;
  };
  packageReport: PackageReport[];
  campaignSpending?: CampaignSpending[];
}

export function MarketingReport({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { token } = useAuth();
  const [data, setData] = useState<MarketingReportData | null>(null);
  const [history, setHistory] = useState<SpendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      
      const [reportRes, historyRes] = await Promise.all([
        fetch(`/api/marketing-report?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/marketing-spending?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const reportResult = await reportRes.json();
      const historyResult = await historyRes.json();

      setData(reportResult);
      setHistory(historyResult.data || []);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const res = await fetch(`/api/marketing-spending?id=${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Rekod berjaya dipadam");
        fetchReport();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal memadam rekod");
      }
    } catch (error) {
      toast.error("Gagal memadam rekod");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <MarketingReportSkeleton />;

  if (!data || !data.overview) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 rounded-xl text-slate-400">
        <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
        <p>Data laporan tidak tersedia atau anda tiada akses.</p>
      </div>
    );
  }

  const { overview, packageReport } = data;
  const cpPax = overview.totalPax > 0 ? (overview.totalSpending / overview.totalPax).toFixed(2) : "0";
  const cpLead = overview.totalLeads > 0 ? (overview.totalSpending / overview.totalLeads).toFixed(2) : "0";

  return (
    <>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="report" className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-slate-800">Analisa Prestasi</TabsTrigger>
            <TabsTrigger value="history" className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-slate-800">Sejarah Spending</TabsTrigger>
          </TabsList>

        <TabsContent value="report" className="space-y-6 mt-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-slate-900 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-400">Total Spending</p>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold">RM {overview.totalSpending.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-400">Total Pax</p>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold">{overview.totalPax} Pax</div>
                <p className="text-xs text-slate-400 mt-1">Cost per Pax: RM {cpPax}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-400">Total Leads</p>
                  <Target className="h-4 w-4 text-orange-400" />
                </div>
                <div className="text-2xl font-bold">{overview.totalLeads} Leads</div>
                <p className="text-xs text-slate-400 mt-1">Cost per Lead: RM {cpLead}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-400">Conversion</p>
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold">
                  {overview.totalLeads > 0 ? ((overview.totalPax / overview.totalLeads) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-slate-400 mt-1">Pax per Lead Ratio</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Platform Spending */}
            <Card className="bg-slate-900 text-white border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-emerald-400" />
                  Spending ikut Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(overview.platformStats).map(([platform, stats]) => (
                    <div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <div>
                        <p className="font-medium">{platform}</p>
                        <p className="text-xs text-slate-400">{stats.leads} Leads</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">RM {stats.spending.toLocaleString()}</p>
                        <p className="text-xs text-emerald-400">
                          {overview.totalSpending > 0 ? ((stats.spending / overview.totalSpending) * 100).toFixed(0) : 0}% share
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Packages summary */}
            <Card className="bg-slate-900 text-white border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Pakej Terlaris (Pax)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packageReport.slice(0, 5).map((pkg, idx) => (
                    <div key={pkg.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="truncate max-w-[200px]">{pkg.name}</span>
                        <span className="font-bold">{pkg.pax} Pax</span>
                      </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (pkg.pax / (Math.max(...packageReport.map(p => p.pax)) || 1)) * 100)}%` }}
                          />
                        </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Package Report */}
          <Card className="bg-slate-900 text-white border-none overflow-hidden">
            <CardHeader>
              <CardTitle>Laporan Prestasi Pakej</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <ShadcnTable>
                <TableHeader className="bg-slate-800/50">
                  <TableRow className="border-slate-700 hover:bg-transparent text-nowrap">
                    <TableHead className="text-slate-400">Pakej</TableHead>
                    <TableHead className="text-slate-400 text-right">Spending</TableHead>
                    <TableHead className="text-slate-400 text-right">Pax</TableHead>
                    <TableHead className="text-slate-400 text-right">Leads</TableHead>
                    <TableHead className="text-slate-400">Top Closer</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {packageReport.map((pkg) => (
                      <TableRow key={pkg.name} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell className="text-right">RM {pkg.spending.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-blue-400">{pkg.pax}</TableCell>
                        <TableCell className="text-right text-orange-400">{pkg.leads}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                            {pkg.topCloser}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </ShadcnTable>
              </CardContent>
            </Card>

            {/* Campaign Spending (non-package) */}
            {data?.campaignSpending && data.campaignSpending.length > 0 && (
              <Card className="bg-slate-900 text-white border-none overflow-hidden">
                <CardHeader>
                  <CardTitle>Kempen Lain (Bukan Pakej)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <ShadcnTable>
                    <TableHeader className="bg-slate-800/50">
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-400">Nama Kempen</TableHead>
                        <TableHead className="text-slate-400 text-right">Spending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.campaignSpending.map((campaign, idx) => (
                        <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/30">
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="text-right">RM {campaign.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="bg-slate-900 text-white border-none overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-400" />
                Sejarah Perbelanjaan
              </CardTitle>
              <MarketingSpendingForm onSuccess={fetchReport} />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <ShadcnTable>
                  <TableHeader className="bg-slate-800/50">
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-400">Tarikh</TableHead>
                      <TableHead className="text-slate-400">Nama Kempen/Pakej</TableHead>
                      <TableHead className="text-slate-400">Platform</TableHead>
                      <TableHead className="text-slate-400 text-right">Jumlah (RM)</TableHead>
                      <TableHead className="text-slate-400 text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>{record.date}</TableCell>
                        <TableCell className="font-medium">{record.campaign_name || record.nama_pakej || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                          {record.platform} {record.is_tiktok_live && "(Live)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <MarketingSpendingForm 
                            initialData={record} 
                            onSuccess={fetchReport}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                          Tiada rekod spending ditemui
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </ShadcnTable>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Padam Rekod?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Adakah anda pasti mahu memadam rekod ini? Tindakan ini tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MarketingReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] bg-slate-800 rounded-xl" />
        <Skeleton className="h-[300px] bg-slate-800 rounded-xl" />
      </div>
      <Skeleton className="h-[400px] bg-slate-800 rounded-xl" />
    </div>
  );
}
