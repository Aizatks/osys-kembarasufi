"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Monitor,
  RefreshCw,
  MessageSquare,
  ArrowLeft,
  Search,
  CheckCheck,
  Clock,
  Phone,
  Users,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  MapPin,
  UserCircle,
  Download,
  MoreVertical,
  BookUser,
  X,
  ChevronRight,
  Save,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { waUrl } from "@/lib/wa-client";

interface Session {
  id: string;
  staff_id: string;
  staff_name: string;
  phone_number: string;
  status: "CONNECTED" | "DISCONNECTED" | "INITIALIZING";
  last_active: string;
  msg_count: number;
}

interface Message {
  id: string;
  staff_id: string;
  jid: string;
  sender_name: string;
  sender_number: string;
  message_text: string;
  message_type: string;
  media_url: string | null;
  is_from_me: boolean;
  timestamp: string;
}

interface Conversation {
  staff_id: string;
  jid: string;
  contact_name: string;
  contact_number: string;
  picture_url: string | null;
  last_message: string;
  last_message_type: string;
  last_timestamp: string;
  last_from_me: boolean;
  total_messages: number;
  unread_count: number;
}

interface ContactProfile {
  jid: string;
  name: string | null;
  notify: string | null;
  picture_url: string | null;
  status: string | null;
  phone: string;
  groups: { jid: string; name: string }[];
  media_count: number;
  recent_media: { id: string; media_url: string; message_type: string; timestamp: string }[];
}

