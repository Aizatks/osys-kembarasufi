"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  LayoutDashboard, 
  ChevronDown, 
  ChevronRight,
  Menu,
  X,
  LogOut,
  Activity,
  Users2,
  PanelLeftClose,
  PanelLeft,
  BarChart2,
  BarChart3,
  CheckSquare,
  Settings,
  Pin,
    Trophy,
    Film,
    Palette,
    Send,
    Clock,
    FileText,
    Wallet,
    UserCircle,
    Banknote,
    Briefcase,
    GraduationCap,
    Folder,
    Calendar as CalendarIcon,
    Plane,
    CalendarRange,
    Tag,
    RefreshCw,
    Monitor,
    FileBarChart,
    Image,
    Plus,
    Download
  } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
  
  export type ActiveView = "kalkulator" | "dashboard-overview" | "dashboard-sales" | "dashboard-leads" | "marketing-report" | "staff" | "quotations" | "activity-logs" | "tasks" | "task-scores" | "task-templates" | "task-custom" | "media-library"   | "creative-requests"
  | "settings"
  | "whatsapp"
  | "hr-attendance"
  | "hr-attendance-settings"
  | "hr-memos"
  | "hr-claims"
  | "hr-staff-docs"
  | "hr-payroll"
  | "hr-recruitment"
  | "hr-interns"
  | "workspaces"
  | "calendar"
  | "operations-roster"
  | "trip-dates"
  | "package-pricing"
  | "whatsapp-rotator"
  | "whatsapp-blasting"
    | "whatsapp-monitoring"
    | "agent-orders"
    | "agent-reports"
    | "export-requests";

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ activeView, onViewChange, isCollapsed, onCollapsedChange }: SidebarProps) {
    const { user, logout, isSales, isAdmin, isMarketing, isSuperAdmin, isAgent, isStaff, isFinance, isHR, isMedia } = useAuth();
    const [isLaporanOpen, setIsLaporanOpen] = useState(activeView.startsWith("dashboard") || activeView === "marketing-report" || activeView === "quotations");
    const [isTaskOpen, setIsTaskOpen] = useState(activeView.startsWith("task"));
    const [isHROpen, setIsHROpen] = useState(activeView.startsWith("hr"));
    const [isOperationsOpen, setIsOperationsOpen] = useState(activeView === "operations-roster" || activeView === "trip-dates" || activeView === "calendar" || activeView === "package-pricing");
    const [isMediaOpen, setIsMediaOpen] = useState(activeView === "media-library" || activeView === "creative-requests");
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(activeView.startsWith("whatsapp") && activeView !== "whatsapp");
    const [isFinanceOpen, setIsFinanceOpen] = useState(activeView === "agent-reports");
    const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPermissions();
  }, []);

    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/settings/permissions", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const permMap: Record<string, boolean> = {};
          
          data.permissions.forEach((p: any) => {
            if (p.role === user?.role) {
              permMap[p.view_id] = p.is_enabled;
            }
          });
          
          setPermissions(permMap);
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };

    const hasPermission = (viewId: string, defaultAccess: boolean) => {
      if (isSuperAdmin) return true;
      if (permissions[viewId] !== undefined) return permissions[viewId];
      
      // Fallback to default logic for new roles
      if (user?.role === 'operation' && ['operations-roster', 'trip-dates', 'calendar'].includes(viewId)) return true;
      if (['media-videographic', 'media-graphic', 'video-graphic', 'creative-designer', 'social-media'].includes(user?.role || '') && ['media-library', 'creative-requests'].includes(viewId)) return true;
      if (isFinance && ['dashboard-sales', 'hr-payroll', 'agent-reports'].includes(viewId)) return true;
      if (isHR && ['hr-attendance', 'hr-staff-docs', 'staff', 'hr-recruitment', 'hr-interns'].includes(viewId)) return true;
      
      return defaultAccess;
    };

  const canSeeSalesReports = hasPermission("dashboard-sales", isSales || isAdmin || isFinance);
  const canSeeMarketing = hasPermission("marketing-report", isMarketing || isAdmin);
  const canSeeDashboard = hasPermission("dashboard-overview", isAdmin);
  const canSeeLeadReport = hasPermission("dashboard-leads", isAdmin || isSales);
  const canSeeStaff = hasPermission("staff", isAdmin || isHR);
  const canSeeLogs = hasPermission("activity-logs", isAdmin);
  const canSeeQuotations = hasPermission("quotations", isSales || isAdmin);
  const canSeeMedia = hasPermission("media-library", isMedia || isAdmin);
  const canSeeCreative = hasPermission("creative-requests", isMedia || isAdmin);
  const canSeeTasks = hasPermission("tasks", isStaff);
  const canSeeTaskScores = hasPermission("task-scores", isAdmin);
  const canSeeTaskTemplates = hasPermission("task-templates", isAdmin);
  const canSeeTaskCustom = hasPermission("task-custom", isStaff);

  const canSeeHR = hasPermission("hr-attendance", isAdmin || isHR);
  const canSeeMemos = hasPermission("hr-memos", isStaff);
  const canSeeClaims = hasPermission("hr-claims", isStaff);
  const canSeeStaffDocs = hasPermission("hr-staff-docs", isStaff || isHR);
  const canSeePayroll = hasPermission("hr-payroll", isAdmin || isHR || isFinance);
  const canSeeRecruitment = hasPermission("hr-recruitment", isAdmin || isHR);
  const canSeeInterns = hasPermission("hr-interns", isAdmin || isHR);
  const canSeeWorkspaces = hasPermission("workspaces", isStaff);
  const canSeeCalendar = hasPermission("calendar", isStaff);
  const canSeeOperations = hasPermission("operations-roster", isAdmin || user?.role === 'operation');
  const canSeeTripDates = hasPermission("trip-dates", isStaff);
  const canSeePricing = hasPermission("package-pricing", isAdmin);
  const canSeeWARotator = hasPermission("whatsapp-rotator", isAdmin);
  const canSeeWABlasting = hasPermission("whatsapp-blasting", isAdmin);
  const canSeeWAMonitoring = hasPermission("whatsapp-monitoring", isAdmin);

  const handleViewChange = (view: ActiveView) => {
    onViewChange(view);
    setIsMobileOpen(false);
  };

  const MenuItem = ({ 
    view, 
    icon: Icon, 
    label, 
    isMain = false,
    colorClass = "emerald"
  }: { 
    view: ActiveView; 
    icon: React.ElementType; 
    label: string; 
    isMain?: boolean;
    colorClass?: string;
  }) => {
    const isActive = activeView === view;
    const colorMap: Record<string, { bg: string; text: string; shadow: string }> = {
      emerald: { bg: "bg-emerald-600", text: "text-emerald-400", shadow: "shadow-emerald-600/30" },
      blue: { bg: "bg-blue-600", text: "text-blue-400", shadow: "shadow-blue-600/30" },
      violet: { bg: "bg-violet-600", text: "text-violet-400", shadow: "shadow-violet-600/30" },
      amber: { bg: "bg-amber-600", text: "text-amber-400", shadow: "shadow-amber-600/30" },
      rose: { bg: "bg-rose-600", text: "text-rose-400", shadow: "shadow-rose-600/30" },
    };
    const colors = colorMap[colorClass] || colorMap.emerald;

    const button = (
      <button
        onClick={() => handleViewChange(view)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg text-left transition-all",
          isMain ? "px-3 py-3" : "px-3 py-2.5",
          isCollapsed ? "justify-center" : "",
          isActive
            ? `${colors.bg} text-white shadow-lg ${colors.shadow}`
            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
        )}
      >
        <Icon className={cn("flex-shrink-0", isMain ? "w-5 h-5" : "w-5 h-5")} />
        {!isCollapsed && (
          <span className={cn(isMain ? "font-semibold text-base" : "font-medium text-sm")}>{label}</span>
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const SubMenuItem = ({ 
    view, 
    icon: Icon, 
    label,
    colorClass = "emerald"
  }: { 
    view: ActiveView; 
    icon: React.ElementType; 
    label: string;
    colorClass?: string;
  }) => {
    const isActive = activeView === view;
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      emerald: { bg: "bg-emerald-600/20", text: "text-emerald-400", border: "border-emerald-500" },
      blue: { bg: "bg-blue-600/20", text: "text-blue-400", border: "border-blue-500" },
      violet: { bg: "bg-violet-600/20", text: "text-violet-400", border: "border-violet-500" },
      amber: { bg: "bg-amber-600/20", text: "text-amber-400", border: "border-amber-500" },
      rose: { bg: "bg-rose-600/20", text: "text-rose-400", border: "border-rose-500" },
    };
    const colors = colorMap[colorClass] || colorMap.emerald;

    return (
      <button
        onClick={() => handleViewChange(view)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm",
          isActive
            ? `${colors.bg} ${colors.text} border-l-2 ${colors.border}`
            : "text-slate-400 hover:bg-slate-700/30 hover:text-slate-200"
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={cn("border-b border-slate-700", isCollapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className={cn(
            "rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold",
            isCollapsed ? "w-9 h-9 text-sm" : "w-10 h-10 text-lg"
          )}>
            KS
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-semibold text-sm truncate">Kembara Sufi</h1>
              <p className="text-slate-400 text-xs truncate">Travel & Tours</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {!isCollapsed && (
          <div className="px-3 mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3">Menu Utama</p>
          </div>
        )}

            <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
              <MenuItem view="kalkulator" icon={Calculator} label="Kalkulator" isMain colorClass="emerald" />

              {/* Agent Section - Always show for Agents */}
              {isAgent && (
                <div className="space-y-1 mt-4">
                  {!isCollapsed && (
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Ejen Portal</p>
                  )}
                  <MenuItem view="agent-orders" icon={Plus} label="Hantar Order" colorClass="emerald" />
                  <MenuItem view="agent-reports" icon={FileText} label="Laporan Saya" colorClass="emerald" />
                </div>
              )}

              {/* Staff Sections */}
              {isStaff && (
                <>
                  {/* Laporan Group */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        {canSeeMarketing && <MenuItem view="marketing-report" icon={BarChart2} label="Marketing Report" colorClass="violet" />}
                        {canSeeSalesReports && <MenuItem view="dashboard-sales" icon={TrendingUp} label="Sales Report" colorClass="amber" />}
                        {canSeeLeadReport && <MenuItem view="dashboard-leads" icon={Users} label="Lead Report" colorClass="blue" />}
                        {canSeeQuotations && <MenuItem view="quotations" icon={BarChart3} label="Sebut Harga" colorClass="amber" />}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsLaporanOpen(!isLaporanOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            isLaporanOpen ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <FileBarChart className="w-5 h-5 flex-shrink-0 text-violet-400" />
                            <span className="font-medium text-sm">Laporan</span>
                          </div>
                          {isLaporanOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isLaporanOpen && (
                          <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                            {canSeeDashboard && <SubMenuItem view="dashboard-overview" icon={LayoutDashboard} label="Overview" colorClass="violet" />}
                            {canSeeMarketing && <SubMenuItem view="marketing-report" icon={BarChart2} label="Marketing Report" colorClass="violet" />}
                            {canSeeSalesReports && <SubMenuItem view="dashboard-sales" icon={TrendingUp} label="Sales Report" colorClass="amber" />}
                              {canSeeLeadReport && <SubMenuItem view="dashboard-leads" icon={Users} label="Lead Report" colorClass="blue" />}
                              {canSeeQuotations && <SubMenuItem view="quotations" icon={BarChart3} label="Sebut Harga" colorClass="amber" />}
                              {isAdmin && <SubMenuItem view="export-requests" icon={Download} label="Permohonan Export" colorClass="violet" />}
                            </div>

                        )}
                      </div>
                    )}
                  </div>

                  {/* Task Group */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        <MenuItem view="tasks" icon={CheckSquare} label="Task Harian" colorClass="amber" />
                        {canSeeTaskScores && <MenuItem view="task-scores" icon={Trophy} label="Skor Task" colorClass="amber" />}
                        <MenuItem view="task-custom" icon={Pin} label="Task Khas" colorClass="amber" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsTaskOpen(!isTaskOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            activeView.startsWith("task") || activeView === "tasks" ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 flex-shrink-0 text-amber-400" />
                            <span className="font-medium text-sm">Task Management</span>
                          </div>
                          {isTaskOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isTaskOpen && (
                          <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                            <SubMenuItem view="tasks" icon={CheckSquare} label="Task Harian" colorClass="amber" />
                            {canSeeTaskScores && <SubMenuItem view="task-scores" icon={Trophy} label="Skor Pasukan" colorClass="amber" />}
                            {canSeeTaskTemplates && <SubMenuItem view="task-templates" icon={Settings} label="Urus Template" colorClass="amber" />}
                            <SubMenuItem view="task-custom" icon={Pin} label="Task Khas" colorClass="amber" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bahan Media Group */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        {canSeeMedia && <MenuItem view="media-library" icon={Film} label="Media Library" colorClass="violet" />}
                        {canSeeCreative && <MenuItem view="creative-requests" icon={Send} label="Creative Request" colorClass="blue" />}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsMediaOpen(!isMediaOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            isMediaOpen ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Image className="w-5 h-5 flex-shrink-0 text-violet-400" />
                            <span className="font-medium text-sm">Bahan Media</span>
                          </div>
                          {isMediaOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isMediaOpen && (
                          <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                            {canSeeMedia && <SubMenuItem view="media-library" icon={Film} label="Media Library" colorClass="violet" />}
                            {canSeeCreative && <SubMenuItem view="creative-requests" icon={Palette} label="Creative Request" colorClass="blue" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* HR Section */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        {canSeeHR && <MenuItem view="hr-attendance" icon={Clock} label="Attendance" colorClass="blue" />}
                        {canSeeMemos && <MenuItem view="hr-memos" icon={FileText} label="Memo" colorClass="blue" />}
                        {canSeeClaims && <MenuItem view="hr-claims" icon={Wallet} label="Claim" colorClass="blue" />}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsHROpen(!isHROpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            activeView.startsWith("hr") ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <UserCircle className="w-5 h-5 flex-shrink-0 text-blue-400" />
                            <span className="font-medium text-sm">HR & Staff</span>
                          </div>
                          {isHROpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                          {isHROpen && (
                            <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                              {canSeeHR && <SubMenuItem view="hr-attendance" icon={Clock} label="Attendance" colorClass="blue" />}
                              {isAdmin && <SubMenuItem view="hr-attendance-settings" icon={Settings} label="Tetapan Kehadiran" colorClass="blue" />}
                              {canSeeMemos && <SubMenuItem view="hr-memos" icon={FileText} label="Memo" colorClass="blue" />}
                            {canSeeClaims && <SubMenuItem view="hr-claims" icon={Wallet} label="Claim" colorClass="blue" />}
                            {canSeeStaffDocs && <SubMenuItem view="hr-staff-docs" icon={FileText} label="Dokumen Staff" colorClass="blue" />}
                            {canSeePayroll && <SubMenuItem view="hr-payroll" icon={Banknote} label="Payroll" colorClass="blue" />}
                            {canSeeRecruitment && <SubMenuItem view="hr-recruitment" icon={Briefcase} label="Recruitment" colorClass="blue" />}
                            {canSeeInterns && <SubMenuItem view="hr-interns" icon={GraduationCap} label="Intern" colorClass="blue" />}
                            {canSeeStaff && <SubMenuItem view="staff" icon={Users2} label="Pengurusan Staff" colorClass="blue" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operasi Section */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        {canSeeCalendar && <MenuItem view="calendar" icon={CalendarIcon} label="Kalendar" colorClass="emerald" />}
                        {canSeeOperations && <MenuItem view="operations-roster" icon={Plane} label="Airport Duty" colorClass="rose" />}
                        {canSeeTripDates && <MenuItem view="trip-dates" icon={CalendarRange} label="Trip Dates" colorClass="rose" />}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsOperationsOpen(!isOperationsOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            isOperationsOpen ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Plane className="w-5 h-5 flex-shrink-0 text-rose-400" />
                            <span className="font-medium text-sm">Operasi</span>
                          </div>
                          {isOperationsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isOperationsOpen && (
                          <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                            {canSeeCalendar && <SubMenuItem view="calendar" icon={CalendarIcon} label="Kalendar" colorClass="emerald" />}
                            {canSeeOperations && <SubMenuItem view="operations-roster" icon={Plane} label="Airport Duty" colorClass="rose" />}
                            {canSeeTripDates && <SubMenuItem view="trip-dates" icon={CalendarRange} label="Tarikh Trip 2026" colorClass="rose" />}
                            {canSeePricing && <SubMenuItem view="package-pricing" icon={Tag} label="Tetapan Harga Pakej" colorClass="amber" />}
                            {canSeeWorkspaces && <SubMenuItem view="workspaces" icon={Folder} label="Workspace" colorClass="emerald" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Section */}
                  <div className="space-y-1">
                    {isCollapsed ? (
                      <div className="space-y-1">
                        <MenuItem view="whatsapp" icon={Send} label="WhatsApp" colorClass="emerald" />
                        {canSeeWARotator && <MenuItem view="whatsapp-rotator" icon={RefreshCw} label="Rotator" colorClass="emerald" />}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsWhatsAppOpen(!isWhatsAppOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all",
                            activeView.startsWith("whatsapp") ? "bg-slate-700/70 text-white" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Send className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                            <span className="font-medium text-sm">WhatsApp</span>
                          </div>
                          {isWhatsAppOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isWhatsAppOpen && (
                          <div className="ml-4 pl-4 border-l border-slate-700 space-y-1">
                            <SubMenuItem view="whatsapp" icon={Send} label="Utama" colorClass="emerald" />
                            {canSeeWARotator && <SubMenuItem view="whatsapp-rotator" icon={RefreshCw} label="WA Rotator" colorClass="emerald" />}
                            {canSeeWABlasting && <SubMenuItem view="whatsapp-blasting" icon={Send} label="WA Blasting" colorClass="emerald" />}
                            {canSeeWAMonitoring && <SubMenuItem view="whatsapp-monitoring" icon={Monitor} label="Monitoring" colorClass="emerald" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {canSeeLogs && <MenuItem view="activity-logs" icon={Activity} label="Log Aktiviti" colorClass="rose" />}

                  {isSuperAdmin && <MenuItem view="settings" icon={Settings} label="Tetapan" colorClass="blue" />}
                </>
              )}
            </nav>
      </div>

      <div className={cn("border-t border-slate-700", isCollapsed ? "p-2" : "p-4")}>
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-700/30 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs capitalize truncate">{user.role}</p>
            </div>
          </div>
        )}
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={logout}
              className={cn(
                "text-slate-400 hover:text-white hover:bg-slate-700/50",
                isCollapsed ? "w-full justify-center px-0" : "w-full justify-start"
              )}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span className="ml-2">Log Keluar</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
              Log Keluar
            </TooltipContent>
          )}
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => onCollapsedChange(!isCollapsed)}
              className={cn(
                "text-slate-400 hover:text-white hover:bg-slate-700/50 mt-1",
                isCollapsed ? "w-full justify-center px-0" : "w-full justify-start"
              )}
            >
              {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              {!isCollapsed && <span className="ml-2">Kecilkan Sidebar</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
              Buka Sidebar
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 text-white hover:bg-slate-700"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-40 bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <SidebarContent />
      </aside>
    </TooltipProvider>
  );
}
