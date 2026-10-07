'use client';

import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import GraphicalBracket from '@/components/GraphicalBracket';
import MatchDetailModal from '@/components/MatchDetailModal';
import ChampionBanner from '@/components/ChampionBanner';
import { Swords, Shield, Radio, RefreshCw, Trophy, Info } from 'lucide-react';

export default function BracketPage() {
  const {
    selectedCategory,
    setSelectedCategory,
    overview,
    stages,
    matches,
    isLoading,
    refresh,
    selectedMatch,
    setSelectedMatch
  } = useTournament();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Champion Banner (if completed) */}
      {overview?.isCompleted && overview?.champion && (
        <ChampionBanner
          category={selectedCategory}
          champion={overview.champion}
          runnerUp={overview.runnerUp}
          secondRunnerUp={overview.secondRunnerUp}
        />
      )}

      {/* Bracket Header with Division Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400 block">
                Robot Battles Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                TOURNAMENT BRACKET
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual flowchart of Round 1 duels, Wildcard survival matches, Re-Entry play-ins, and Knockouts.
          </p>
        </div>

        {/* Division Selector & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10 flex-1 sm:flex-initial">
            <button
              onClick={() => setSelectedCategory('HEAVYWEIGHT')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === 'HEAVYWEIGHT'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HEAVYWEIGHT (30kg)
            </button>
            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LIGHTWEIGHT (15kg)
            </button>
          </div>

          <button
            onClick={() => refresh()}
            title="Refresh Bracket"
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bracket Component */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-sky-400" />
          <p className="text-sm font-semibold">Loading tournament bracket...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-8">
          <Swords className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No Bracket Matches Generated Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            The tournament bracket for this category has not been officially launched by organizers yet. Registered teams are listed on the Teams page.
          </p>
        </div>
      ) : (
        <GraphicalBracket
          stages={stages}
          matches={matches}
          overview={overview}
          onSelectMatch={(m) => setSelectedMatch(m)}
        />
      )}

      {/* Match Details Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
