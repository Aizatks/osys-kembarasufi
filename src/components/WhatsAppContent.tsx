"use client";

import { useState, useEffect } from "react";
import { MessageSquare, QrCode, CheckCircle2, AlertCircle, RefreshCw, Loader2, Save, Send, Settings2, Smartphone, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { waUrl } from "@/lib/wa-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  name: string;
  content: string;
}

const STATUS_MAP: Record<string, 'INITIALIZING' | 'QR' | 'READY' | 'DISCONNECTED' | 'LOADING'> = {
  connecting: 'INITIALIZING',
  reconnecting: 'INITIALIZING',
  qr_ready: 'QR',
  connected: 'READY',
  disconnected: 'DISCONNECTED',
  pairing: 'QR',
};

export function WhatsAppContent() {
  const { user, isAdmin, token } = useAuth();
  const [status, setStatus] = useState<'INITIALIZING' | 'QR' | 'READY' | 'DISCONNECTED' | 'LOADING'>('LOADING');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (user?.id && token) {
      checkStatus();
      fetchTemplates();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.id, token]);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const checkStatus = async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(waUrl(`/api/whatsapp/status?staffId=${user.id}`), {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(STATUS_MAP[data.status] || data.status);
        
        const qr = data.qr;
        if (qr) {
          const src = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
          setQrCode(src);
        } else {
          setQrCode(null);
        }
        
        setPairingCode(data.pairingCode);
      }
    } catch (err) {
      console.error("Failed to check WhatsApp status:", err);
    }
  };

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/templates"), {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const handleUpdateTemplate = async (id: string, content: string) => {
    setSavingTemplate(id);
    try {
        const res = await fetch(waUrl("/api/whatsapp/templates"), {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ id, content }),
        });
      if (res.ok) {
        toast.success("Template dikemaskini");
        fetchTemplates();
      } else {
        toast.error("Gagal mengemaskini template");
      }
    } catch (err) {
      toast.error("Ralat berlaku");
    } finally {
      setSavingTemplate(null);
    }
  };

  const handleSendTest = async () => {
    if (!testNumber) {
      toast.error("Sila masukkan nombor telefon");
      return;
    }
    if (status !== 'READY') {
      toast.error("WhatsApp belum sedia. Sila sambung dahulu.");
      return;
    }

    setSendingTest(true);
    try {
        const res = await fetch(waUrl("/api/whatsapp/send-test"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ 
            staffId: user?.id,
            number: testNumber,
            message: "Ini adalah mesej ujian daripada sistem Kembara Sufi WhatsApp Automation."
          }),
        });
      if (res.ok) {
        toast.success("Mesej ujian dihantar!");
      } else {
        const error = await res.json();
        toast.error(`Gagal: ${error.error}`);
      }
    } catch (err) {
      toast.error("Ralat berlaku semasa menghantar");
    } finally {
      setSendingTest(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
        const res = await fetch(waUrl("/api/whatsapp/connect"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ staffId: user.id }),
        });
      if (res.ok) {
        toast.success("Memulakan sambungan WhatsApp...");
        checkStatus();
      } else {
        toast.error("Gagal memulakan sambungan");
      }
    } catch (err) {
      toast.error("Ralat berlaku");
    } finally {
      setLoading(false);
    }
  };

  const handlePair = async () => {
    if (!user?.id || !pairingPhone) {
      toast.error("Sila masukkan nombor telefon (cth: 60123456789)");
      return;
    }
    
    setIsPairing(true);
    try {
        const res = await fetch(waUrl("/api/whatsapp/pair"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ 
            staffId: user.id,
            phoneNumber: pairingPhone
          }),
        });
      
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        toast.success("Kod pairing berjaya dijana!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menjana kod pairing");
      }
    } catch (err) {
      toast.error("Ralat berlaku semasa menjana kod");
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" /> WhatsApp Automation
          </h2>
          <p className="text-sm text-muted-foreground">Sambungkan WhatsApp anda untuk menghantar peringatan automatik kepada pelanggan</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Status Sambungan</CardTitle>
            <CardDescription>Keadaan semasa akaun WhatsApp anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              {status === 'READY' ? (
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : status === 'LOADING' || status === 'INITIALIZING' ? (
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              ) : (
                <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full">
                  <AlertCircle className="w-6 h-6 text-slate-500" />
                </div>
              )}
              
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {status === 'READY' ? 'Tersambung' : 
                   status === 'QR' ? 'Menunggu Sambungan' :
                   status === 'INITIALIZING' ? 'Memulakan...' :
                   status === 'LOADING' ? 'Menyemak...' : 'Terputus'}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">
                  {status === 'READY' ? 'Sistem sedia menghantar mesej' : 
                   status === 'QR' ? 'Sila guna QR atau kod pairing' :
                   'Sila klik butang Sambung'}
                </p>
              </div>
            </div>

            {status !== 'READY' && status !== 'INITIALIZING' && (
              <Button 
                onClick={handleConnect} 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || status === 'QR'}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {status === 'QR' ? 'Sedia untuk Disambung' : 'Sambung WhatsApp'}
              </Button>
            )}

            {status === 'READY' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Akaun anda telah disambungkan.
                  </p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Uji Penghantaran</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="60123456789" 
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      className="text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSendTest}
                      disabled={sendingTest}
                      size="sm"
                    >
                      {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Methods Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Kaedah Sambungan
            </CardTitle>
            <CardDescription>Pilih cara untuk menyambung ke WhatsApp anda</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="qr" className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> Scan QR
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Guna No. Telefon
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="qr" className="flex flex-col items-center justify-center py-4 min-h-[300px]">
                {qrCode ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-md border-4 border-slate-100">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Cara Scan:</p>
                      <p className="text-[11px] text-slate-500">Buka WhatsApp {'>'} Linked Devices {'>'} Link a Device</p>
                    </div>
                  </div>
                ) : status === 'READY' ? (
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-slate-500 font-medium">WhatsApp telah disambungkan</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-sm">Klik "Sambung WhatsApp" untuk melihat QR</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="phone" className="space-y-6 py-4 min-h-[300px]">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombor Telefon WhatsApp</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Contoh: 60123456789" 
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        disabled={status === 'READY' || isPairing}
                      />
                      <Button 
                        onClick={handlePair}
                        disabled={status === 'READY' || isPairing || status !== 'QR'}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Jana Kod"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">Pastikan kod negara disertakan (cth: 60 untuk Malaysia)</p>
                  </div>

                  {pairingCode && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Key className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Kod Pairing Anda</span>
                      </div>
                      <div className="flex gap-2">
                        {pairingCode.split('').map((char, i) => (
                          <div key={i} className={`w-8 h-10 flex items-center justify-center text-xl font-bold bg-white dark:bg-slate-800 border rounded shadow-sm ${char === '-' ? 'bg-transparent border-none w-4' : ''}`}>
                            {char}
                          </div>
                        ))}
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Langkah Sambungan:</p>
                        <ol className="text-[11px] text-slate-500 text-left list-decimal pl-4 space-y-1">
                          <li>Buka WhatsApp di telefon</li>
                          <li>Pergi ke <b>Linked Devices</b></li>
                          <li>Pilih <b>Link a Device</b></li>
                          <li>Pilih <b>Link with phone number instead</b></li>
                          <li>Masukkan kod 8-digit di atas</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {!pairingCode && status === 'READY' && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm">WhatsApp telah disambungkan</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Pengurusan Template Mesej
            </CardTitle>
            <CardDescription>Sesuaikan mesej yang akan dihantar secara automatik. Gunakan placeholder: {'{nama_wakil_peserta}'}, {'{nama_pakej}'}, {'{staff_name}'}, {'{baki_bayaran}'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={templates[0]?.id || "REMINDER_1_DEPOSIT_300"}>
              <TabsList className="grid grid-cols-3 mb-4">
                {templates.map(t => (
                  <TabsTrigger key={t.id} value={t.id} className="text-xs">
                    {t.name.split('(')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {templates.map(t => (
                <TabsContent key={t.id} value={t.id} className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <Textarea 
                      rows={6}
                      defaultValue={t.content}
                      onChange={(e) => {
                        const newTemplates = [...templates];
                        const index = newTemplates.findIndex(item => item.id === t.id);
                        newTemplates[index].content = e.target.value;
                        setTemplates(newTemplates);
                      }}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => handleUpdateTemplate(t.id, t.content)}
                    disabled={savingTemplate === t.id}
                    size="sm"
                  >
                    {savingTemplate === t.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Simpan Perubahan
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Jadual Automasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Tahap 1</div>
              <p className="font-semibold text-sm">Deposit RM300</p>
              <p className="text-xs text-slate-500 leading-relaxed">Dihantar 14 hari selepas jualan ditutup jika bayaran belum mencapai RM300.</p>
            </div>
            <div className="p-4 border rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Tahap 2</div>
              <p className="font-semibold text-sm">Deposit RM500-1000</p>
              <p className="text-xs text-slate-500 leading-relaxed">Dihantar 30 hari selepas jualan jika baki deposit belum mencukupi kriteria pakej.</p>
            </div>
            <div className="p-4 border rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Tahap 3</div>
              <p className="font-semibold text-sm">Full Payment</p>
              <p className="text-xs text-slate-500 leading-relaxed">Dihantar 45 hari sebelum tarikh trip bermula jika baki masih ada.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
