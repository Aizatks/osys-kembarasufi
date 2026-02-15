"use client";

import { useState, useEffect } from "react";
import { Sidebar, ActiveView } from "./Sidebar";
import { SalesReportTab } from "./SalesReportTab";
import { LeadReportTab } from "./LeadReportTab";
import { DashboardContent } from "./dashboard/DashboardContent";
import { StaffContent } from "./StaffContent";
import { QuotationsContent } from "./QuotationsContent";
import { TaskManagementTab } from "./tasks/TaskManagementTab";
import { TaskScoreDashboard } from "./tasks/TaskScoreDashboard";
import { TaskTemplateManager } from "./tasks/TaskTemplateManager";
import { CustomTaskForm } from "./tasks/CustomTaskForm";
import { MarketingReportContent } from "./MarketingReportContent";
import { MediaLibraryContent } from "./MediaLibraryContent";
import { CreativeRequestsContent } from "./CreativeRequestsContent";
import { SettingsContent } from "./SettingsContent";
import { WhatsAppContent } from "./WhatsAppContent";
import { AttendanceContent } from "./hr/AttendanceContent";
import { MemoContent } from "./hr/MemoContent";
import { ClaimContent } from "./hr/ClaimContent";
import { StaffDocsContent } from "./hr/StaffDocsContent";
import { WorkspaceContent } from "./hr/WorkspaceContent";
import { PayrollContent } from "./hr/PayrollContent";
import { RecruitmentContent } from "./hr/RecruitmentContent";
import { InternContent } from "./hr/InternContent";
import { CalendarContent } from "./hr/CalendarContent";
import { RosterContent } from "./operations/RosterContent";
import { TripDatesContent } from "./operations/TripDatesContent";
import { PricingSettingsContent } from "./operations/PricingSettingsContent";
import { RotatorContent } from "./whatsapp/RotatorContent";
import { MonitoringContent } from "./whatsapp/MonitoringContent";
import { WADashboardContent } from "./whatsapp/WADashboardContent";
import { BlastingContent } from "./whatsapp/BlastingContent";
import { ConnectionMonitor } from "./whatsapp/ConnectionMonitor";
import { PersonalChatView } from "./whatsapp/PersonalChatView";
import { AgentOrders } from "./agent/AgentOrders";
import { AgentReports } from "./agent/AgentReports";
import { ExportRequestsContent } from "./ExportRequestsContent";
import { 
  Activity, 

  Loader2, 
  Search, 
  Calendar, 
  User, 
  LogIn, 
  Plus, 
  Edit, 
  Trash, 
  Download, 
  FileText,
  Eye,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

interface ActivityLog {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

const getActionIcon = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("login")) return <LogIn className="w-4 h-4" />;
  if (a.includes("create") || a.includes("add")) return <Plus className="w-4 h-4" />;
  if (a.includes("update") || a.includes("edit")) return <Edit className="w-4 h-4" />;
  if (a.includes("delete") || a.includes("remove")) return <Trash className="w-4 h-4" />;
  if (a.includes("export") || a.includes("download")) return <Download className="w-4 h-4" />;
  if (a.includes("impersonate") || a.includes("view")) return <Eye className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const getActionColor = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("login")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400";
  if (a.includes("create") || a.includes("add")) return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400";
  if (a.includes("update") || a.includes("edit")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400";
  if (a.includes("delete") || a.includes("remove")) return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400";
  if (a.includes("export")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400";
  if (a.includes("impersonate")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400";
  return "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300";
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    login: "Log Masuk",
    create_quotation: "Buat Sebut Harga",
    update_quotation: "Kemaskini Sebut Harga",
    delete_quotation: "Padam Sebut Harga",
    impersonate_start: "Mula Impersonate",
    impersonate_end: "Tamat Impersonate",
    export_data: "Eksport Data",
    approve_staff: "Luluskan Staff",
    reject_staff: "Tolak Staff",
  };
  return labels[action] || action;
};

function ActivityLogsContent() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");
      if (search) params.append("search", search);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      
      const response = await fetch(`/api/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Anda tidak mempunyai akses ke halaman ini</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6" /> Log Aktiviti
        </h2>
        <p className="text-sm text-muted-foreground">Pantau semua aktiviti sistem</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari aktiviti, pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 text-sm"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 text-sm"
          />
          <Button size="sm" onClick={handleSearch}>Cari</Button>
          {(dateFrom || dateTo || search) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); setPage(1); fetchLogs(); }}
              className="text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktiviti Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tiada log aktiviti</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className={`p-2 rounded-lg shrink-0 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.staffName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelum
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Seterusnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function MainLayout({ children }: Props) {
  const { user, isMarketing } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>("kalkulator");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isMarketing) {
      setActiveView("marketing-report");
    }
  }, [isMarketing]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const handleCollapsedChange = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("sidebar_collapsed", JSON.stringify(collapsed));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isCollapsed={isCollapsed}
        onCollapsedChange={handleCollapsedChange}
      />
      
      <main className="flex-1 bg-[#f8fafc] dark:bg-slate-900 overflow-auto">
        <div className="p-4 lg:p-6 pb-20">
            {activeView === "kalkulator" && children}
            {activeView === "dashboard-overview" && <DashboardContent />}
            {activeView === "dashboard-sales" && <SalesReportTab />}
            {activeView === "dashboard-leads" && <LeadReportTab />}
            {activeView === "staff" && <StaffContent />}
            {activeView === "quotations" && <QuotationsContent />}
            {activeView === "activity-logs" && <ActivityLogsContent />}
            {activeView === "marketing-report" && <MarketingReportContent />}
            {activeView === "tasks" && <TaskManagementTab />}
            {activeView === "task-scores" && <TaskScoreDashboard />}
              {activeView === "task-templates" && <TaskTemplateManager />}
              {activeView === "task-custom" && <CustomTaskForm />}
                {activeView === "media-library" && <MediaLibraryContent />}
                  {activeView === "creative-requests" && <CreativeRequestsContent />}
                  {activeView === "whatsapp" && <WhatsAppContent />}
                  {activeView === "settings" && <SettingsContent />}
                  
                    {/* New HR & Ops Views */}
                    {activeView === "hr-attendance" && <AttendanceContent />}
                    {activeView === "hr-memos" && <MemoContent />}
                    {activeView === "hr-claims" && <ClaimContent />}
                    {activeView === "hr-staff-docs" && <StaffDocsContent />}
                    {activeView === "hr-payroll" && <PayrollContent />}
                    {activeView === "hr-recruitment" && <RecruitmentContent />}
                    {activeView === "hr-interns" && <InternContent />}
                    {activeView === "workspaces" && <WorkspaceContent />}
                    {activeView === "calendar" && <CalendarContent />}

                    {activeView === "operations-roster" && <RosterContent />}
                    {activeView === "trip-dates" && <TripDatesContent />}
                    {activeView === "package-pricing" && <PricingSettingsContent />}
                    {activeView === "whatsapp-rotator" && <RotatorContent />}
                      {activeView === "whatsapp-blasting" && <BlastingContent />}
                      {activeView === "whatsapp-monitoring" && <MonitoringContent />}
                      {activeView === "whatsapp-dashboard" && <WADashboardContent />}
                        {activeView === "whatsapp-connections" && <ConnectionMonitor />}
                        {activeView === "whatsapp-chat" && <PersonalChatView />}

                      {/* Agent Views */}
                      {activeView === "agent-orders" && <AgentOrders />}
                        {activeView === "agent-reports" && <AgentReports />}
                        {activeView === "export-requests" && <ExportRequestsContent />}

                </div>


        </main>
    </div>
  );
}
