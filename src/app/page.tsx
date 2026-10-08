'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTournament } from '@/context/TournamentContext';
import MatchDetailModal from '@/components/MatchDetailModal';
import TeamAvatar from '@/components/TeamAvatar';
import { 
  Swords, 
  Radio, 
  ArrowRight, 
  Trophy, 
  Clock, 
  ChevronRight,
  Crown,
  Award,
  Flame,
  Heart
} from 'lucide-react';

function getTeamInitials(name?: string): string {
  if (!name) return '??';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getCornerBorderClass(idx: number): string {
  if (idx === 0) return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]';
  if (idx === 1) return 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]';
  return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]';
}

function getCornerBadgeStyle(idx: number): string {
  if (idx === 0) return 'bg-red-500/15 text-red-400 border border-red-500/30';
  if (idx === 1) return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
}

function getLiveNameSize(name: string): string {
  const len = name.length;
  if (len > 22) return 'text-xs sm:text-sm md:text-base';
  if (len > 12) return 'text-sm sm:text-base md:text-lg';
  return 'text-base sm:text-lg md:text-xl';
}

function getUpNextNameSize(name: string): string {
  const len = name.length;
  if (len > 22) return 'text-xs sm:text-sm';
  if (len > 12) return 'text-sm sm:text-base';
  return 'text-base sm:text-lg';
}

interface TeamFaceoffLogoProps {
  logoUrl?: string | null;
  name?: string;
  cornerColor: 'red' | 'blue' | 'green';
  size?: 'lg' | 'sm';
  badge?: string | number | null;
}

function TeamFaceoffLogo({
  logoUrl,
  name,
  cornerColor,
  size = 'lg',
  badge,
}: TeamFaceoffLogoProps) {
  return (
    <TeamAvatar
      logoUrl={logoUrl}
      name={name}
      cornerColor={cornerColor}
      size={size === 'lg' ? 'hero' : 'lg'}
      badge={badge}
    />
  );
}

