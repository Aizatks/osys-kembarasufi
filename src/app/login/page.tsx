'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, KeyRound, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Login gagal');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitted(true);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-40"></div>
        
        <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-amber-600 rounded-xl flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Lupa Kata Laluan?</CardTitle>
            <CardDescription className="text-slate-400">
              Hubungi Admin untuk reset kata laluan anda
            </CardDescription>
          </CardHeader>
          
          {forgotSubmitted ? (
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-center">
                <p className="text-green-400 text-sm">
                  Permintaan telah dihantar!
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Sila hubungi Admin atau Super Admin untuk reset kata laluan anda.
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <p className="text-xs text-slate-400 text-center">Hubungi Admin melalui:</p>
                <p className="text-sm text-white text-center font-medium">WhatsApp / Telefon</p>
              </div>
              <Button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSubmitted(false);
                  setForgotEmail('');
                }}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Log Masuk
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-4">
                <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
                  <p className="text-amber-400 text-sm text-center">
                    Sistem ini tidak mempunyai email recovery. Sila hubungi Admin untuk reset kata laluan.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-slate-300">Email Anda</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                  Hantar Permintaan
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Log Masuk
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-40"></div>
      
      <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Kembara Sufi Travel & Tours Sdn Bhd</CardTitle>
            <CardDescription className="text-slate-400">
              OSYS 2026
            </CardDescription>
          </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Kata Laluan</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sedang log masuk...
                  </>
                ) : (
                  'Log Masuk'
                )}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-amber-400 hover:text-amber-300 hover:underline"
              >
                Lupa kata laluan?
              </button>
              <p className="text-sm text-slate-400 text-center">
                Belum ada akaun?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Daftar di sini
                </Link>
              </p>
              <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 text-center">
                ← Kembali ke laman utama
              </Link>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
