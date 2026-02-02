"use client";

import { useState, useEffect } from "react";
import { 
  Send, 
  Plus, 
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  Users,
  Upload,
  Zap,
  MoreVertical,
  History,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BlastingJob {
  id: string;
  name: string;
  template_id: string;
  total_recipients: number;
  status: "PENDING" | "SENDING" | "COMPLETED" | "FAILED";
  scheduled_at: string;
  created_at: string;
}

export function BlastingContent() {
  const { user, isAdmin } = useAuth();
  const [jobs, setJobs] = useState<BlastingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);

  const [newJob, setNewJob] = useState({
    name: "",
    template_id: "",
    scheduled_at: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/whatsapp/blasting");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> WhatsApp Blasting
          </h2>
          <p className="text-muted-foreground">Hantar mesej pukal kepada pelanggan dan lead</p>
        </div>

        <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Kempen Blasting Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Jumlah Mesej Bulan Ini</CardDescription>
            <CardTitle className="text-2xl">12,450</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-emerald-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-emerald-600">Kadar Berjaya</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">98.2%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-rose-50 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-rose-600">Kadar Gagal</CardDescription>
            <CardTitle className="text-2xl text-rose-700">1.8%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4" /> Rekod Kempen</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input placeholder="Cari kempen..." className="pl-8 h-8 text-xs w-48" />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-10">Memuatkan...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">Tiada kempen blasting ditemui</p>
            </div>
          ) : (
            jobs.map(job => (
              <Card key={job.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{job.name}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {job.total_recipients} Penerima</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(job.scheduled_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={job.status === "COMPLETED" ? "secondary" : "outline"} className={cn(
                      job.status === "COMPLETED" && "bg-emerald-100 text-emerald-700"
                    )}>
                      {job.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Card className="bg-slate-900 text-white border-none overflow-hidden relative">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h4 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> Polisi Anti-Ban</h4>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Sistem blasting Kembara Sufi menggunakan teknologi <b>Random Delay</b> dan <b>Human-like Typing Simulation</b> untuk mengurangkan risiko akaun WhatsApp disekat. Kami menasihatkan agar tidak menghantar lebih daripada 500 mesej sehari bagi setiap nombor.
              </p>
            </div>
            <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">Lihat Panduan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
