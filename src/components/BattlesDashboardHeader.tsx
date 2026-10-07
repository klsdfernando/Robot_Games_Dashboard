'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { 
  Swords, 
  Radio, 
  Users, 
  Zap, 
  Shield, 
  Flame, 
  RefreshCw, 
  Lock 
} from 'lucide-react';

export default function BattlesDashboardHeader() {
  const pathname = usePathname();
  const { selectedCategory, setSelectedCategory, overview, isPolling, refresh } = useTournament();

  // Only render on Robot Battles pages, not on /race or /admin
  const isRace = pathname.startsWith('/race');
  const isAdmin = pathname.startsWith('/admin');

  if (isRace || isAdmin) {
    return null;
  }

  const navTabs = [
    { name: 'Overview', href: '/', icon: Zap },
    { name: 'Bracket', href: '/bracket', icon: Swords },
    { name: 'Matches', href: '/matches', icon: Radio },
    { name: 'Teams', href: '/teams', icon: Users },
  ];

  return (
    <div className="mb-6 animate-in fade-in duration-150">
      {/* Robot Battles Sub-Dashboard Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0c121e]/90 border border-white/10 backdrop-blur-md shadow-xl">
        {/* Left: Battles Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Center / Right: Division Switcher (HEAVYWEIGHT vs LIGHTWEIGHT) & Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          {/* Live Indicator (if arena match active) */}
          {overview?.liveMatch && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse" />
              <span>LIVE MATCH</span>
            </div>
          )}

          {/* Weight Division Switcher */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>HEAVYWEIGHT</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">30kg</span>
            </button>
            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>LIGHTWEIGHT</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">15kg</span>
            </button>
          </div>

          {/* Quick Utility Tools */}
          <div className="flex items-center gap-1.5">
            {/* Live DB Refresh */}
            <button
              onClick={() => refresh()}
              title="Refresh Battles State"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-white/5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Organizer Admin Portal */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 border border-slate-700/60 hover:border-amber-400/30 transition-all"
              title="Organizer Admin Portal"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
