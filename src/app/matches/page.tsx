'use client';

import React, { useState, useMemo } from 'react';
import { useTournament } from '@/context/TournamentContext';
import MatchCard from '@/components/MatchCard';
import MatchDetailModal from '@/components/MatchDetailModal';
import { Radio, Clock, Check, Filter, Swords, RefreshCw } from 'lucide-react';
import { Match } from '@/lib/types';

type FilterTab = 'ALL' | 'LIVE' | 'UP_NEXT' | 'UPCOMING' | 'COMPLETED';

export default function MatchesPage() {
  const {
    selectedCategory,
    setSelectedCategory,
    matches,
    overview,
    isLoading,
    refresh,
    selectedMatch,
    setSelectedMatch
  } = useTournament();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const liveMatches = useMemo(() => matches.filter(m => m.status === 'LIVE'), [matches]);
  const completedMatches = useMemo(() => matches.filter(m => m.status === 'COMPLETED' || m.status === 'BYE'), [matches]);
  const upcomingMatches = useMemo(() => matches.filter(m => m.status === 'SCHEDULED'), [matches]);

  const upNextMatch = overview?.upNextMatch;

  const filteredMatches = useMemo(() => {
    switch (activeTab) {
      case 'LIVE':
        return liveMatches;
      case 'UP_NEXT':
        return upNextMatch ? [upNextMatch] : [];
      case 'UPCOMING':
        return upcomingMatches;
      case 'COMPLETED':
        return completedMatches;
      default:
        return matches;
    }
  }, [activeTab, matches, liveMatches, upNextMatch, upcomingMatches, completedMatches]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 block">
                Robot Battles Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                MATCHES & ARENA SCHEDULE
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time combat duels, upcoming battle schedule, and finished match logs.
          </p>
        </div>

        {/* Division Switcher */}
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
              HEAVYWEIGHT
            </button>
            <button
              onClick={() => setSelectedCategory('LIGHTWEIGHT')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === 'LIGHTWEIGHT'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LIGHTWEIGHT
            </button>
          </div>

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
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'ALL'
              ? 'bg-white text-black shadow-md'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <span>All Matches</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {matches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LIVE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'LIVE'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse" />
          <span>Live Now</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-white">
            {liveMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UP_NEXT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'UP_NEXT'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Up Next</span>
          {upNextMatch && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-white">
              1
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'UPCOMING'
              ? 'bg-slate-800 text-white border border-slate-600'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <span>Upcoming</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
            {upcomingMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Completed</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-emerald-200">
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
            Try switching filter tabs or check back as the tournament progresses.
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
