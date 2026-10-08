'use client';

import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import TournamentTreeGraph from '@/components/TournamentTreeGraph';
import MatchDetailModal from '@/components/MatchDetailModal';
import ChampionBanner from '@/components/ChampionBanner';
import { Swords, RefreshCw, GitBranch } from 'lucide-react';

export default function BracketPage() {
  const {
    selectedCategory,
    overview,
    stages,
    matches,
    teams,
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

      <section className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-400">
            <GitBranch className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">{selectedCategory} division</p>
            <h1 className="truncate text-xl font-black text-white sm:text-2xl">Tournament bracket</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">
            {overview?.currentStageDisplayName || 'Bracket ready'}
          </span>
          <button
            onClick={() => refresh()}
            title="Refresh bracket"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-blue-500/30 hover:text-blue-300"
            aria-label="Refresh bracket"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Bracket Component */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" />
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
        <TournamentTreeGraph
          stages={stages}
          matches={matches}
          overview={overview}
          teams={teams}
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
