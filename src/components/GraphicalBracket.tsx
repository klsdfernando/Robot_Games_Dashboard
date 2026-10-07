'use client';

import React, { useState, useMemo } from 'react';
import { TournamentStage, Match, StageType, TournamentOverview } from '@/lib/types';
import TournamentTreeGraph from './TournamentTreeGraph';
import MatchCard from './MatchCard';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Flame, 
  Swords, 
  Trophy, 
  Sparkles,
  GitBranch,
  Columns3
} from 'lucide-react';

interface GraphicalBracketProps {
  stages: TournamentStage[];
  matches: Match[];
  overview: TournamentOverview | null;
  onSelectMatch: (match: Match) => void;
}

export default function GraphicalBracket({
  stages,
  matches,
  overview,
  onSelectMatch
}: GraphicalBracketProps) {
  // Main view mode: 'TREE' (default - exact graph tree) vs 'COLUMNS' (legacy stage columns)
  const [displayLayout, setDisplayLayout] = useState<'TREE' | 'COLUMNS'>('TREE');

  // Mobile active stage tab for columns mode
  const [mobileStageIndex, setMobileStageIndex] = useState(0);

  // Group matches by stage for columns view
  const matchesByStage = useMemo(() => {
    const map = new Map<StageType, Match[]>();
    for (const m of matches) {
      if (!map.has(m.stageType)) {
        map.set(m.stageType, []);
      }
      map.get(m.stageType)!.push(m);
    }
    return map;
  }, [matches]);

  // Ordered list of stage types present
  const stageOrder: StageType[] = useMemo(() => {
    if (stages.length > 0) {
      return stages
        .filter(s => s.stageType !== 'REGISTRATION' && s.stageType !== 'COMPLETED')
        .sort((a, b) => a.stageOrder - b.stageOrder)
        .map(s => s.stageType);
    }
    return ['ROUND_1', 'WILDCARD', 'QUARTERFINAL', 'QUARTERFINAL_WILDCARD', 'SEMIFINAL', 'SEMIFINAL_WILDCARD', 'WINNERS_FINAL', 'WILDCARD_FINAL', 'FINAL'];
  }, [stages]);

  // Stage display info
  const getStageHeader = (stageType: StageType) => {
    switch (stageType) {
      case 'ROUND_1':
        return {
          title: 'Round 1',
          subtitle: '2 by 2 Battles (1v1)',
          flowNote: 'Winners → Next Winner Round | Losers → Wildcard',
          theme: 'border-sky-500/40 text-sky-400 bg-sky-950/20'
        };
      case 'WILDCARD':
        return {
          title: 'Round 1 Wildcard',
          subtitle: '3-Way & 2-Way Second Chance',
          flowNote: '1 Winner per match advances | Losers Eliminated',
          theme: 'border-amber-500/50 text-amber-400 bg-amber-950/30'
        };
      case 'RE_ENTRY':
        return {
          title: 'Play-In Qualifier',
          subtitle: 'Contender Advancement',
          flowNote: 'Advancement to Next Round',
          theme: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20'
        };
      case 'ROUND_OF_16':
        return {
          title: 'Round of 16',
          subtitle: 'Top 16 Battles (2v2)',
          flowNote: 'Winners advance | Losers → Wildcard',
          theme: 'border-blue-500/40 text-blue-400 bg-blue-950/20'
        };
      case 'QUARTERFINAL':
        return {
          title: 'Quarterfinals',
          subtitle: 'Main 2 by 2 Battles',
          flowNote: 'Winners → Semis | Losers → QF Wildcard',
          theme: 'border-indigo-500/40 text-indigo-400 bg-indigo-950/20'
        };
      case 'QUARTERFINAL_WILDCARD':
        return {
          title: 'QF Wildcard',
          subtitle: '3-Way & 2-Way Second Chance',
          flowNote: '1 Winner per match advances | Losers Eliminated',
          theme: 'border-amber-500/50 text-amber-400 bg-amber-950/30'
        };
      case 'SEMIFINAL':
        return {
          title: 'Semifinals',
          subtitle: 'Main 2 by 2 Battles',
          flowNote: 'Winners → Winners Final | Losers → Wildcard',
          theme: 'border-purple-500/40 text-purple-400 bg-purple-950/20'
        };
      case 'SEMIFINAL_WILDCARD':
        return {
          title: 'Semifinals Wildcard',
          subtitle: '3-Way & 2-Way Second Chance',
          flowNote: '1 Winner advances to Wildcard Final | Losers Eliminated',
          theme: 'border-amber-600/50 text-amber-300 bg-amber-950/30'
        };
      case 'WINNERS_FINAL':
        return {
          title: 'Winners Final',
          subtitle: 'Upper Championship (2v2)',
          flowNote: 'Winner → Grand Finals (as Upper Champion) | Loser → Wildcard Final',
          theme: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/30'
        };
      case 'WILDCARD_SEMIFINAL':
        return {
          title: 'Wildcard Semifinals',
          subtitle: '3-Way & 2-Way Battles',
          flowNote: 'Winners → Wildcard Final Decider | Losers Eliminated',
          theme: 'border-amber-600/50 text-amber-300 bg-amber-950/30'
        };
      case 'WILDCARD_FINAL':
        return {
          title: 'Wildcard Final Decider',
          subtitle: 'Battle for Grand Finals Spot',
          flowNote: 'Winner → Grand Finals (as Wildcard Champion) | Losers Eliminated',
          theme: 'border-amber-500/60 text-amber-300 bg-amber-950/40'
        };
      case 'FINAL':
        return {
          title: 'Grand Finals',
          subtitle: 'Winners Champion vs Wildcard Champion',
          flowNote: 'Upper Winner vs Wildcard Winner • Title Match!',
          theme: 'border-amber-500/70 text-amber-300 bg-amber-950/40'
        };
      default:
        return {
          title: stageType,
          subtitle: 'Stage Matches',
          flowNote: 'Tournament Progression',
          theme: 'border-white/10 text-slate-300 bg-slate-900/50'
        };
    }
  };

  const currentMobileStage = stageOrder[mobileStageIndex] || stageOrder[0];
  const currentMobileMatches = matchesByStage.get(currentMobileStage) || [];
  const mobileHeaderInfo = getStageHeader(currentMobileStage);

  return (
    <div className="space-y-6">
      {/* Top Layout Format Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDisplayLayout('TREE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              displayLayout === 'TREE'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Interactive Tree Graph</span>
          </button>

          <button
            onClick={() => setDisplayLayout('COLUMNS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              displayLayout === 'COLUMNS'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Stage Columns Browser</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          {displayLayout === 'TREE' ? 'Main bracket tree + separated wildcard arena' : 'Horizontal column card stacks'}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. PRIMARY VIEW: TOURNAMENT TREE GRAPH                    */}
      {/* ========================================================= */}
      {displayLayout === 'TREE' && (
        <TournamentTreeGraph
          stages={stages}
          matches={matches}
          overview={overview}
          onSelectMatch={onSelectMatch}
        />
      )}

      {/* ========================================================= */}
      {/* 2. ALTERNATIVE VIEW: STAGE COLUMNS BROWSER                */}
      {/* ========================================================= */}
      {displayLayout === 'COLUMNS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Visual Tournament Flow Legend */}
          <div className="bg-[#0b101d] border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tournament Journey Legend (2 Lives System)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 rounded bg-sky-400" />
                  <span className="text-slate-300">Winner → Main Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 rounded border-b-2 border-dashed border-amber-400" />
                  <span className="text-amber-400">1st Loss → Wildcard Second Chance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold">
                    ✕
                  </span>
                  <span className="text-rose-400">2nd Loss → Eliminated</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-purple-500/30 text-purple-300 border border-purple-500/50 flex items-center justify-center text-[10px] font-bold">
                    B
                  </span>
                  <span className="text-purple-300">BYE Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-medium">Champion</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Horizontal Scroll Columns */}
          <div className="hidden lg:block w-full overflow-x-auto pb-6">
            <div className="flex items-start gap-8 min-w-max px-2 py-4">
              {stageOrder.map((stageType) => {
                const stageMatches = matchesByStage.get(stageType) || [];
                const header = getStageHeader(stageType);
                const isWildcard = stageType.includes('WILDCARD');
                const isFinal = stageType === 'FINAL';

                return (
                  <div
                    key={stageType}
                    className={`flex flex-col flex-shrink-0 w-80 rounded-2xl p-4 border transition-all ${
                      isWildcard
                        ? 'bg-[#12111d]/90 border-amber-500/30 shadow-lg shadow-amber-950/20'
                        : isFinal
                        ? 'bg-[#15121b]/90 border-amber-400/40 shadow-xl shadow-amber-950/30'
                        : 'bg-[#0d1424]/80 border-white/10'
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`p-3 rounded-xl mb-4 border ${header.theme}`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">
                          {header.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-slate-300">
                          {stageMatches.length} Matches
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {header.subtitle}
                      </p>
                      <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] flex items-center gap-1 font-medium">
                        <ArrowRight className="w-3 h-3 text-sky-400 flex-shrink-0" />
                        <span className="truncate">{header.flowNote}</span>
                      </div>
                    </div>

                    {/* Match Cards Stack */}
                    <div className="space-y-4 flex-1">
                      {stageMatches.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
                          <p>Stage not generated yet.</p>
                          <p className="text-[10px] text-slate-600 mt-1">
                            Will be unlocked after preceding stage matches conclude.
                          </p>
                        </div>
                      ) : (
                        stageMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            onClick={() => onSelectMatch(match)}
                          />
                        ))
                      )}
                    </div>

                    {/* Champion Visual Plinth for Finals */}
                    {isFinal && overview?.champion && (
                      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-500/50 text-center animate-in fade-in">
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center mx-auto mb-1.5 shadow-md">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-extrabold tracking-wider text-amber-300 uppercase block">
                          OFFICIAL CHAMPION
                        </span>
                        <span className="text-base font-black text-white block mt-0.5">
                          {overview.champion.name}
                        </span>
                        {overview.champion.robotName && (
                          <span className="text-xs text-amber-300/80 block">
                            Bot: {overview.champion.robotName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {/* Horizontal Mobile Stage Selector Tabs */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex items-center gap-1.5 min-w-max">
                {stageOrder.map((stageType, idx) => {
                  const info = getStageHeader(stageType);
                  const isSelected = idx === mobileStageIndex;
                  const matchesCount = matchesByStage.get(stageType)?.length || 0;

                  return (
                    <button
                      key={stageType}
                      onClick={() => setMobileStageIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <span>{info.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {matchesCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Stage Header Banner */}
            <div className={`p-4 rounded-2xl border ${mobileHeaderInfo.theme}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Current Stage View
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {mobileHeaderInfo.title}
                  </h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 text-slate-300">
                  {currentMobileMatches.length} Matches
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {mobileHeaderInfo.subtitle}
              </p>
              <div className="mt-2 pt-2 border-t border-white/10 text-xs flex items-center gap-1.5 text-sky-300">
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{mobileHeaderInfo.flowNote}</span>
              </div>
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setMobileStageIndex(prev => Math.max(0, prev - 1))}
                disabled={mobileStageIndex === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900 border border-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Stage</span>
              </button>

              <span className="text-xs font-mono text-slate-500 px-1">
                {mobileStageIndex + 1} of {stageOrder.length}
              </span>

              <button
                onClick={() => setMobileStageIndex(prev => Math.min(stageOrder.length - 1, prev + 1))}
                disabled={mobileStageIndex === stageOrder.length - 1}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900 border border-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
              >
                <span>Next Stage</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Match Cards List */}
            <div className="space-y-3 pt-1">
              {currentMobileMatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl bg-slate-900/30">
                  <p className="font-semibold text-slate-400">Stage not yet active.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Matches will be scheduled automatically as earlier stages conclude.
                  </p>
                </div>
              ) : (
                currentMobileMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => onSelectMatch(match)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
