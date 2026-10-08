'use client';

import React, { useState, useMemo } from 'react';
import { useTournament } from '@/context/TournamentContext';
import MatchCard from '@/components/MatchCard';
import MatchDetailModal from '@/components/MatchDetailModal';
import { Radio, Clock, Check, Swords, RefreshCw } from 'lucide-react';

type FilterTab = 'CURRENT' | 'LIVE' | 'UPCOMING' | 'COMPLETED';

export default function MatchesPage() {
  const {
    matches,
    overview,
    refresh,
    selectedMatch,
    setSelectedMatch
  } = useTournament();

  const [activeTab, setActiveTab] = useState<FilterTab>('CURRENT');

  const currentStageMatches = useMemo(() => {
    if (!overview?.currentStage || overview.currentStage === 'COMPLETED') return [];
    return matches.filter((match) => match.stageType === overview.currentStage);
  }, [matches, overview?.currentStage]);
  const liveMatches = useMemo(
    () => currentStageMatches.filter((match) => match.status === 'LIVE').slice(0, 2),
    [currentStageMatches]
  );
  const completedMatches = useMemo(
    () => currentStageMatches.filter((match) => match.status === 'COMPLETED' || match.status === 'BYE'),
    [currentStageMatches]
  );
  const upcomingMatches = useMemo(
    () => currentStageMatches.filter((match) => match.status === 'SCHEDULED'),
    [currentStageMatches]
  );

  const filteredMatches = useMemo(() => {
    switch (activeTab) {
      case 'LIVE':
        return liveMatches;
      case 'UPCOMING':
        return upcomingMatches;
      case 'COMPLETED':
        return completedMatches;
      default:
        return [...currentStageMatches].sort((a, b) => {
          const order = { LIVE: 0, SCHEDULED: 1, COMPLETED: 2, BYE: 3 };
          return order[a.status] - order[b.status] || a.matchNumber - b.matchNumber;
        });
    }
  }, [activeTab, currentStageMatches, liveMatches, upcomingMatches, completedMatches]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 block">
                Robot Battles Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {overview?.currentStageDisplayName || 'CURRENT STAGE'} MATCHES
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Only the active bracket stage is shown here. Live battles appear first and winners update automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => refresh()}
            title="Refresh Matches"
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('CURRENT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'CURRENT'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Current Stage</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-white">
            {currentStageMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LIVE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'LIVE'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-live-pulse" />
          <span>Live Now</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-white">
            {liveMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'UPCOMING'
              ? 'bg-slate-800 text-white border border-slate-600'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Upcoming</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
            {upcomingMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'COMPLETED'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Completed</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-blue-200">
            {completedMatches.length}
          </span>
        </button>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8">
          <Swords className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-white">No matches found in this filter</h3>
          <p className="text-xs text-slate-400 mt-1">
            This stage has no matches in the selected view yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => setSelectedMatch(match)}
            />
          ))}
        </div>
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
