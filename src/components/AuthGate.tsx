'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Eye, X } from 'lucide-react';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading, isImpersonating, endImpersonation } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-40"></div>
        
        <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-20 h-20 bg-primary rounded-xl flex items-center justify-center mb-4">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Kembara Sufi Travel & Tours Sdn Bhd</CardTitle>
            <CardDescription className="text-slate-400">
                OSYS 2026
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-slate-300">
                SIla log Masuk ONE-SYSTEM Kembara Sufi Travel & Tours Sdn Bhd
              </p>
            <div className="flex flex-col gap-3">
              <Button className="w-full" size="lg" onClick={() => router.push('/login')}>
                <LogIn className="w-4 h-4 mr-2" />
                Log Masuk
              </Button>
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700" size="lg" onClick={() => router.push('/register')}>
                Daftar Akaun Baru
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-zinc-950">
      {isImpersonating && (
        <div className="bg-orange-500 text-white py-2 px-4 fixed top-0 left-0 right-0 z-[100]">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Eye className="w-4 h-4" />
              <span>
                Melihat sebagai <strong>{user.name}</strong> 
                <span className="opacity-80 hidden sm:inline">{user.impersonatorName && ` (oleh ${user.impersonatorName})`}</span>
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={endImpersonation}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      )}
      <div className={isImpersonating ? "pt-10" : ""}>
        {children}
      </div>
    </div>
  );
}
