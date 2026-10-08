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
  RefreshCw
} from 'lucide-react';

export default function BattlesDashboardHeader() {
  const pathname = usePathname();
  const { selectedCategory, setSelectedCategory, overview, isPolling, refresh } = useTournament();

  // Only render on public Robot Battles pages.
  const isRace = pathname.startsWith('/race');
  const isAdmin = pathname.startsWith('/control-7v9k2m4q');

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
    <div className="relative z-30 mb-6 animate-in fade-in duration-150 lg:sticky lg:top-[5.25rem]">
      {/* Robot Battles Sub-Dashboard Control Bar */}
      <div className="flex flex-col items-stretch justify-between gap-2.5 rounded-2xl border border-white/[0.09] bg-[#0b1019]/90 p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-2xl lg:flex-row lg:items-center">
        {/* Left: Battles Navigation Tabs */}
        <nav aria-label="Battle dashboard" className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[10px] font-bold transition-all min-[430px]:gap-2 min-[430px]:px-2.5 min-[430px]:text-xs sm:shrink-0 sm:px-3.5 ${
                  isActive
                    ? 'border border-blue-400/30 bg-blue-400/12 text-blue-300 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Center / Right: Division Switcher (HEAVYWEIGHT vs LIGHTWEIGHT) & Actions */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-white/[0.07] pt-2.5 lg:flex lg:justify-end lg:border-0 lg:pt-0">
          {/* Live Indicator (if arena match active) */}
          {overview?.liveMatch && (
            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[11px] font-bold text-blue-400 lg:min-h-0 lg:text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-live-pulse" />
              <span>LIVE MATCH</span>
            </div>
          )}

          {/* Weight Division Switcher */}
          <div className="order-3 col-span-2 grid w-full grid-cols-2 items-center rounded-xl border border-white/[0.08] bg-black/20 p-1 shadow-inner lg:order-none lg:flex lg:w-auto">
            <button
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold transition-all min-[390px]:text-[11px] sm:flex-none sm:px-3.5 sm:text-xs ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-blue-400 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>HEAVYWEIGHT</span>
              <span className="hidden font-mono text-[10px] opacity-75 min-[430px]:inline">20kg</span>
            </button>
            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold transition-all min-[390px]:text-[11px] sm:flex-none sm:px-3.5 sm:text-xs ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-blue-400 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>LIGHTWEIGHT</span>
              <span className="hidden font-mono text-[10px] opacity-75 min-[430px]:inline">3kg</span>
            </button>
          </div>

          {/* Quick Utility Tools */}
          <div className="flex items-center justify-end gap-1.5">
            {/* Live DB Refresh */}
            <button
              onClick={() => refresh()}
              title="Refresh Battles State"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Refresh battles state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-blue-400' : ''}`} />
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