export default function HomePage() {
  const { 
    selectedCategory, 
    overview, 
    matches, 
    teams, 
    selectedMatch,
    setSelectedMatch
  } = useTournament();

  const liveMatch = overview?.liveMatch;
  const upNextMatch = overview?.upNextMatch;

  return (
    <div className="animate-in space-y-4 sm:space-y-5 fade-in duration-200">
      {/* Broadcast-style tournament hero - Slim banner (~200px) */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#0b111c] p-5 sm:p-6 min-h-[180px] sm:min-h-[200px] flex items-center">
        {/* Smaller robot image on the right */}
        <div key={selectedCategory} className="hero-robot-enter pointer-events-none absolute bottom-0 right-0 top-0 z-[1] hidden w-52 sm:w-64 md:w-72 lg:block overflow-hidden" aria-hidden="true">
          <Image
            src={selectedCategory === 'HEAVYWEIGHT' ? '/hero-battle-robot.webp' : '/hero-lightweight-robot.webp'}
            alt=""
            fill
            priority
            sizes="288px"
            className="object-contain object-right"
          />
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0b111c] to-transparent" />
        </div>

        <div className="relative z-10 max-w-xl">
          {/* One Eyebrow Label Only */}
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-400/10 px-2.5 py-0.5 text-xs font-bold tracking-[0.14em] text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              ROBOT GAMES 2026 · {selectedCategory === 'HEAVYWEIGHT' ? '20 KG DIVISION' : '3 KG DIVISION'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white mb-4">
            GREATNESS <span className="text-blue-400">SHOWS NO MERCY.</span>
          </h1>

          {/* Both Buttons Kept */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link 
              href="/bracket" 
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white transition hover:bg-blue-500 shadow-sm"
            >
              <span>Explore the bracket</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link 
              href="/matches" 
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              <Radio className="h-3.5 w-3.5 text-blue-400" />
              <span>Arena schedule</span>
            </Link>
          </div>
        </div>
      </section>

      {/* TOURNAMENT SPOTLIGHT: WINNER SHOW OFF vs ACTIVE MATCH SPOTLIGHT */}
      {overview?.champion ? (
        /* OFFICIAL WINNER LOGO, WINNER NAME & PODIUM HONORS SHOW OFF */
        <div className="relative overflow-hidden rounded-3xl border-2 border-blue-500/40 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-[#0b1220] p-8 sm:p-12 shadow-2xl shadow-blue-500/15 text-center">
          {/* Subtle background ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-6">
            {/* Winner Logo */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-300 p-1 shadow-2xl shadow-blue-500/30">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[22px] flex items-center justify-center overflow-hidden">
                  {overview.champion.logoUrl ? (
                    <Image
                      src={overview.champion.logoUrl}
                      alt={overview.champion.name}
                      width={112}
                      height={112}
                      unoptimized
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400" />
                  )}
                </div>
              </div>
              <div className="absolute -top-3 -right-3 p-2 rounded-full bg-blue-400 text-black shadow-lg">
                <Crown className="w-5 h-5 fill-black" />
              </div>
            </div>

            {/* Winner Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Trophy className="w-3.5 h-3.5" />
              <span>{selectedCategory} TOURNAMENT CHAMPION</span>
            </div>

            {/* Champion Winner Name */}
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                {overview.champion.name}
              </h2>
              {overview.champion.organization && (
                <p className="text-sm font-semibold text-blue-300/90">{overview.champion.organization}</p>
              )}
            </div>

            {/* 1st Runner-Up & 2nd Runner-Up Podium Section */}
            {(overview.runnerUp || overview.secondRunnerUp) && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-left">
                {/* 1st Runner-Up (Final Match Loser) */}
                {overview.runnerUp && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-500/40 shadow-xl relative overflow-hidden group hover:border-slate-400/70 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-300/20 text-slate-200 border border-slate-400/40">
                        <Award className="w-3.5 h-3.5 text-slate-300" />
                        <span>1ST RUNNER-UP</span>
                      </div>
                      <span className="text-xs font-medium text-slate-300">
                        Final Match Runner-Up
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {overview.runnerUp.logoUrl && (
                        <Image
                          src={overview.runnerUp.logoUrl}
                          alt={overview.runnerUp.name}
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 rounded-xl object-contain bg-slate-950 border border-white/10 p-1 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight">
                          {overview.runnerUp.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          {overview.runnerUp.organization && (
                            <span>{overview.runnerUp.organization}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Runner-Up (Final Wildcard Round Loser) */}
                {overview.secondRunnerUp && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0b1220]/90 to-slate-950/90 border border-blue-700/40 shadow-xl relative overflow-hidden group hover:border-blue-600/70 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-700/20 text-blue-300 border border-blue-600/40">
                        <Award className="w-3.5 h-3.5 text-blue-400" />
                        <span>2ND RUNNER-UP</span>
                      </div>
                      <span className="text-xs font-medium text-blue-300">
                        Final Wildcard Decider
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {overview.secondRunnerUp.logoUrl && (
                        <Image
                          src={overview.secondRunnerUp.logoUrl}
                          alt={overview.secondRunnerUp.name}
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 rounded-xl object-contain bg-slate-950 border border-white/10 p-1 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight">
                          {overview.secondRunnerUp.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          {overview.secondRunnerUp.organization && (
                            <span>{overview.secondRunnerUp.organization}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Interactive Bracket CTA */}
            <div className="pt-2">
              <Link
                href="/bracket"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Swords className="w-4 h-4" />
                <span>View Full Championship Bracket</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Match Spotlight: LIVE MATCH vs UP NEXT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            {/* LIVE / CURRENT MATCH */}
            <div 
              onClick={() => liveMatch && setSelectedMatch(liveMatch)}
              className="relative rounded-2xl border border-red-500/35 bg-[#0c111b] p-5 sm:p-6 flex flex-col justify-between h-full overflow-hidden cursor-pointer group hover:border-red-500/50 transition-all shadow-[0_0_30px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      LIVE IN ARENA
                    </h3>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 hidden sm:inline-flex items-center gap-1.5">
                    <span className="text-slate-400">•</span> WEAPONS HOT
                  </span>
                </div>
                {liveMatch && (
                  <span className="text-xs font-bold text-slate-300">
                    {liveMatch.stageName || liveMatch.stageType} • <span className="font-mono font-bold text-slate-200">#{liveMatch.matchNumber}</span>
                  </span>
                )}
              </div>

              {liveMatch ? (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Centered face-off 3-column layout (Team #1 | VS | Team #2) */}
                  {(() => {
                    const p1 = liveMatch.participants[0];
                    const p2 = liveMatch.participants[1];

                    return (
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 my-auto py-2">
                        {/* Team #1 */}
                        <div className="relative flex flex-col items-center justify-center pt-5 sm:pt-6 pb-4 sm:pb-5 px-3 sm:px-5 rounded-2xl bg-[#080d18]/70 border border-white/5 transition-colors w-full h-full min-w-0">
                          {/* Top edge accent (red) */}
                          <div className="absolute top-0 inset-x-0 h-1 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] rounded-t-2xl" />

                          {/* Avatar without badge */}
                          <TeamAvatar
                            logoUrl={p1?.team?.logoUrl}
                            name={p1?.team?.name}
                            cornerColor="red"
                            size="hero"
                          />

                          {/* Team name directly below in large bold type */}
                          <div className="mt-3.5 sm:mt-4 w-full min-w-0 flex items-center justify-center min-h-[2.5rem] sm:min-h-[3rem]">
                            <span className={`font-black text-white tracking-tight leading-snug break-words text-center ${getLiveNameSize(p1?.team?.name || '')}`}>
                              {p1?.team?.name || 'TBD Team'}
                            </span>
                          </div>
                        </div>

                        {/* Center Column: circular VS badge with thin fading vertical lines */}
                        <div className="flex min-[400px]:flex-col items-center justify-center self-stretch py-2 min-[400px]:py-0 px-1 sm:px-3">
                          <div className="h-px min-[400px]:h-auto min-[400px]:w-px flex-1 bg-gradient-to-r min-[400px]:bg-gradient-to-b from-transparent via-white/20 to-white/40" />
                          <div className="mx-2 min-[400px]:mx-0 min-[400px]:my-2 sm:min-[400px]:my-3.5 flex items-center justify-center shrink-0 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#080d18] border border-white/20 shadow-xl text-slate-300 font-black font-mono text-xs sm:text-sm tracking-wider">
                            VS
                          </div>
                          <div className="h-px min-[400px]:h-auto min-[400px]:w-px flex-1 bg-gradient-to-r min-[400px]:bg-gradient-to-b from-white/40 via-white/20 to-transparent" />
                        </div>

                        {/* Team #2 */}
                        <div className="relative flex flex-col items-center justify-center pt-5 sm:pt-6 pb-4 sm:pb-5 px-3 sm:px-5 rounded-2xl bg-[#080d18]/70 border border-white/5 transition-colors w-full h-full min-w-0">
                          {/* Top edge accent (blue) */}
                          <div className="absolute top-0 inset-x-0 h-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)] rounded-t-2xl" />

                          {/* Avatar without badge */}
                          <TeamAvatar
                            logoUrl={p2?.team?.logoUrl}
                            name={p2?.team?.name}
                            cornerColor="blue"
                            size="hero"
                          />

                          {/* Team name directly below in large bold type */}
                          <div className="mt-3.5 sm:mt-4 w-full min-w-0 flex items-center justify-center min-h-[2.5rem] sm:min-h-[3rem]">
                            <span className={`font-black text-white tracking-tight leading-snug break-words text-center ${getLiveNameSize(p2?.team?.name || '')}`}>
                              {p2?.team?.name || 'TBD Team'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Broadcast Footer */}
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col min-[480px]:flex-row items-center justify-center min-[480px]:justify-between gap-3 text-xs text-center min-[480px]:text-left">
                    <div className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                      <span className="font-bold uppercase tracking-wide text-white">
                        Live Combat in Progress
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 min-h-[44px] text-xs font-semibold text-slate-200 group-hover:text-white transition-colors bg-white/5 group-hover:bg-white/10 px-3.5 py-2 rounded-lg border border-white/10">
                      <span>View Match Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs my-auto">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500">
                    <Swords className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="font-bold text-sm text-white">Arena Cage On Standby</p>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    No duel currently inside the cage. Referees will initiate the next fight shortly.
                  </p>
                </div>
              )}
            </div>

            {/* UP NEXT MATCH */}
            <div 
              onClick={() => upNextMatch && setSelectedMatch(upNextMatch)}
              className="relative rounded-2xl border border-white/10 bg-[#0c111b] p-5 sm:p-6 flex flex-col justify-between h-full overflow-hidden cursor-pointer group hover:border-white/20 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-3.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    UP NEXT IN ARENA
                  </h3>
                </div>
                {upNextMatch && (
                  <span className="text-xs font-bold text-slate-300">
                    {upNextMatch.stageName || upNextMatch.stageType} • <span className="font-mono font-bold text-slate-200">#{upNextMatch.matchNumber}</span>
                  </span>
                )}
              </div>

              {upNextMatch ? (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Centered face-off layout for Up Next */}
                  {(() => {
                    const validParticipants = upNextMatch.participants.filter(
                      (p) => Boolean(p.teamId && p.team)
                    );
                    const isThreeWay = validParticipants.length === 3;

                    if (isThreeWay) {
                      return (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 my-auto py-2">
                          {validParticipants.map((p, idx) => {
                            const corner = idx === 0 ? 'red' : idx === 1 ? 'blue' : 'green';
                            return (
                              <React.Fragment key={p.id}>
                                {idx > 0 && (
                                  <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-[#080d18] border border-white/20 text-xs font-mono font-black text-slate-400 shadow-sm">
                                    VS
                                  </div>
                                )}
                                <div className="relative flex flex-col items-center justify-center pt-4 sm:pt-5 pb-3 sm:pb-4 px-2 sm:px-3 rounded-xl bg-[#080d18]/70 border border-white/5 transition-colors flex-1 min-w-[105px] max-w-[155px]">
                                  {/* Top accent */}
                                  <div className={`absolute top-0 inset-x-0 h-1 ${getCornerBorderClass(idx)} rounded-t-xl`} />

                                  <TeamAvatar
                                    logoUrl={p.team?.logoUrl}
                                    name={p.team?.name}
                                    cornerColor={corner}
                                    size="lg"
                                  />

                                  {/* Team name */}
                                  <div className="mt-2.5 sm:mt-3 w-full min-w-0 flex items-center justify-center min-h-[2.25rem] sm:min-h-[2.5rem]">
                                    <span className={`font-black text-white tracking-tight leading-snug break-words text-center ${getUpNextNameSize(p.team?.name || '')}`}>
                                      {p.team?.name || ''}
                                    </span>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    }

                    // 2-team standard match face-off pattern
                    const p1 = validParticipants[0] || upNextMatch.participants[0];
                    const p2 = validParticipants[1] || upNextMatch.participants[1];

                    return (
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 my-auto py-2">
                        {/* Team #1 */}
                        <div className="relative flex flex-col items-center justify-center pt-5 sm:pt-6 pb-4 sm:pb-5 px-3 sm:px-4 rounded-xl bg-[#080d18]/70 border border-white/5 transition-colors w-full h-full min-w-0">
                          <div className="absolute top-0 inset-x-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] rounded-t-xl" />

                          <TeamAvatar
                            logoUrl={p1?.team?.logoUrl}
                            name={p1?.team?.name}
                            cornerColor="red"
                            size="hero"
                          />

                          <div className="mt-3.5 sm:mt-4 w-full min-w-0 flex items-center justify-center min-h-[2.25rem] sm:min-h-[2.5rem]">
                            <span className={`font-black text-white tracking-tight leading-snug break-words text-center ${getUpNextNameSize(p1?.team?.name || '')}`}>
                              {p1?.team?.name || 'TBD Team'}
                            </span>
                          </div>
                        </div>

                        {/* Center VS */}
                        <div className="flex min-[400px]:flex-col items-center justify-center self-stretch py-1.5 min-[400px]:py-0 px-1 sm:px-2">
                          <div className="h-px min-[400px]:h-auto min-[400px]:w-px flex-1 bg-gradient-to-r min-[400px]:bg-gradient-to-b from-transparent via-white/20 to-white/30" />
                          <div className="mx-1.5 min-[400px]:mx-0 min-[400px]:my-1.5 sm:min-[400px]:my-2 flex items-center justify-center shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#080d18] border border-white/20 shadow-md text-slate-300 font-black font-mono text-xs tracking-wider">
                            VS
                          </div>
                          <div className="h-px min-[400px]:h-auto min-[400px]:w-px flex-1 bg-gradient-to-r min-[400px]:bg-gradient-to-b from-white/30 via-white/20 to-transparent" />
                        </div>

                        {/* Team #2 */}
                        <div className="relative flex flex-col items-center justify-center pt-5 sm:pt-6 pb-4 sm:pb-5 px-3 sm:px-4 rounded-xl bg-[#080d18]/70 border border-white/5 transition-colors w-full h-full min-w-0">
                          <div className="absolute top-0 inset-x-0 h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-t-xl" />

                          <TeamAvatar
                            logoUrl={p2?.team?.logoUrl}
                            name={p2?.team?.name}
                            cornerColor="blue"
                            size="hero"
                          />

                          <div className="mt-3.5 sm:mt-4 w-full min-w-0 flex items-center justify-center min-h-[2.25rem] sm:min-h-[2.5rem]">
                            <span className={`font-black text-white tracking-tight leading-snug break-words text-center ${getUpNextNameSize(p2?.team?.name || '')}`}>
                              {p2?.team?.name || 'TBD Team'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* High-Contrast Status Chip and Footer */}
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col min-[480px]:flex-row items-center justify-center min-[480px]:justify-between gap-3 text-xs text-center min-[480px]:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40 text-xs font-bold tracking-wide uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span>On Deck · Pre-Match Inspection</span>
                    </div>
                    <span className="inline-flex items-center gap-1 min-h-[44px] text-xs font-semibold text-slate-200 group-hover:text-white transition-colors bg-white/5 group-hover:bg-white/10 px-3.5 py-2 rounded-lg border border-white/10">
                      <span>View Match Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs my-auto">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-medium text-slate-300">No scheduled match immediately queued.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Check the full tournament bracket or matches schedule.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tournament Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Tile 1: Matches Completed with progress bar */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Matches Completed
          </span>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-black font-mono text-white leading-none">
              {overview?.completedMatchesCount ?? 0}
            </span>
            <span className="text-sm font-mono text-slate-500 leading-none mb-0.5">
              / {overview?.totalMatchesCount ?? matches.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700"
              style={{
                width: `${overview && overview.totalMatchesCount > 0
                  ? Math.round((overview.completedMatchesCount / overview.totalMatchesCount) * 100)
                  : 0}%`
              }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {overview && overview.totalMatchesCount > 0
              ? `${Math.round((overview.completedMatchesCount / overview.totalMatchesCount) * 100)}% done`
              : 'Battles concluded'}
          </span>
        </div>

        {/* Tile 2: Teams Remaining */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Teams Remaining
          </span>
          <span className="text-2xl font-black font-mono text-blue-400 leading-none">
            {overview?.activeTeams ?? teams.filter(t => t.status !== 'ELIMINATED').length}
          </span>
          <span className="text-xs text-slate-400 mt-auto">Still in contention</span>
        </div>

        {/* Tile 3: Current Round */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Current Round
          </span>
          <span className="text-xl font-black text-white leading-tight line-clamp-2">
            {overview?.currentStageDisplayName ?? '—'}
          </span>
          <span className="text-xs text-slate-400 mt-auto">Active stage</span>
        </div>
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
