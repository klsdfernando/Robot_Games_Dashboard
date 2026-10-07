'use client';

import React from 'react';
import Link from 'next/link';
import { useTournament } from '@/context/TournamentContext';
import TournamentProgressStepper from '@/components/TournamentProgressStepper';
import MatchDetailModal from '@/components/MatchDetailModal';
import { 
  Swords, 
  Radio, 
  ArrowRight, 
  Shield, 
  Users, 
  Trophy, 
  Clock, 
  Calendar,
  Layers,
  ChevronRight,
  Flame,
  Flag,
  Zap,
  Crown,
  Award
} from 'lucide-react';

export default function HomePage() {
  const { 
    selectedCategory, 
    setSelectedCategory, 
    overview, 
    stages, 
    matches, 
    teams, 
    isLoading,
    selectedMatch,
    setSelectedMatch
  } = useTournament();

  const liveMatch = overview?.liveMatch;
  const upNextMatch = overview?.upNextMatch;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Header & Division Selector Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e1628] via-[#090d16] to-[#0d1424] p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>ROBOT GAMES 2026 • CATEGORY 1</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              ROBOT BATTLES 2026
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              High-intensity combat robotics championship. Follow live brackets, second-chance wildcard battles, and knockout progression to the crown.
            </p>
          </div>

          {/* Division Selector Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4" />
              <div className="text-left">
                <span className="block leading-none">HEAVYWEIGHT</span>
                <span className="text-[10px] opacity-75 font-mono">Max 30kg</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4" />
              <div className="text-left">
                <span className="block leading-none">LIGHTWEIGHT</span>
                <span className="text-[10px] opacity-75 font-mono">Max 15kg</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* TOURNAMENT SPOTLIGHT: WINNER SHOW OFF vs ACTIVE MATCH SPOTLIGHT */}
      {overview?.champion ? (
        /* OFFICIAL WINNER LOGO, WINNER NAME & PODIUM HONORS SHOW OFF */
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1a1228] via-[#0d101e] to-[#140e22] p-8 sm:p-12 shadow-2xl shadow-amber-500/15 text-center">
          {/* Subtle background ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-6">
            {/* Winner Logo */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-1 shadow-2xl shadow-amber-500/30">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[22px] flex items-center justify-center overflow-hidden">
                  {overview.champion.logoUrl ? (
                    <img
                      src={overview.champion.logoUrl}
                      alt={overview.champion.name}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400" />
                  )}
                </div>
              </div>
              <div className="absolute -top-3 -right-3 p-2 rounded-full bg-amber-400 text-black shadow-lg">
                <Crown className="w-5 h-5 fill-black" />
              </div>
            </div>

            {/* Winner Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Trophy className="w-3.5 h-3.5" />
              <span>{selectedCategory} TOURNAMENT CHAMPION</span>
            </div>

            {/* Champion Winner Name */}
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                {overview.champion.name}
              </h2>
              {overview.champion.robotName && (
                <p className="text-sm sm:text-base font-semibold text-amber-300/90 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Robot: {overview.champion.robotName}</span>
                  {overview.champion.organization && (
                    <span className="text-slate-400">• {overview.champion.organization}</span>
                  )}
                </p>
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
                        <img
                          src={overview.runnerUp.logoUrl}
                          alt={overview.runnerUp.name}
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
                          {overview.runnerUp.robotName && (
                            <span className="text-slate-300 font-medium">
                              Bot: {overview.runnerUp.robotName}
                            </span>
                          )}
                          {overview.runnerUp.organization && (
                            <span>• {overview.runnerUp.organization}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Runner-Up (Final Wildcard Round Loser) */}
                {overview.secondRunnerUp && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c141d]/90 to-slate-950/90 border border-amber-700/40 shadow-xl relative overflow-hidden group hover:border-amber-600/70 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-700/20 text-amber-300 border border-amber-600/40">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>2ND RUNNER-UP</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400/80">
                        Final Wildcard Decider
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {overview.secondRunnerUp.logoUrl && (
                        <img
                          src={overview.secondRunnerUp.logoUrl}
                          alt={overview.secondRunnerUp.name}
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
                          {overview.secondRunnerUp.robotName && (
                            <span className="text-amber-200/90 font-medium">
                              Bot: {overview.secondRunnerUp.robotName}
                            </span>
                          )}
                          {overview.secondRunnerUp.organization && (
                            <span>• {overview.secondRunnerUp.organization}</span>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
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
          {/* Current Tournament Stage Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-4 p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-blue-950/30 border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block">
                    Current Tournament Stage
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {overview?.currentStageDisplayName || 'Tournament Registration'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/bracket"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-lg shadow-sky-500/20"
                >
                  <Swords className="w-4 h-4" />
                  <span>View Interactive Bracket</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Match Spotlight: LIVE MATCH vs UP NEXT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LIVE / CURRENT MATCH */}
            <div className="relative rounded-2xl border border-rose-500/40 bg-gradient-to-br from-[#1b1219]/90 to-slate-950 p-6 shadow-xl shadow-rose-950/20 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-live-pulse" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                    LIVE / CURRENT MATCH
                  </h3>
                </div>
                {liveMatch && (
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {liveMatch.stageName || liveMatch.stageType} • #{liveMatch.matchNumber}
                  </span>
                )}
              </div>

              {liveMatch ? (
                <div 
                  onClick={() => setSelectedMatch(liveMatch)}
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <div className="space-y-3">
                    {liveMatch.participants.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-white/5"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div className="truncate">
                            <span className="font-extrabold text-white text-base truncate block">
                              {p.team?.name || p.placeholderText || 'TBD'}
                            </span>
                            {p.team?.robotName && (
                              <span className="text-xs text-rose-300/80 block">
                                Bot: {p.team.robotName}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.score !== null && p.score !== undefined && (
                          <span className="text-xl font-mono font-bold text-white px-2 py-0.5 rounded bg-black/40">
                            {p.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      Live Combat in Progress
                    </span>
                    <span className="text-slate-400 underline hover:text-white">
                      Tap for Match Details
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Swords className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-medium text-slate-400">No active match in arena right now.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Referees will start the next scheduled duel shortly.
                  </p>
                </div>
              )}
            </div>

            {/* UP NEXT MATCH */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e1628]/90 to-slate-950 p-6 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
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
                    {upNextMatch.participants.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-white text-base truncate block">
                              {p.team?.name || p.placeholderText || 'TBD Competitor'}
                            </span>
                            {p.team?.robotName && (
                              <span className="text-xs text-slate-400 block">
                                Bot: {p.team.robotName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-sky-400 font-medium">On Deck / Pre-Match Inspection</span>
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

      {/* Tournament Progress Stepper */}
      <TournamentProgressStepper
        stages={stages}
        currentStage={overview?.currentStage || 'REGISTRATION'}
        isCompleted={Boolean(overview?.isCompleted)}
      />

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
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
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
          <span className="text-2xl font-black text-sky-400 mt-1 block">
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
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            Active
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            3-Way Second Chance
          </span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/bracket"
          className="group p-5 rounded-2xl bg-[#0c1322] border border-white/10 hover:border-sky-500/50 hover:bg-[#121c33] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Swords className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-white text-base">Full Tournament Bracket</h4>
          <p className="text-xs text-slate-400 mt-1">
            Visual flowchart of Round 1, Wildcard paths, Re-Entry play-ins, and Knockouts.
          </p>
        </Link>

        <Link
          href="/matches"
          className="group p-5 rounded-2xl bg-[#0c1322] border border-white/10 hover:border-sky-500/50 hover:bg-[#121c33] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-white text-base">Matches & Results</h4>
          <p className="text-xs text-slate-400 mt-1">
            Filter upcoming duels, active arena fights, and completed battle archives.
          </p>
        </Link>

        <Link
          href="/teams"
          className="group p-5 rounded-2xl bg-[#0c1322] border border-white/10 hover:border-sky-500/50 hover:bg-[#121c33] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-bold text-white text-base">Competitor Roster</h4>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered university combat teams, robot specs, and contention statuses.
          </p>
        </Link>
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
