'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { 
  Shield, 
  Users, 
  Swords, 
  Flame, 
  Radio, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Lock,
  RefreshCw,
  Flag
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedCategory, setSelectedCategory } = useTournament();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isLoginPage = pathname === '/control-7v9k2m4q/login';

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/control-7v9k2m4q/login');
        }
      } catch {
        router.push('/control-7v9k2m4q/login');
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/control-7v9k2m4q/login');
    router.refresh();
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" />
        <p className="text-xs font-semibold">Verifying organizer credentials...</p>
      </div>
    );
  }

  const adminNav = [
    { name: 'Dashboard', href: '/control-7v9k2m4q', icon: LayoutDashboard },
    { name: 'Teams', href: '/control-7v9k2m4q/teams', icon: Users },
    { name: 'Bracket', href: '/control-7v9k2m4q/bracket', icon: Swords },
    { name: 'Wildcard', href: '/control-7v9k2m4q/wildcard', icon: Flame },
    { name: 'Matches', href: '/control-7v9k2m4q/matches', icon: Radio },
    { name: 'Robot Race', href: '/control-7v9k2m4q/race', icon: Flag },
    { name: 'Settings', href: '/control-7v9k2m4q/settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Top Admin Control Bar */}
      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 text-black flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">ORGANIZER CONTROL CONSOLE</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Controlling: <strong className="text-blue-400">{selectedCategory}</strong> division
            </p>
          </div>
        </div>

        {/* Category Switcher in Admin */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10 flex-1 sm:flex-initial">
            <button
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HEAVYWEIGHT
            </button>
            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LIGHTWEIGHT
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-blue-950/50 hover:text-blue-400 text-slate-400 border border-white/10 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-blue-500 text-black shadow-md shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Admin Content */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
