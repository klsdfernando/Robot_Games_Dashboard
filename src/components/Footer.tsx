import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="relative z-10 mt-16 w-full border-t border-white/[0.08] bg-[#06090e]/85 py-8 text-xs text-slate-400 backdrop-blur-xl">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Image src="/robot-battles-logo.png" alt="Robot Games 2K26" width={128} height={71} className="h-12 w-auto object-contain" />
            <div>
              <span className="block font-bold text-slate-200">Robot Games Championship</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-slate-600">Official university tournament system</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-slate-400">
            <div className="flex min-h-8 items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-400/[0.06] px-2.5 text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Live DB Sync</span>
            </div>
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Robot Battles
            </Link>
            <Link href="/race" className="hover:text-blue-400 transition-colors">
              Robot Race
            </Link>
            <Link href="/bracket" className="hover:text-blue-400 transition-colors">
              Bracket Flow
            </Link>
            <Link href="/matches" className="hover:text-blue-400 transition-colors">
              Match Schedule
            </Link>
            <Link href="/teams" className="hover:text-blue-400 transition-colors">
              Competitors
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-white/[0.06] pt-4 text-[11px] text-slate-600 sm:flex-row sm:items-center">
          <p>© 2026 University Robot Games Organizing Committee. All rights reserved.</p>
          <p className="mt-1 sm:mt-0 flex items-center gap-1">
            <span>Flow: Round 1 → Wildcard (3-way/2-way) → Re-Entry → Knockouts → Champion</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
