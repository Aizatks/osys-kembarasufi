"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Send, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Check,
  X,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CreativeRequestsContent() {
  const { user, isMedia, isVideoGraphic, isAdmin } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const isCreativeStaff = isAdmin || isMedia || isVideoGraphic;

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/creative-requests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/creative-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.get("title"),
            description: formData.get("description"),
            request_type: formData.get("request_type"),
            priority: formData.get("priority"),
            deadline: formData.get("deadline"),
            reference_url: formData.get("reference_url"),
            requester_id: user?.id
          })

      });

      if (response.ok) {
        toast({ title: "Berjaya", description: "Permohonan kreatif telah dihantar" });
        setIsRequestOpen(false);
        fetchRequests();
      }
    } catch (error: any) {
      toast({ title: "Ralat", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, resultUrl?: string) => {
    try {
      const response = await fetch('/api/creative-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          assigned_to: user?.id,
          result_url: resultUrl,
          userId: user?.id
        })
      });

      if (response.ok) {
        toast({ title: "Berjaya", description: `Status permohonan dikemaskini ke ${status}` });
        fetchRequests();
      }
    } catch (error: any) {
      toast({ title: "Ralat", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pending</span>;
      case 'in_progress': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">In Progress</span>;
      case 'completed': return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Completed</span>;
      case 'rejected': return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-500" /> Creative Request
          </h2>
          <p className="text-sm text-muted-foreground">Mohon poster, video atau bahan pemasaran</p>
        </div>

        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Buat Permohonan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Permohonan Bahan Kreatif</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRequest} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tajuk Permohonan</Label>
                <Input name="title" placeholder="cth: Poster Promo Cuti Sekolah" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Bahan</Label>
                  <Select name="request_type" defaultValue="Poster" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Poster">Poster</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="Itinerary">Itinerary</SelectItem>
                      <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioriti</Label>
                  <Select name="priority" defaultValue="medium" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Rendah</SelectItem>
                      <SelectItem value="medium">Sederhana</SelectItem>
                      <SelectItem value="high">Tinggi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tarikh Diperlukan</Label>
                <Input name="deadline" type="date" required />
              </div>
                <div className="space-y-2">
                  <Label>Keterangan Lanjut</Label>
                  <Textarea name="description" placeholder="Sila nyatakan saiz, tema atau maklumat penting..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Rujukan / Contoh (Link URL)</Label>
                  <Input name="reference_url" placeholder="cth: https://pinterest.com/pin/..." />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>

                {submitting ? "Menghantar..." : "Hantar Permohonan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Semua</p>
              <h4 className="text-xl font-bold text-blue-900 dark:text-blue-100">{requests.length}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Menunggu</p>
              <h4 className="text-xl font-bold text-amber-900 dark:text-amber-100">{requests.filter(r => r.status === 'pending').length}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Siap</p>
              <h4 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{requests.filter(r => r.status === 'completed').length}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Filter className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 border-none bg-transparent p-0 focus:ring-0">
                  <SelectValue placeholder="Tapis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))
        ) : requests.length === 0 ? (
          <div className="py-20 text-center">
            <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Tiada permohonan ditemui</p>
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{request.title}</h3>
                      {getStatusBadge(request.status)}
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        request.priority === 'high' ? "bg-rose-100 text-rose-700" : 
                        request.priority === 'medium' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {request.priority}
                      </span>
                    </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                        {request.description || "Tiada keterangan tambahan"}
                      </p>
                      {request.reference_url && (
                        <div className="mb-4">
                          <a 
                            href={request.reference_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Lihat Rujukan / Contoh
                          </a>
                        </div>
                      )}

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Oleh: <span className="font-medium text-slate-700 dark:text-slate-300">{request.requester?.name}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline: <span className="font-medium text-rose-600">{new Date(request.deadline).toLocaleDateString()}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Jenis: <span className="font-medium text-slate-700 dark:text-slate-300">{request.request_type}</span></span>
                      </div>
                      {request.assignee && (
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-500" />
                          <span>Assign: <span className="font-medium text-blue-600">{request.assignee.name}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-2 md:w-48">
                    {isCreativeStaff && request.status === 'pending' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request.id, 'in_progress')} className="w-full bg-blue-600">
                        Terima Tugasan
                      </Button>
                    )}
                    
                    {isCreativeStaff && request.status === 'in_progress' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="w-full bg-emerald-600">
                            Selesaikan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Selesaikan Permohonan</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>URL Hasil (Link Download/View)</Label>
                              <Input id="result_url" placeholder="https://..." />
                            </div>
                            <Button className="w-full" onClick={() => {
                              const url = (document.getElementById('result_url') as HTMLInputElement).value;
                              handleUpdateStatus(request.id, 'completed', url);
                            }}>
                              Hantar Hasil
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {request.status === 'completed' && request.result_url && (
                      <Button size="sm" variant="outline" className="w-full border-emerald-600 text-emerald-600" asChild>
                        <a href={request.result_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Lihat Hasil
                        </a>
                      </Button>
                    )}

                    {isCreativeStaff && request.status !== 'completed' && request.status !== 'rejected' && (
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(request.id, 'rejected')} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                        Tolak
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
