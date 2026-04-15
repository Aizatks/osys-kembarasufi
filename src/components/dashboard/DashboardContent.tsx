"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, LayoutDashboard, Filter, BarChart2, Package } from "lucide-react";
import dynamic from "next/dynamic";
import { DashboardStats } from "./DashboardStats";

const SalesChart = dynamic(() => import("./SalesChart").then(mod => mod.SalesChart), { 
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});

const LeadsChart = dynamic(() => import("./LeadsChart").then(mod => mod.LeadsChart), { 
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});

const StaffChart = dynamic(() => import("./StaffChart").then(mod => mod.StaffChart), { 
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});

import { TopStaffTable } from "./TopStaffTable";
import { RecentSalesTable } from "./RecentSalesTable";
import { OverdueFollowUpsTable } from "./OverdueFollowUpsTable";
import { UpcomingTripsTable } from "./UpcomingTripsTable";
import { MarketingReport } from "./MarketingReport";
import { MarketingSpendingForm } from "./MarketingSpendingForm";

interface DashboardData {
  summary: {
    totalSales: number;
    totalLeads: number;
    conversionRate: number;
    outstandingPayment: number;
    totalPax: number;
    newLeadsThisWeek: number;
  };
  charts: {
    salesTrend: { month: string; sales: number; leads: number; pax: number; closingRate: number }[];
    leadsBySource: { source: string; count: number }[];
    paymentBreakdown: { status: string; count: number }[];
    staffStats: { name: string; sales: number; leads: number; amount: number; pax: number; closingRate: number }[];
  };
  tables: {
    topStaff: { name: string; sales: number; leads: number; amount: number; pax: number; closingRate: number }[];
    recentSales: { id: string; nama_pakej: string; total: string; date_closed: string; status_bayaran: string; nama_wakil_peserta: string }[];
    overdueFollowUps: { id: string; nama_pakej: string; no_phone: string; date_follow_up: string; follow_up_status: string; staff_name?: string; staff_overdue_count?: number }[];
    upcomingTrips: { id: string; nama_pakej: string; tarikh_trip: string; tarikh_trip_iso: string | null; jumlah_pax: string; nama_wakil_peserta: string; no_phone?: string }[];
    packagePerformance?: { name: string; pax: number; amount: number; count: number }[];
  };
  staff: { id: string; name: string; role: string }[];
}

interface Permission {
  role: string;
  view_id: string;
  is_enabled: boolean;
}

export function DashboardContent() {
  const { token, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [preset, setPreset] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (showCustomDate && dateFrom) params.set('dateFrom', dateFrom);
      if (showCustomDate && dateTo) params.set('dateTo', dateTo);
      if (!showCustomDate && preset) params.set('preset', preset);
      if (staffId && staffId !== 'all') params.set('staffId', staffId);
      
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuatkan data');
      }
      
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ralat tidak diketahui');
    } finally {
      setLoading(false);
    }
    }, [token, preset, dateFrom, dateTo, staffId, showCustomDate]);

  const fetchPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
    fetchPermissions();
  }, [fetchDashboard, fetchPermissions]);

  const ADMIN_ROLES_LOCAL = ['admin', 'superadmin', 'pengurus', 'c-suite', 'sales-marketing-manager', 'asst-sales-marketing-manager', 'admin-manager', 'hr-manager', 'finance-manager', 'tour-coordinator-manager'];
  const isAdmin = ADMIN_ROLES_LOCAL.includes(user?.role || '');
  const isSuperAdmin = user?.role === 'superadmin';
  const isMarketing = user?.role === 'marketing' || user?.role === 'sales-marketing-manager' || user?.role === 'asst-sales-marketing-manager';
  
  const canViewAllStaff = isSuperAdmin || permissions.some(
    p => p.role === user?.role && p.view_id === 'view-all-staff' && p.is_enabled
  );

  // Set default tab based on role — must be before any early return
  useEffect(() => {
    if (isMarketing && activeTab === "general") {
      setActiveTab("marketing");
    }
  }, [isMarketing, activeTab]);

  if (!isAdmin && !isMarketing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Akses dinafikan</p>
      </div>
    );
  }

  // Calculate dates for MarketingReport if using presets
  let mDateFrom = dateFrom;
  let mDateTo = dateTo;
  
  if (!showCustomDate) {
    const now = new Date();
    if (preset === 'today') {
      mDateFrom = now.toISOString().split('T')[0];
      mDateTo = now.toISOString().split('T')[0];
    } else if (preset === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      mDateFrom = weekAgo.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      mDateFrom = monthStart.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    } else if (preset === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      mDateFrom = yearStart.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isMarketing || activeTab === "marketing" && (
            <MarketingSpendingForm onSuccess={() => fetchDashboard()} />
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="py-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Tempoh</Label>
              <Select 
                value={showCustomDate ? 'custom' : preset} 
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setShowCustomDate(true);
                  } else {
                    setShowCustomDate(false);
                    setPreset(v);
                  }
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCustomDate && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Dari</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hingga</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </>
            )}

            {canViewAllStaff && data?.staff && data.staff.length > 0 && activeTab === "general" && (
              <div className="space-y-1">
                <Label className="text-xs">Staff</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Semua Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Staff</SelectItem>
                    {data.staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isMarketing ? (
        <div className="mt-6">
          <MarketingReport dateFrom={mDateFrom} dateTo={mDateTo} />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              General Dashboard
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Marketing Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <DashboardSkeleton />
            ) : data ? (
              <>
                <DashboardStats data={data.summary} />
                
                <SalesChart 
                  salesTrend={data.charts.salesTrend} 
                  paymentBreakdown={data.charts.paymentBreakdown} 
                />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <LeadsChart leadsBySource={data.charts.leadsBySource} />
                  <StaffChart staffStats={data.charts.staffStats} />
                </div>

                {/* Prestasi Pakej */}
                {data.tables.packagePerformance && data.tables.packagePerformance.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold text-lg">Prestasi Pakej</h3>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {data.tables.packagePerformance.map((pkg, idx) => {
                          const maxPax = Math.max(...data.tables.packagePerformance!.map(p => p.pax));
                          return (
                            <div key={pkg.name} className="flex items-center gap-3">
                              <span className="text-sm font-bold text-muted-foreground w-7 text-right">#{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium truncate">{pkg.name}</span>
                                  <div className="flex items-center gap-3 flex-shrink-0 ml-2 text-sm">
                                    <span className="font-bold text-blue-600">{pkg.pax} Pax</span>
                                    <span className="text-muted-foreground">RM {pkg.amount.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (pkg.pax / (maxPax || 1)) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <TopStaffTable data={data.tables.topStaff} />
                  <RecentSalesTable data={data.tables.recentSales} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <OverdueFollowUpsTable data={data.tables.overdueFollowUps} />
                  <UpcomingTripsTable data={data.tables.upcomingTrips} />
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="marketing" className="mt-6">
            <MarketingReport dateFrom={mDateFrom} dateTo={mDateTo} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}
