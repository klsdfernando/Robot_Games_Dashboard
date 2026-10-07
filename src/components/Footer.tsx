import React from 'react';
import Link from 'next/link';
import { Shield, Radio, CheckCircle, Info } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#070a11] mt-16 py-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-200">Robot Games Championship</span>
              <span className="mx-2 text-slate-600">•</span>
              <span>Official University Tournament System</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live DB Sync</span>
            </div>
            <Link href="/" className="hover:text-sky-400 transition-colors">
              Robot Battles
            </Link>
            <Link href="/race" className="hover:text-emerald-400 transition-colors">
              Robot Race
            </Link>
            <Link href="/bracket" className="hover:text-sky-400 transition-colors">
              Bracket Flow
            </Link>
            <Link href="/matches" className="hover:text-sky-400 transition-colors">
              Match Schedule
            </Link>
            <Link href="/teams" className="hover:text-sky-400 transition-colors">
              Competitors
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
          <p>© 2026 University Robot Games Organizing Committee. All rights reserved.</p>
          <p className="mt-1 sm:mt-0 flex items-center gap-1">
            <span>Flow: Round 1 → Wildcard (3-way/2-way) → Re-Entry → Knockouts → Champion</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