export function MonitoringContent() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ jid: string; contact_name: string; picture_url: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [editName, setEditName] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(waUrl("/api/whatsapp/monitoring"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const s = data.sessions || [];
        setSessions(s);
        if (!selectedStaffId && s.length > 0) {
          const connected = s.find((x: Session) => x.status === "CONNECTED");
          if (connected) setSelectedStaffId(connected.staff_id);
          else setSelectedStaffId(s[0].staff_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedStaffId]);

  const fetchConversations = useCallback(async (staffId: string) => {
    if (!token) return;
    setLoadingChats(true);
    try {
      const res = await fetch(waUrl(`/api/whatsapp/messages?staffId=${staffId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  }, [token]);

  const fetchChatMessages = useCallback(async (staffId: string, jid: string) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(waUrl(`/api/whatsapp/messages?staffId=${staffId}&jid=${encodeURIComponent(jid)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
        if (data.contact_name) {
          setSelectedChat(prev => prev ? { ...prev, contact_name: data.contact_name, picture_url: data.picture_url || prev.picture_url } : prev);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  const fetchContactProfile = useCallback(async (staffId: string, jid: string) => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const res = await fetch(waUrl(`/api/whatsapp/contacts?staffId=${staffId}&jid=${encodeURIComponent(jid)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContactProfile(data);
        setEditName(data.name || data.notify || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  }, [token]);

  const handleSyncContacts = async () => {
    if (!token || !selectedStaffId) return;
    setSyncingContacts(true);
    try {
      const res = await fetch(waUrl("/api/whatsapp/contacts"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId, action: "sync" }),
      });
      if (res.ok) {
        toast.success("Sinkronisasi kenalan berjaya dimulakan");
        await fetchConversations(selectedStaffId);
      } else {
        toast.error("Gagal sinkronisasi kenalan");
      }
    } catch {
      toast.error("Ralat berlaku");
    } finally {
      setSyncingContacts(false);
    }
  };

  const handleSaveContact = async () => {
    if (!token || !selectedStaffId || !selectedChat) return;
    setSavingContact(true);
    try {
      const res = await fetch(waUrl("/api/whatsapp/contacts"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId, action: "save", jid: selectedChat.jid, name: editName }),
      });
      if (res.ok) {
        toast.success("Kenalan disimpan");
        setSelectedChat(prev => prev ? { ...prev, contact_name: editName || prev.contact_name } : prev);
        if (contactProfile) setContactProfile({ ...contactProfile, name: editName });
      } else {
        toast.error("Gagal menyimpan kenalan");
      }
    } catch {
      toast.error("Ralat berlaku");
    } finally {
      setSavingContact(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedStaffId && token) {
        await fetch(waUrl("/api/whatsapp/monitoring"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ staffId: selectedStaffId }),
        });
      }
      await fetchSessions();
      if (selectedStaffId) {
        await fetchConversations(selectedStaffId);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSessions, fetchConversations, selectedStaffId, token]);

  useEffect(() => {
    if (token) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (selectedStaffId && token) {
      fetchConversations(selectedStaffId);
      const interval = setInterval(() => fetchConversations(selectedStaffId), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedStaffId, token]);

  useEffect(() => {
    if (selectedChat && selectedStaffId && token) {
      fetchChatMessages(selectedStaffId, selectedChat.jid);
      const interval = setInterval(() => fetchChatMessages(selectedStaffId, selectedChat.jid), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.jid, selectedStaffId, token]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatMessages.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowChatMenu(false);
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setShowHeaderMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSession = sessions.find(s => s.staff_id === selectedStaffId);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.contact_name.toLowerCase().includes(q) || c.contact_number.includes(q) || c.last_message.toLowerCase().includes(q);
  });

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) return d.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
    if (diffHours < 48) return "Semalam";
    return d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short" });
  };

  const formatMessageTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateHeader = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hari Ini";
    if (diffDays === 1) return "Semalam";
    return d.toLocaleDateString("ms-MY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const getTimeSinceResponse = (conv: Conversation): string | null => {
    if (conv.last_from_me) return null;
    const lastReceived = new Date(conv.last_timestamp);
    const diffMs = Date.now() - lastReceived.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const getLastMessagePreview = (conv: Conversation) => {
    const type = conv.last_message_type;
    if (type === 'text' || !type) return conv.last_message;
    const icons: Record<string, any> = {
      image: <ImageIcon className="w-3 h-3 shrink-0" />,
      video: <Video className="w-3 h-3 shrink-0" />,
      audio: <Mic className="w-3 h-3 shrink-0" />,
      document: <FileText className="w-3 h-3 shrink-0" />,
      location: <MapPin className="w-3 h-3 shrink-0" />,
      contact: <UserCircle className="w-3 h-3 shrink-0" />,
    };
    const icon = icons[type];
    return (
      <span className="flex items-center gap-1">
        {icon}
        <span>{conv.last_message || `[${type}]`}</span>
      </span>
    );
  };

  const renderMediaContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div className="mb-1">
          <img src={msg.media_url} alt="" className="rounded-lg max-w-full max-h-[300px] object-cover cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
          {msg.message_text && !msg.message_text.startsWith('[') && (
            <p className="text-[13px] mt-1 whitespace-pre-wrap break-words leading-snug">{msg.message_text}</p>
          )}
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="mb-1">
          <video src={msg.media_url} className="max-w-full max-h-[250px] rounded-lg" controls preload="metadata" />
          {msg.message_text && !msg.message_text.startsWith('[') && (
            <p className="text-[13px] mt-1 whitespace-pre-wrap break-words leading-snug">{msg.message_text}</p>
          )}
        </div>
      );
    }
    if (msg.message_type === 'audio' && msg.media_url) {
      return <audio src={msg.media_url} controls className="max-w-[250px] h-8 mb-1" preload="metadata" />;
    }
    if (msg.message_type === 'document' && msg.media_url) {
      return (
        <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 mb-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          <FileText className="w-8 h-8 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{msg.message_text.replace('[Dokumen] ', '') || 'Dokumen'}</p>
            <p className="text-[10px] text-slate-400">Klik untuk muat turun</p>
          </div>
          <Download className="w-4 h-4 text-slate-400 shrink-0" />
        </a>
      );
    }
    if (msg.message_type === 'sticker' && msg.media_url) {
      return <img src={msg.media_url} alt="Sticker" className="max-w-[150px] max-h-[150px]" />;
    }
    if (!msg.media_url && msg.message_type !== 'text') {
      const typeLabels: Record<string, string> = { image: 'Gambar', video: 'Video', audio: 'Audio', document: 'Dokumen', sticker: 'Sticker', location: 'Lokasi', contact: 'Kenalan' };
      const label = typeLabels[msg.message_type] || 'Media';
      return (
        <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-700/60 rounded px-2 py-1 mb-1">
          {msg.message_type === 'image' && <ImageIcon className="w-4 h-4 text-slate-400" />}
          {msg.message_type === 'video' && <Video className="w-4 h-4 text-slate-400" />}
          {msg.message_type === 'audio' && <Mic className="w-4 h-4 text-slate-400" />}
          {msg.message_type === 'document' && <FileText className="w-4 h-4 text-slate-400" />}
          <span className="text-[11px] text-slate-500 italic">{label}</span>
        </div>
      );
    }
    return null;
  };

  const ContactInfoPanel = () => {
    if (!showContactInfo || !selectedChat || !selectedStaffId) return null;
    const isGroup = selectedChat.jid.includes("@g.us");
    const phone = selectedChat.jid.replace('@s.whatsapp.net', '').replace('@g.us', '');

    return (
      <div className="w-80 border-l bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Info Kenalan</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowContactInfo(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center py-6 px-4 border-b">
              {(contactProfile?.picture_url || selectedChat.picture_url) ? (
                <img src={contactProfile?.picture_url || selectedChat.picture_url!} alt="" className="w-24 h-24 rounded-full object-cover mb-3" />
              ) : (
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3",
                  isGroup ? "bg-gradient-to-br from-blue-400 to-indigo-500" : "bg-gradient-to-br from-emerald-400 to-teal-500"
                )}>
                  {isGroup ? <Users className="w-10 h-10" /> : getInitials(selectedChat.contact_name)}
                </div>
              )}
              <p className="font-bold text-base text-center">{contactProfile?.name || contactProfile?.notify || selectedChat.contact_name}</p>
              {!isGroup && <p className="text-sm text-slate-500">+{phone}</p>}
              {contactProfile?.status && (
                <p className="text-xs text-slate-400 mt-1 text-center italic">"{contactProfile.status}"</p>
              )}
            </div>

            {!isGroup && (
              <div className="px-4 py-3 border-b">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Simpan Kenalan</p>
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nama kenalan"
                    className="text-sm h-8"
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleSaveContact} disabled={savingContact}>
                    {savingContact ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            )}

            {!isGroup && (
              <div className="px-4 py-3 border-b">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Nombor Telefon</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(phone); toast.success("Nombor disalin"); }}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Phone className="w-3.5 h-3.5" /> +{phone}
                  <Copy className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}

            {contactProfile && contactProfile.recent_media.length > 0 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Media ({contactProfile.media_count})
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {contactProfile.recent_media.map(m => (
                    <div key={m.id} className="aspect-square rounded overflow-hidden cursor-pointer hover:opacity-80" onClick={() => window.open(m.media_url, '_blank')}>
                      {m.message_type === 'image' ? (
                        <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Video className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contactProfile && contactProfile.groups.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Kumpulan Bersama ({contactProfile.groups.length})
                </p>
                <div className="space-y-1.5">
                  {contactProfile.groups.map(g => (
                    <div key={g.jid} className="flex items-center gap-2 py-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-xs font-medium truncate">{g.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (selectedChat) {
    let lastDateHeader = "";

    return (
      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-white dark:bg-slate-900 shrink-0">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { setSelectedChat(null); setChatMessages([]); setShowContactInfo(false); setContactProfile(null); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <button
              className="flex items-center gap-3 flex-1 min-w-0"
              onClick={() => {
                if (!showContactInfo && selectedStaffId) {
                  setShowContactInfo(true);
                  fetchContactProfile(selectedStaffId, selectedChat.jid);
                } else {
                  setShowContactInfo(false);
                }
              }}
            >
              {selectedChat.picture_url ? (
                <img src={selectedChat.picture_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                  selectedChat.jid.includes("@g.us") ? "bg-gradient-to-br from-blue-400 to-indigo-500" : "bg-gradient-to-br from-emerald-400 to-teal-500"
                )}>
                  {selectedChat.jid.includes("@g.us") ? <Users className="w-4 h-4" /> : getInitials(selectedChat.contact_name)}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm truncate">{selectedChat.contact_name}</p>
                <p className="text-[11px] text-slate-500">
                  {selectedChat.jid.includes("@g.us") ? "Kumpulan" : `+${selectedChat.jid.replace('@s.whatsapp.net', '')}`} &middot; {selectedSession?.staff_name || "Staff"}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="text-[10px]">{chatMessages.length} mesej</Badge>
              <div className="relative" ref={menuRef}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowChatMenu(!showChatMenu)}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {showChatMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border z-50">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg"
                      onClick={() => {
                        setShowChatMenu(false);
                        setShowContactInfo(true);
                        if (selectedStaffId) fetchContactProfile(selectedStaffId, selectedChat.jid);
                      }}
                    >
                      <UserCircle className="w-4 h-4" /> Lihat Profil
                    </button>
                    {!selectedChat.jid.includes("@g.us") && (
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                        onClick={() => {
                          setShowChatMenu(false);
                          setShowContactInfo(true);
                          if (selectedStaffId) fetchContactProfile(selectedStaffId, selectedChat.jid);
                        }}
                      >
                        <Save className="w-4 h-4" /> Simpan Kenalan
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedChat.jid.replace('@s.whatsapp.net', '').replace('@g.us', ''));
                        toast.success("Nombor disalin");
                        setShowChatMenu(false);
                      }}
                    >
                      <Copy className="w-4 h-4" /> Salin Nombor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-[#efeae2] dark:bg-slate-950">
            {loadingMessages && chatMessages.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Memuatkan mesej...
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const currentDate = formatDateHeader(msg.timestamp);
                let showDateHeader = false;
                if (currentDate !== lastDateHeader) {
                  lastDateHeader = currentDate;
                  showDateHeader = true;
                }
                const mediaContent = renderMediaContent(msg);
                const showText = msg.message_type === 'text' || (!msg.media_url && !mediaContent);

                return (
                  <div key={msg.id || idx}>
                    {showDateHeader && (
                      <div className="flex justify-center my-3">
                        <span className="bg-white/80 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 px-3 py-1 rounded-lg shadow-sm">
                          {currentDate}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex mb-1", msg.is_from_me ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm relative",
                        msg.is_from_me ? "bg-[#d9fdd3] dark:bg-emerald-900/60" : "bg-white dark:bg-slate-800"
                      )}>
                        {!msg.is_from_me && selectedChat.jid.includes("@g.us") && (
                          <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">{msg.sender_name}</p>
                        )}
                        {mediaContent}
                        {showText && msg.message_text && (
                          <div className="flex items-end gap-2">
                            <p className="text-[13px] whitespace-pre-wrap break-words leading-snug">{msg.message_text}</p>
                            <span className="text-[9px] text-slate-400 shrink-0 self-end flex items-center gap-0.5 pb-0.5">
                              {formatMessageTime(msg.timestamp)}
                              {msg.is_from_me && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            </span>
                          </div>
                        )}
                        {!showText && (
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5 justify-end">
                            {formatMessageTime(msg.timestamp)}
                            {msg.is_from_me && <CheckCheck className="w-3 h-3 text-blue-500" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <ContactInfoPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-4 py-3 border-b bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-500" /> Pemantauan WhatsApp
            </h2>
            <p className="text-xs text-muted-foreground">Pantau chat WhatsApp staff secara live</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={headerMenuRef}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowHeaderMenu(!showHeaderMenu)}>
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-lg border z-50">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg"
                    onClick={() => { setShowHeaderMenu(false); handleSyncContacts(); }}
                    disabled={syncingContacts}
                  >
                    <BookUser className="w-4 h-4" /> {syncingContacts ? "Menyinkron..." : "Sinkron Kenalan"}
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg"
                    onClick={() => { setShowHeaderMenu(false); handleRefresh(); }}
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh Semua
                  </button>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.map((session) => (
              <button
                key={session.staff_id}
                onClick={() => { setSelectedStaffId(session.staff_id); setSelectedChat(null); setChatMessages([]); setConversations([]); setShowContactInfo(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0",
                  selectedStaffId === session.staff_id
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-400"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", session.status === "CONNECTED" ? "bg-emerald-500" : "bg-slate-300")} />
                <span className="truncate max-w-[100px]">{session.staff_name}</span>
                {session.msg_count > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{session.msg_count.toLocaleString()}</Badge>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Memuatkan...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Phone className="w-12 h-12 text-slate-300" />
            <p className="text-sm">Tiada sesi WhatsApp aktif</p>
            <p className="text-xs text-slate-400">Sambungkan WhatsApp staff dari halaman Utama</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Cari perbualan & mesej..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-0" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingChats && conversations.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Memuatkan perbualan...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-sm">{searchQuery ? "Tiada hasil carian" : "Tiada perbualan ditemui"}</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const timeSince = getTimeSinceResponse(conv);
                  const isGroup = conv.jid.includes("@g.us");

                  return (
                    <div
                      key={`${conv.staff_id}:${conv.jid}`}
                      onClick={() => setSelectedChat({ jid: conv.jid, contact_name: conv.contact_name, picture_url: conv.picture_url })}
                      className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      {conv.picture_url ? (
                        <img src={conv.picture_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                          isGroup ? "bg-gradient-to-br from-blue-400 to-indigo-500" : "bg-gradient-to-br from-emerald-400 to-teal-500"
                        )}>
                          {isGroup ? <Users className="w-5 h-5" /> : getInitials(conv.contact_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-semibold text-sm truncate">{conv.contact_name}</p>
                          <span className={cn("text-[11px] shrink-0 ml-2", !conv.last_from_me && conv.unread_count > 0 ? "text-emerald-600 font-semibold" : "text-slate-400")}>
                            {formatTime(conv.last_timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            {conv.last_from_me && <CheckCheck className="w-3 h-3 text-blue-500 shrink-0" />}
                            {getLastMessagePreview(conv)}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {timeSince && (
                              <span className={cn(
                                "text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium",
                                parseInt(timeSince) > 2 && timeSince.includes("h")
                                  ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                                  : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                              )}>
                                <Clock className="w-2.5 h-2.5" /> {timeSince}
                              </span>
                            )}
                            {conv.total_messages > 0 && (
                              <Badge variant="secondary" className={cn(
                                "h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] font-bold",
                                !conv.last_from_me && conv.unread_count > 0 ? "bg-emerald-500 text-white hover:bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                              )}>
                                {conv.total_messages}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedSession && (
              <div className="px-4 py-2 border-t bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className={cn("w-2 h-2 rounded-full", selectedSession.status === "CONNECTED" ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                  <span>{selectedSession.staff_name}</span>
                  <span>&middot;</span>
                  <span>{selectedSession.phone_number ? `+${selectedSession.phone_number}` : "Tiada nombor"}</span>
                  <span>&middot;</span>
                  <span>{selectedSession.status === "CONNECTED" ? "Aktif" : "Tidak aktif"}</span>
                </div>
                <span className="text-[10px] text-slate-400">{filteredConversations.length.toLocaleString()} perbualan</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
