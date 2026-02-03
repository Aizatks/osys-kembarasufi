'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Session {
  id: string;
  name: string;
  phone_number: string | null;
  profile_pic: string | null;
  status: string;
  live_status: string;
  qr: string | null;
  created_at: string;
}

export default function WhatsAppManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Fetch sessions error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const createSession = async () => {
    if (!newName.trim()) return;
    
    setCreating(true);
    try {
      await fetch('/api/whatsapp/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      setNewName('');
      setDialogOpen(false);
      fetchSessions();
    } catch (error) {
      console.error('Create session error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch(`/api/whatsapp/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchSessions();
    } catch (error) {
      console.error('Action error:', error);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Padam sesi ini?')) return;
    
    try {
      await fetch(`/api/whatsapp/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">Connected</Badge>;
      case 'qr':
        return <Badge className="bg-yellow-500">Scan QR</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-500">Connecting...</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Management</h1>
          <p className="text-muted-foreground">Urus sesi WhatsApp staff anda</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              + Tambah Instance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah WhatsApp Instance Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Staff</Label>
                <Input
                  placeholder="Contoh: Ahmad - Sales"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <Button 
                onClick={createSession} 
                disabled={creating || !newName.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {creating ? 'Membuat...' : 'Buat Instance'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium">Tiada WhatsApp Instance</h3>
            <p className="text-muted-foreground text-center mt-2">
              Klik &quot;Tambah Instance&quot; untuk mula
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.profile_pic || ''} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {session.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{session.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {session.phone_number || 'Belum connect'}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAction(session.id, 'connect')}>
                        🔄 Refresh QR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction(session.id, 'restart')}>
                        🔃 Restart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction(session.id, 'disconnect')}>
                        🔌 Disconnect
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteSession(session.id)}
                        className="text-red-600"
                      >
                        🗑️ Padam
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mb-3">
                  {getStatusBadge(session.live_status)}
                </div>
                
                {session.live_status === 'qr' && session.qr ? (
                  <div className="flex flex-col items-center p-4 bg-white rounded-lg">
                    <img
                      src={session.qr}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                    <p className="text-sm text-center mt-2 text-muted-foreground">
                      Scan dengan WhatsApp
                    </p>
                  </div>
                ) : session.live_status === 'connected' ? (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm text-green-600 font-medium">
                      WhatsApp Connected
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Button 
                      variant="outline" 
                      onClick={() => handleAction(session.id, 'connect')}
                    >
                      Connect WhatsApp
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
