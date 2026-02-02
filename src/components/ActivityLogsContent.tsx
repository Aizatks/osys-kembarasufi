"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Loader2,
  Activity,
  Search,
  Calendar,
  User,
  FileText,
  Edit,
  Trash,
  Plus,
  LogIn,
  Download,
  Upload
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
  staff?: {
    name: string;
    email: string;
  };
}

const getActionIcon = (action: string) => {
  if (action.includes("login") || action.includes("LOGIN")) return <LogIn className="w-4 h-4" />;
  if (action.includes("create") || action.includes("CREATE") || action.includes("add") || action.includes("ADD")) return <Plus className="w-4 h-4" />;
  if (action.includes("update") || action.includes("UPDATE") || action.includes("edit") || action.includes("EDIT")) return <Edit className="w-4 h-4" />;
  if (action.includes("delete") || action.includes("DELETE") || action.includes("remove") || action.includes("REMOVE")) return <Trash className="w-4 h-4" />;
  if (action.includes("export") || action.includes("EXPORT") || action.includes("download") || action.includes("DOWNLOAD")) return <Download className="w-4 h-4" />;
  if (action.includes("import") || action.includes("IMPORT") || action.includes("upload") || action.includes("UPLOAD")) return <Upload className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const getActionColor = (action: string) => {
  if (action.includes("login") || action.includes("LOGIN")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400";
  if (action.includes("create") || action.includes("CREATE") || action.includes("add") || action.includes("ADD")) return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400";
  if (action.includes("update") || action.includes("UPDATE") || action.includes("edit") || action.includes("EDIT")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400";
  if (action.includes("delete") || action.includes("DELETE") || action.includes("remove") || action.includes("REMOVE")) return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400";
  if (action.includes("export") || action.includes("EXPORT")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400";
  if (action.includes("import") || action.includes("IMPORT")) return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400";
  return "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300";
};

export function ActivityLogsContent() {
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
  }, [isAdmin, page, search, dateFrom, dateTo]);

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
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36 text-sm"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36 text-sm"
          />
          {(dateFrom || dateTo || search) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); setPage(1); }}
              className="text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktiviti Terkini ({logs.length})</CardTitle>
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
                  <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      {log.staff && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.staff.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(log.created_at)}</p>
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
