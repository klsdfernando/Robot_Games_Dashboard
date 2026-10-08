'use client';

import React from 'react';
import { Team, TournamentCategory } from '@/lib/types';
import { Trophy, Award, Sparkles, Shield } from 'lucide-react';
import TeamAvatar from './TeamAvatar';

interface ChampionBannerProps {
  category: TournamentCategory;
  champion: Team;
  runnerUp?: Team | null;
  secondRunnerUp?: Team | null;
}

export default function ChampionBanner({ category, champion, runnerUp, secondRunnerUp }: ChampionBannerProps) {
  const isHeavy = category === 'HEAVYWEIGHT';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl shadow-blue-500/10 mb-8">
      {/* Background accents */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-400 to-blue-300 p-0.5 shadow-xl shadow-blue-500/25">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
                <Trophy className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-blue-500 text-black shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>{category} TOURNAMENT CHAMPION</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {champion.name}
            </h2>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-slate-300">
              {champion.organization && (
                <span className="text-slate-400">
                  {champion.organization}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Podium Runners-Up Cards */}
        {(runnerUp || secondRunnerUp) && (
          <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto">
            {runnerUp && (
              <div className="flex-1 sm:flex-initial p-4 rounded-2xl bg-slate-900/90 border border-slate-400/40 shadow-lg min-w-[210px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-300/20 text-slate-200 border border-slate-400/30">
                    <Award className="w-3 h-3 text-slate-300" />
                    <span>1ST RUNNER-UP</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">Finalist</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <TeamAvatar
                    logoUrl={runnerUp.logoUrl}
                    name={runnerUp.name}
                    size="md"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">{runnerUp.name}</h4>
                    {runnerUp.organization && <span className="mt-0.5 block text-xs text-slate-400">{runnerUp.organization}</span>}
                  </div>
                </div>
              </div>
            )}

            {secondRunnerUp && (
              <div className="flex-1 sm:flex-initial p-4 rounded-2xl bg-[#0b1220]/90 border border-blue-600/40 shadow-lg min-w-[210px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-700/20 text-blue-300 border border-blue-600/30">
                    <Award className="w-3 h-3 text-blue-400" />
                    <span>2ND RUNNER-UP</span>
                  </span>
                  <span className="text-[9px] font-mono text-blue-400/70">Wildcard Final</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <TeamAvatar
                    logoUrl={secondRunnerUp.logoUrl}
                    name={secondRunnerUp.name}
                    size="md"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">{secondRunnerUp.name}</h4>
                    {secondRunnerUp.organization && <span className="mt-0.5 block text-xs text-blue-200/80">{secondRunnerUp.organization}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
