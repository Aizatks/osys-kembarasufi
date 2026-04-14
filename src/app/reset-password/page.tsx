'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (!token) {
    return (
      <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <p className="text-red-400">Link reset tidak sah. Sila minta semula dari halaman lupa kata laluan.</p>
          <Button onClick={() => router.push('/forgot-password')} className="mt-4">
            Minta Reset Baru
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Kata laluan tidak sepadan');
      return;
    }

    if (password.length < 6) {
      setError('Kata laluan mestilah sekurang-kurangnya 6 aksara');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Ralat rangkaian. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-16 h-16 bg-amber-600 rounded-xl flex items-center justify-center mb-4">
          {success ? <CheckCircle2 className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          {success ? 'Berjaya!' : 'Kata Laluan Baru'}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {success ? 'Kata laluan anda telah dikemaskini.' : 'Masukkan kata laluan baru anda.'}
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent className="space-y-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-400 text-sm">Kata laluan berjaya dikemaskini. Sila log masuk.</p>
          </div>
          <Button onClick={() => router.push('/login')} className="w-full">
            Log Masuk
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Kata Laluan Baru</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 aksara"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-slate-300">Sahkan Kata Laluan</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Masukkan semula"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Kemaskini Kata Laluan
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/login')}
              className="w-full text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Log Masuk
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-40"></div>
      <Suspense fallback={
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
