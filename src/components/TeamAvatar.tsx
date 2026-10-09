'use client';

import React, { useState, useEffect } from 'react';

export interface TeamAvatarProps {
  logoUrl?: string | null;
  name?: string | null;
  cornerColor?: 'red' | 'blue' | 'yellow' | 'green' | 'none';
  size?: 'hero' | 'lg' | 'md' | 'sm' | 'xs';
  badge?: string | number | null;
  className?: string;
  imgClassName?: string;
}

export function getTeamInitials(name?: string | null): string {
  if (!name || !name.trim()) return '??';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function TeamAvatar({
  logoUrl,
  name,
  cornerColor = 'none',
  size = 'md',
  badge,
  className = '',
  imgClassName = ''
}: TeamAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const initials = getTeamInitials(name);

  // Size specifications
  // hero: Spotlight cards (112-128px desktop, 88-96px mobile)
  const sizeStyles = {
    hero: 'w-[88px] h-[88px] min-[400px]:w-[96px] min-[400px]:h-[96px] sm:w-[112px] sm:h-[112px] lg:w-[124px] lg:h-[124px] xl:w-[128px] xl:h-[128px]',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
    md: 'w-10 h-10',
    sm: 'w-8 h-8',
    xs: 'w-5 h-5'
  }[size];

  const fontStyles = {
    hero: 'text-xl min-[400px]:text-2xl sm:text-3xl font-black font-mono tracking-wider',
    lg: 'text-base sm:text-lg font-black font-mono tracking-wider',
    md: 'text-xs sm:text-sm font-bold font-mono',
    sm: 'text-[11px] font-bold font-mono',
    xs: 'text-[8px] font-bold font-mono'
  }[size];

  const colorConfig = {
    red: {
      ring: 'ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.45)]',
      fallback: 'bg-red-500/15 text-red-300 ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.35)]',
      badge: 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
    },
    blue: {
      ring: 'ring-2 ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.45)]',
      fallback: 'bg-blue-500/15 text-blue-300 ring-2 ring-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.35)]',
      badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_2px_8px_rgba(59,130,246,0.3)]'
    },
    yellow: {
      ring: 'ring-2 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.55)]',
      fallback: 'bg-yellow-400/15 text-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.35)]',
      badge: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-[0_2px_8px_rgba(250,204,21,0.3)]'
    },
    green: {
      ring: 'ring-2 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.55)]',
      fallback: 'bg-yellow-400/15 text-yellow-300 ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.35)]',
      badge: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-[0_2px_8px_rgba(250,204,21,0.3)]'
    },
    none: {
      ring: 'ring-1 ring-white/15 shadow-md',
      fallback: 'bg-slate-800 text-slate-300 ring-1 ring-white/10',
      badge: 'bg-slate-800 text-slate-300 border border-white/20'
    }
  }[cornerColor];

  const avatarCircle = (
    <div
      className={`relative rounded-full aspect-square overflow-hidden shrink-0 bg-[#080d18] ${colorConfig.ring} ${sizeStyles} ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {logoUrl && !hasError ? (
        <img
          src={logoUrl}
          alt={name || 'Team logo'}
          className={`w-full h-full object-cover object-center block ${imgClassName}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center select-none ${colorConfig.fallback} ${fontStyles}`}
          aria-label={name || 'Team Initials'}
        >
          <span>{initials}</span>
        </div>
      )}
    </div>
  );

  // If a badge is requested (e.g. #1 or #2), wrap and overlap at the top of the ring
  if (badge !== undefined && badge !== null) {
    return (
      <div className="relative inline-flex items-center justify-center">
        {avatarCircle}
        <div className="absolute -top-2 sm:-top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span
            className={`inline-flex items-center justify-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black font-mono tracking-wider uppercase backdrop-blur-sm ${colorConfig.badge}`}
          >
            #{badge}
          </span>
        </div>
      </div>
    );
  }

  return avatarCircle;
}
