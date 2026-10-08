'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { 
  Swords, 
  Radio, 
  Users, 
  Zap, 
  Shield, 
  Flame 
} from 'lucide-react';

export default function BattlesDashboardHeader() {
  const pathname = usePathname();
  const { selectedCategory, setSelectedCategory, lastUpdated } = useTournament();

  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const updateSeconds = () => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - (lastUpdated || Date.now())) / 1000)));
    };
    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

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
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-white/[0.09] bg-[#0b1019]/90 p-2.5 sm:p-3 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-2xl lg:flex-row lg:items-center">
        {/* Left: Battles Navigation Tabs */}
        <nav aria-label="Battle dashboard" className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all sm:shrink-0 sm:px-3.5 ${
                  isActive
                    ? 'border border-blue-400/30 bg-blue-400/15 text-blue-300 shadow-sm shadow-blue-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Auto-refreshing indicator & Weight Division Segmented Control */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-2.5 sm:pt-0 sm:border-0 sm:justify-end">
          {/* Auto-refreshing indicator: small pulsing dot + "Live · updated Xs ago" */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs font-medium text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              Live · updated <span className="font-mono font-semibold text-slate-200">{secondsAgo}s</span> ago
            </span>
          </div>

          {/* Clearly separate segmented control: Weight Division Switcher */}
          <div
            role="group"
            aria-label="Weight class selection"
            className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Heavyweight</span>
              <span className="font-mono text-xs opacity-90">20kg</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Lightweight</span>
              <span className="font-mono text-xs opacity-90">3kg</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
