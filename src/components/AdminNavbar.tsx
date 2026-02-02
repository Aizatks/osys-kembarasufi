'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut, 
  User,
  Home,
  Activity,
  Eye,
  X,
  Menu
} from 'lucide-react';

export function AdminNavbar() {
  const { user, logout, isAdmin, isImpersonating, endImpersonation } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, adminOnly: true },
    { name: 'Staff', href: '/admin/staff', icon: Users, adminOnly: true },
    { name: 'Sebut Harga', href: '/admin/quotations', icon: FileText, adminOnly: false },
    { name: 'Log Aktiviti', href: '/admin/activity-logs', icon: Activity, adminOnly: true },
    { name: 'Kalkulator', href: '/', icon: Home, adminOnly: false },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {isImpersonating && (
        <div className="bg-orange-500 text-white py-2 px-4 sticky top-0 z-50 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              <span className="text-xs sm:text-sm">
                Melihat sebagai <strong>{user.name}</strong> 
                {user.impersonatorName && <span className="opacity-80 hidden sm:inline"> (oleh {user.impersonatorName})</span>}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={endImpersonation}
              className="text-white hover:bg-white/20 h-7"
            >
              <X className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Tamat Sesi</span>
            </Button>
          </div>
        </div>
      )}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">KS</span>
                </div>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button 
                        variant="ghost" 
                        className={`text-sm ${isActive ? 'text-white bg-slate-700' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-none text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{user.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-700">
                <LogOut className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="md:hidden text-slate-400 hover:text-white hover:bg-slate-700"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div 
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-700">
              <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
                <User className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
