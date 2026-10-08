'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTournament } from '@/context/TournamentContext';
import MatchDetailModal from '@/components/MatchDetailModal';
import { 
  Swords, 
  Radio, 
  ArrowRight, 
  Trophy, 
  Clock, 
  ChevronRight,
  Crown,
  Award,
  Flame
} from 'lucide-react';

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
    <div className="animate-in space-y-6 fade-in duration-200 sm:space-y-8">
      {/* Broadcast-style tournament hero */}
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-[#0b111c]/90 shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
        <div className="absolute inset-y-0 right-0 hidden w-[45%] overflow-hidden lg:block" aria-hidden="true">
          <div className="absolute -right-20 -top-36 h-[34rem] w-[34rem] rounded-full border border-blue-400/15" />
          <div className="absolute -right-6 -top-20 h-[26rem] w-[26rem] rounded-full border border-blue-400/10" />
          <div className="absolute right-20 top-14 h-52 w-52 rotate-45 bg-blue-400/[0.035]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b111c] via-transparent to-blue-950/20" />
        </div>

        <div key={selectedCategory} className="hero-robot-enter pointer-events-none absolute bottom-12 right-0 top-0 z-[1] hidden w-[52%] lg:block" aria-hidden="true">
          <Image
            src={selectedCategory === 'HEAVYWEIGHT' ? '/hero-battle-robot.webp' : '/hero-lightweight-robot.webp'}
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 48vw, 52vw"
            className="object-contain object-right drop-shadow-[0_28px_42px_rgba(0,0,0,0.72)]"
          />
          <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#0b111c] via-[#0b111c]/55 to-transparent" />
        </div>

        <div className="relative z-10 flex p-5 min-[400px]:p-6 sm:p-9 lg:min-h-[30rem] lg:items-center lg:p-11">
          <div className="max-w-3xl lg:max-w-[56%]">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/[0.08] px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_10px_rgba(96,165,250,0.75)]" />
                CATEGORY 01 · COMBAT ROBOTICS
              </span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-slate-400">
                {selectedCategory === 'HEAVYWEIGHT' ? '20 KG DIVISION' : '3 KG DIVISION'}
              </span>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Robot Games 2026</p>
            <h1 className="max-w-3xl text-[2rem] font-black leading-[0.94] tracking-[-0.055em] text-white min-[430px]:text-[2.2rem] sm:text-6xl lg:text-7xl">
              GREATNESS<br />
              <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">SHOWS NO MERCY.</span>
            </h1>

            <div className="mt-8 grid w-full gap-2.5 min-[480px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
              <Link href="/bracket" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-[0_12px_32px_rgba(37,99,235,0.24)] transition hover:bg-blue-500">
                Explore the bracket
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/matches" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-xs font-bold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]">
                <Radio className="h-4 w-4 text-blue-400" />
                Arena schedule
              </Link>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2.5 border-t border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 min-[400px]:px-6 sm:px-9 sm:text-[10px] sm:tracking-[0.14em] lg:px-11">
          <span className="h-px w-6 shrink-0 bg-blue-400/50 sm:w-8" />
          One arena. One champion. Every match matters.
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
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-300/20 text-slate-200 border border-slate-400/40">
                        <Award className="w-3.5 h-3.5 text-slate-300" />
                        <span>1ST RUNNER-UP</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
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
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-700/20 text-blue-300 border border-blue-600/40">
                        <Award className="w-3.5 h-3.5 text-blue-400" />
                        <span>2ND RUNNER-UP</span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400/80">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LIVE / CURRENT MATCH */}
            <div className="relative rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-[#1a080d]/95 via-[#110508]/95 to-slate-950 p-6 shadow-2xl shadow-red-950/50 overflow-hidden group hover:border-red-500/70 transition-all duration-300">
              {/* Crimson top edge illumination beam */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.9)]" />

              {/* Ambient radial red aura in background corners */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 flex items-center justify-between pb-4 border-b border-red-500/20 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 shadow-sm shadow-red-950">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-red-300">
                      LIVE IN ARENA
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/80 hidden sm:inline-flex items-center gap-1 font-bold">
                    <span>•</span> WEAPONS HOT
                  </span>
                </div>
                {liveMatch && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/30 text-red-200 font-mono text-xs font-bold shadow-inner">
                    {liveMatch.stageName || liveMatch.stageType} • #{liveMatch.matchNumber}
                  </span>
                )}
              </div>

              {liveMatch ? (
                <div 
                  onClick={() => setSelectedMatch(liveMatch)}
                  className="relative z-10 cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <div className="space-y-2.5">
                    {liveMatch.participants.map((p, idx) => {
                      const isEmpty = !p.teamId || !p.team;
                      if (isEmpty) {
                        return (
                          <div
                            key={p.id}
                            className="flex items-center h-16 p-4 rounded-xl bg-red-950/20 border border-dashed border-red-500/20"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-950/40 text-red-400/60 font-bold text-xs flex items-center justify-center font-mono border border-red-500/20">
                              #{idx + 1}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <React.Fragment key={p.id}>
                          {idx > 0 && (
                            <div className="relative py-1 flex items-center justify-center">
                              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                              <div className="relative z-10 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#2a0b12] to-[#1c080d] border border-red-500/40 shadow-md shadow-red-950 text-red-200 font-mono text-[10px] font-black uppercase tracking-widest">
                                <Swords className="w-3 h-3 text-red-400 animate-pulse" />
                                <span>VS</span>
                              </div>
                            </div>
                          )}

                          <div className="group/combatant relative overflow-hidden rounded-xl border border-red-500/25 bg-gradient-to-r from-[#1c080e]/90 via-[#120508]/90 to-slate-950/95 p-3.5 sm:p-4 transition-all duration-200 hover:border-red-500/60 hover:bg-[#220a11]/90 shadow-md shadow-red-950/20">
                            {/* Crimson accent line on the left */}
                            <div className="absolute left-0 inset-y-0 w-1 bg-gradient-to-b from-red-500 via-rose-500 to-red-700 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />

                            <div className="flex items-center justify-between gap-3 pl-1.5">
                              <div className="flex items-center gap-3.5 min-w-0">
                                {/* Logo or Seed / Slot Badge */}
                                {p.team?.logoUrl ? (
                                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black/60 border border-red-500/30 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                    <Image
                                      src={p.team.logoUrl}
                                      alt={p.team.name}
                                      width={48}
                                      height={48}
                                      unoptimized
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-600 to-rose-950 text-white font-black text-xs sm:text-sm flex items-center justify-center border border-red-400/40 shadow-md shadow-red-950/50 shrink-0 font-mono">
                                    #{idx + 1}
                                  </div>
                                )}

                                {/* Team Name and Metadata */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base sm:text-lg font-black text-white tracking-tight group-hover/combatant:text-red-200 transition-colors truncate block">
                                      {p.team?.name || ''}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {p.team?.robotName && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/30">
                                        <Flame className="w-3 h-3 text-red-400 shrink-0" />
                                        <span>Bot: {p.team.robotName}</span>
                                      </span>
                                    )}
                                    {p.team?.organization && (
                                      <span className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[220px]">
                                        {p.team.organization}
                                      </span>
                                    )}
                                    {typeof p.team?.lives === 'number' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        ❤️ {p.team.lives}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Live Score if present */}
                              {typeof p.score === 'number' && p.score !== 0 && (
                                <div className="text-right pl-3 shrink-0">
                                  <div className="text-2xl sm:text-3xl font-mono font-black text-white bg-black/60 px-3 py-1 rounded-xl border border-red-500/30 shadow-inner">
                                    {p.score}
                                  </div>
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-red-400 block mt-0.5 font-bold">
                                    PTS
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Broadcast Footer */}
                  <div className="mt-5 pt-3.5 border-t border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-red-400">
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
                        <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      </div>
                      <div>
                        <span className="font-extrabold uppercase tracking-wide text-red-200 block sm:inline">
                          Live Combat in Progress
                        </span>
                        <span className="text-[10px] text-red-400/70 font-mono sm:ml-2">
                          Arena cage locked • Scoring active
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300 group-hover:text-white transition-colors bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-xl border border-red-500/30 self-end sm:self-auto shadow-sm">
                      <span>View Match Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 py-10 text-center text-xs">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-red-950/60 to-slate-950 border border-red-500/25 flex items-center justify-center text-red-400/80 shadow-lg shadow-red-950/50">
                    <Swords className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="font-extrabold text-sm text-white tracking-tight">Arena Cage On Standby</p>
                  <p className="text-[11px] text-red-300/70 mt-1 max-w-xs mx-auto">
                    No duel currently inside the cage. Referees will initiate the next fight shortly.
                  </p>
                </div>
              )}
            </div>

            {/* UP NEXT MATCH */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e1628]/90 to-slate-950 p-6 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    UP NEXT IN ARENA
                  </h3>
                </div>
                {upNextMatch && (
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {upNextMatch.stageName || upNextMatch.stageType} • #{upNextMatch.matchNumber}
                  </span>
                )}
              </div>

              {upNextMatch ? (
                <div 
                  onClick={() => setSelectedMatch(upNextMatch)}
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <div className="space-y-3">
                    {upNextMatch.participants.map((p, idx) => {
                      const isEmpty = !p.teamId || !p.team;
                      if (isEmpty) {
                        return (
                          <div
                            key={p.id}
                            className="flex items-center p-3.5 rounded-xl bg-slate-950/20 border border-dashed border-white/10"
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-800/50 text-slate-500 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-white text-base truncate block">
                                {p.team?.name || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-blue-400 font-medium">On Deck / Pre-Match Inspection</span>
                    <span className="text-slate-400 underline hover:text-white">
                      Tap for Details
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-medium text-slate-400">No scheduled match immediately queued.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Check the full tournament bracket or matches schedule.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tournament Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Competitors
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {overview?.totalTeams || teams.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Registered Robots
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Active Contenders
          </span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {overview?.activeTeams || teams.filter(t => t.status !== 'ELIMINATED').length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Still in Contention
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Matches Completed
          </span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {overview?.completedMatchesCount || 0}
            <span className="text-sm font-normal text-slate-500 ml-1">
              / {overview?.totalMatchesCount || matches.length}
            </span>
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Battles Concluded
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Wildcard System
          </span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            Active
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            3-Way Second Chance
          </span>
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
