'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Chat {
  remote_jid: string;
  contact_name: string;
  contact_pic: string | null;
  last_message: string;
  last_message_time: string;
  from_me: boolean;
}

interface Instance {
  id: string;
  name: string;
  phone_number: string | null;
  profile_pic: string | null;
  status: string;
  qr: string | null;
  total_messages: number;
  recent_chats: Chat[];
}

interface Message {
  id: string;
  message_id: string;
  remote_jid: string;
  from_me: boolean;
  message_type: string;
  content: string;
  contact_name: string;
  contact_pic: string | null;
  timestamp: string;
}

export default function MonitoringBouncer() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncConfig, setSyncConfig] = useState({ chatCount: '100' });
  const [syncing, setSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/monitoring');
      const data = await res.json();
      setInstances(data.instances || []);
      
      if (selectedInstance) {
        const updated = (data.instances || []).find((i: Instance) => i.id === selectedInstance.id);
        if (updated) setSelectedInstance(updated);
      }
    } catch (error) {
      console.error('Fetch monitoring error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedInstance]);

  const fetchMessages = useCallback(async () => {
    if (!selectedInstance || !selectedChat) return;
    
    try {
      const res = await fetch(
        `/api/whatsapp/messages?session_id=${selectedInstance.id}&remote_jid=${encodeURIComponent(selectedChat.remote_jid)}&limit=100`
      );
      const data = await res.json();
      setMessages((data.messages || []).reverse());
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
  }, [selectedInstance, selectedChat]);

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 5000);
    return () => clearInterval(interval);
  }, [fetchMonitoring]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedInstance || !selectedChat) return;
    
    setSending(true);
    try {
      await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedInstance.id,
          remote_jid: selectedChat.remote_jid,
          content: newMessage
        })
      });
      setNewMessage('');
      setTimeout(fetchMessages, 500);
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSync = async () => {
    if (!selectedInstance) return;
    
    setSyncing(true);
    try {
      await fetch('/api/whatsapp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedInstance.id,
          chat_count: parseInt(syncConfig.chatCount)
        })
      });
      setSyncDialogOpen(false);
      fetchMonitoring();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Semalam';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('ms-MY', { weekday: 'short' });
    }
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'qr': return 'bg-yellow-500';
      case 'connecting': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Monitoring</h1>
            <p className="text-sm text-gray-500">Bouncer - Monitor semua chat staff</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {instances.filter(i => i.status === 'connected').length} Online
            </Badge>
            <Badge variant="outline">
              {instances.length} Total Instance
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Instances Panel */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Staff Instances</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {instances.map((instance) => (
                <Card
                  key={instance.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedInstance?.id === instance.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedInstance(instance);
                    setSelectedChat(null);
                    setMessages([]);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={instance.profile_pic || ''} />
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {instance.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(instance.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{instance.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {instance.phone_number || 'Belum connect'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{instance.total_messages}</p>
                        <p className="text-xs text-gray-400">msg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chats Panel */}
        {selectedInstance ? (
          <div className="w-80 bg-white border-r flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-gray-700">{selectedInstance.name}</h2>
                <p className="text-xs text-gray-500">{selectedInstance.recent_chats.length} perbualan</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncDialogOpen(true)}
                disabled={selectedInstance.status !== 'connected'}
              >
                Sync Data
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {selectedInstance.recent_chats.map((chat) => (
                  <div
                    key={chat.remote_jid}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?.remote_jid === chat.remote_jid ? 'bg-green-50' : ''
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.contact_pic || ''} />
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                          {chat.contact_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="font-medium text-sm truncate">{chat.contact_name}</p>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {chat.from_me && <span className="text-green-600">Anda: </span>}
                          {chat.last_message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="w-80 bg-white border-r flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">👈</div>
              <p>Pilih instance untuk melihat chat</p>
            </div>
          </div>
        )}

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col bg-[#e5ddd5]">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedChat.contact_pic || ''} />
                  <AvatarFallback className="bg-gray-300 text-gray-600">
                    {selectedChat.contact_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedChat.contact_name}</p>
                  <p className="text-xs text-green-100">
                    {selectedChat.remote_jid.split('@')[0]}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                          msg.from_me
                            ? 'bg-[#dcf8c6] rounded-tr-none'
                            : 'bg-white rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.from_me && (
                            <span className="text-blue-500 text-xs">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="bg-[#f0f0f0] p-3">
                <div className="flex gap-2 max-w-3xl mx-auto">
                  <Input
                    placeholder="Taip mesej..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 bg-white"
                    disabled={selectedInstance?.status !== 'connected'}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim() || selectedInstance?.status !== 'connected'}
                    className="bg-[#075e54] hover:bg-[#054d44]"
                  >
                    {sending ? '...' : 'Hantar'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-medium">WhatsApp Bouncer</h3>
                <p className="mt-2">Pilih perbualan untuk mula monitoring</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Data & Profile Pictures</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah Chat untuk Sync</label>
              <Select
                value={syncConfig.chatCount}
                onValueChange={(v) => setSyncConfig({ ...syncConfig, chatCount: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 chat</SelectItem>
                  <SelectItem value="100">100 chat</SelectItem>
                  <SelectItem value="200">200 chat</SelectItem>
                  <SelectItem value="500">500 chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {syncing ? 'Syncing...' : 'Sync Sekarang'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
