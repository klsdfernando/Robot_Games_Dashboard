'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Swords, Flag } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isRace = pathname.startsWith('/race');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090d16]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-wider uppercase text-white">
                  Robot Games
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block leading-tight">
                Championship Platform
              </p>
            </div>
          </Link>

          {/* Nav Bar: ONLY Robot Battles and Robot Race */}
          <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
            <Link
              href="/"
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                !isRace
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Robot Battles</span>
            </Link>
            <Link
              href="/race"
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                isRace
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>Robot Race</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
