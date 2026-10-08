'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Swords, Flag, Radio } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isRace = pathname.startsWith('/race');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#070a10]/88 backdrop-blur-2xl">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
          <Link href="/" className="group flex min-h-11 shrink-0 items-center rounded-xl" aria-label="Robot Games home">
            <Image
              src="/robot-battles-logo.png"
              alt="Robot Games 2K26"
              width={160}
              height={89}
              priority
              className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(37,99,235,0.28)] transition-transform group-hover:scale-[1.03] sm:h-11"
            />
          </Link>

          <div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:flex">
            <Radio className="h-3.5 w-3.5 text-blue-400" />
            <span>Live event portal</span>
          </div>

          <nav aria-label="Tournament category" className="flex items-center rounded-xl border border-white/[0.09] bg-white/[0.035] p-1 shadow-inner">
            <Link
              href="/"
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition-all sm:px-4 sm:text-xs ${
                !isRace
                  ? 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.24)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              aria-current={!isRace ? 'page' : undefined}
            >
              <Swords className="h-4 w-4" />
              <span className="hidden sm:inline">Robot Battles</span>
              <span className="sm:hidden">Battles</span>
            </Link>
            <Link
              href="/race"
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition-all sm:px-4 sm:text-xs ${
                isRace
                  ? 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.24)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              aria-current={isRace ? 'page' : undefined}
            >
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Robot Race</span>
              <span className="sm:hidden">Race</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
