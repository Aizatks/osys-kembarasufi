'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Kata laluan tidak sepadan');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Kata laluan mestilah sekurang-kurangnya 6 aksara');
      setIsLoading(false);
      return;
    }

    const result = await register(name, email, password);

    if (result.success) {
      if (result.needsApproval) {
        setNeedsApproval(true);
        setSuccess(true);
      } else {
        router.push('/admin');
      }
    } else {
      setError(result.error || 'Pendaftaran gagal');
    }

    setIsLoading(false);
  };

  if (success && needsApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Pendaftaran Berjaya!</CardTitle>
            <CardDescription className="text-slate-400">
              Akaun anda telah didaftarkan. Sila tunggu kelulusan daripada admin sebelum anda boleh log masuk.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">Ke Halaman Log Masuk</Button>
            </Link>
          </CardFooter>
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
              <UserPlus className="w-8 h-8 text-white" />
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
              <Label htmlFor="name" className="text-slate-300">Nama Penuh</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nama anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Sahkan Kata Laluan</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Sedang mendaftar...
                </>
              ) : (
                'Daftar'
              )}
            </Button>
            <p className="text-sm text-slate-400 text-center">
              Sudah ada akaun?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Log masuk di sini
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
