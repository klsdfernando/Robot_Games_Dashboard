import React from 'react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="relative z-10 mt-16 w-full border-t border-white/[0.08] bg-[#06090e]/85 py-8 text-xs text-slate-300 backdrop-blur-xl">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image 
              src="/robot-battles-logo.png" 
              alt="Robot Games 2K26" 
              width={128} 
              height={71} 
              className="h-10 w-auto object-contain" 
            />
            <span className="text-xs font-bold text-slate-200">
              Robot Games Championship
            </span>
          </div>
          <p className="text-xs text-slate-400 text-center sm:text-right">
            © 2026 University Robot Games Organizing Committee. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
