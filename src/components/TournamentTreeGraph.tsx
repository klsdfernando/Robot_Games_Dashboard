'use client';

import React, { useState, useMemo } from 'react';
import { Match, TournamentStage, TournamentOverview, Team } from '@/lib/types';
import MatchCard from './MatchCard';
import {
  Trophy,
  Flame,
  Swords,
  ChevronRight,
  Shield,
  Sparkles,
  Info,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Crown,
  Layers
} from 'lucide-react';

interface TournamentTreeGraphProps {
  stages: TournamentStage[];
  matches: Match[];
  overview: TournamentOverview | null;
  onSelectMatch: (match: Match) => void;
}

interface TeamBoxData {
  id?: string;
  name: string;
  robotName?: string;
  logoUrl?: string;
  score?: number | null;
  isWinner?: boolean;
  isBye?: boolean;
  lives?: number;
  seed?: number;
  matchId?: string;
  status?: string;
  advancementSource?: string | null;
  rawMatch?: Match;
}

interface MatchPairNode {
  matchId: string;
  matchNumber: number;
  stageType: string;
  stageName: string;
  status: string;
  topTeam: TeamBoxData;
  bottomTeam?: TeamBoxData;
  thirdTeam?: TeamBoxData;
  winnerTeam?: TeamBoxData;
  rawMatch?: Match;
}

interface StageColumn {
  id: string;
  title: string;
  subtitle: string;
  stageType: string;
  isWildcard: boolean;
  isActive: boolean;
  isCompleted: boolean;
  matches: MatchPairNode[];
}

export default function TournamentTreeGraph({
  stages,
  matches,
  overview,
  onSelectMatch
}: TournamentTreeGraphProps) {
  const [hoveredTeamName, setHoveredTeamName] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'WINNERS' | 'WILDCARD'>('ALL');

  // Group existing generated matches by stage in chronological stage order
  const stageColumns: StageColumn[] = useMemo(() => {
    if (matches.length === 0) return [];

    const stageMap = new Map<string, Match[]>();
    for (const m of matches) {
      if (!stageMap.has(m.stageType)) {
        stageMap.set(m.stageType, []);
      }
      stageMap.get(m.stageType)!.push(m);
    }

    const stageSequence = [
      'ROUND_1',
      'WILDCARD',
      'QUARTERFINAL',
      'QUARTERFINAL_WILDCARD',
      'SEMIFINAL',
      'SEMIFINAL_WILDCARD',
      'WINNERS_FINAL',
      'WILDCARD_SEMIFINAL',
      'WILDCARD_FINAL',
      'FINAL'
    ];

    const generatedStages = stageSequence.filter(st => stageMap.has(st));

    return generatedStages.map((st) => {
      const stageMatches = stageMap.get(st)!
        .sort((a, b) => a.matchNumber - b.matchNumber);
      
      const dbStage = stages.find(s => s.stageType === st);
      const isWildcard = st.includes('WILDCARD');
      const isCompleted = stageMatches.every(m => m.status === 'COMPLETED' || m.status === 'BYE');
      const isActive = !isCompleted;

      let title = 'STAGE';
      let subtitle = '';

      if (st === 'ROUND_1') {
        title = 'ROUND 1 (MAIN 2v2)';
        subtitle = 'All teams play 2 by 2 • Winners advance • Losers to Wildcard';
      } else if (st === 'WILDCARD') {
        title = 'ROUND 1 WILDCARD';
        subtitle = '3-Way & 2-Way battles • 1 Winner advances • Losers eliminated';
      } else if (st === 'QUARTERFINAL') {
        title = 'QUARTERFINALS (MAIN 2v2)';
        subtitle = 'Winners advance to Semis • Losers drop to QF Wildcard';
      } else if (st === 'QUARTERFINAL_WILDCARD') {
        title = 'QUARTERFINALS WILDCARD';
        subtitle = 'WC R1 winners + QF losers • 1 Winner advances • Losers eliminated';
      } else if (st === 'SEMIFINAL') {
        title = 'SEMIFINALS (MAIN 2v2)';
        subtitle = 'Winners advance to Winners Final • Losers drop to Wildcard';
      } else if (st === 'SEMIFINAL_WILDCARD') {
        title = 'SEMIFINALS WILDCARD';
        subtitle = 'QF WC winners + SF losers • 1 Winner advances • Losers eliminated';
      } else if (st === 'WINNERS_FINAL') {
        title = 'WINNERS FINAL (MAIN 2v2)';
        subtitle = 'Upper winning matches battle! • 1 Winner crowned Upper Champion';
      } else if (st === 'WILDCARD_SEMIFINAL') {
        title = 'WILDCARD SEMIFINALS (3-WAY / 2-WAY)';
        subtitle = 'Surviving contenders battle • Winners advance to Wildcard Decider';
      } else if (st === 'WILDCARD_FINAL') {
        title = 'WILDCARD FINAL (DECIDER MATCH)';
        subtitle = 'Final Wildcard Duel! • 1 Winner crowned Wildcard Champion';
      } else if (st === 'FINAL') {
        title = 'GRAND FINALS (TITLE MATCH 2v2)';
        subtitle = 'Upper Champion (Winners Winner) vs Wildcard Champion (Losers Winner)';
      }

      const matchNodes: MatchPairNode[] = stageMatches.map((m) => {
        const isBye = m.status === 'BYE';
        const p1 = m.participants[0];
        const p2 = m.participants[1];
        const p3 = m.participants[2];

        const topTeam: TeamBoxData = {
          id: p1?.team?.id,
          name: p1?.team?.name || p1?.placeholderText || 'TBD Team',
          robotName: p1?.team?.robotName,
          logoUrl: p1?.team?.logoUrl,
          score: p1?.score,
          isWinner: Boolean(p1?.isWinner),
          isBye: isBye,
          lives: p1?.team?.lives,
          seed: p1?.team?.seed,
          matchId: m.id,
          status: m.status,
          advancementSource: p1?.advancementSource,
          rawMatch: m
        };

        let bottomTeam: TeamBoxData | undefined = undefined;
        if (!isBye && p2) {
          bottomTeam = {
            id: p2?.team?.id,
            name: p2?.team?.name || p2?.placeholderText || 'TBD Team',
            robotName: p2?.team?.robotName,
            logoUrl: p2?.team?.logoUrl,
            score: p2?.score,
            isWinner: Boolean(p2?.isWinner),
            lives: p2?.team?.lives,
            seed: p2?.team?.seed,
            matchId: m.id,
            status: m.status,
            advancementSource: p2?.advancementSource,
            rawMatch: m
          };
        }

        let thirdTeam: TeamBoxData | undefined = undefined;
        if (p3) {
          thirdTeam = {
            id: p3?.team?.id,
            name: p3?.team?.name || p3?.placeholderText || 'TBD Team',
            robotName: p3?.team?.robotName,
            logoUrl: p3?.team?.logoUrl,
            score: p3?.score,
            isWinner: Boolean(p3?.isWinner),
            lives: p3?.team?.lives,
            seed: p3?.team?.seed,
            matchId: m.id,
            status: m.status,
            advancementSource: p3?.advancementSource,
            rawMatch: m
          };
        }

        let winnerTeam: TeamBoxData | undefined = undefined;
        if (m.winnerTeam) {
          winnerTeam = {
            id: m.winnerTeam.id,
            name: m.winnerTeam.name,
            robotName: m.winnerTeam.robotName,
            logoUrl: m.winnerTeam.logoUrl,
            isWinner: true,
            lives: m.winnerTeam.lives,
            matchId: m.id,
            status: m.status,
            rawMatch: m
          };
        } else if (isBye) {
          winnerTeam = topTeam;
        }

        return {
          matchId: m.id,
          matchNumber: m.matchNumber,
          stageType: m.stageType,
          stageName: title,
          status: m.status,
          topTeam,
          bottomTeam,
          thirdTeam,
          winnerTeam,
          rawMatch: m
        };
      });

      return {
        id: dbStage?.id || st,
        title,
        subtitle,
        stageType: st,
        isWildcard,
        isActive,
        isCompleted,
        matches: matchNodes
      };
    });
  }, [matches, stages]);

  // Separate stages into Winners Track, Wildcard Track, and Finals
  const winnersStages = useMemo(() => {
    return stageColumns.filter(c => !c.isWildcard && c.stageType !== 'FINAL');
  }, [stageColumns]);

  const wildcardStages = useMemo(() => {
    return stageColumns.filter(c => c.isWildcard);
  }, [stageColumns]);

  const finalStage = useMemo(() => {
    return stageColumns.find(c => c.stageType === 'FINAL');
  }, [stageColumns]);

  if (matches.length === 0) {
    return (
      <div className="p-16 text-center text-slate-500 rounded-3xl bg-slate-900/40 border border-dashed border-white/10">
        <Swords className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-white">No Bracket Matches Generated Yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Tournament matches generate progressively over time as stages are launched by administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* TOURNAMENT FLOW RULE BANNER                                         */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-amber-950/30 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Official Tournament Bracket Flow
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Dual-Track Championship: Winners Bracket & Wildcard Bracket
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Teams play <strong>2 by 2</strong> in the Main Bracket (winners advance; losers drop to Wildcard). Wildcard matches are <strong>3 by 3</strong> (and 2 by 2) where losers are eliminated and 1 winner advances. In the Grand Finals, the <strong>Winners Bracket Champion</strong> and <strong>Wildcard Bracket Champion</strong> battle for the crown!
            </p>
          </div>

          {/* Track Filter Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setTrackFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                trackFilter === 'ALL'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Tracks
            </button>
            <button
              onClick={() => setTrackFilter('WINNERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                trackFilter === 'WINNERS'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Winners (2v2)
            </button>
            <button
              onClick={() => setTrackFilter('WILDCARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                trackFilter === 'WILDCARD'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wildcard (3v3 / 2v2)
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. UPPER TRACK: WINNERS BRACKET (2 by 2)                             */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || trackFilter === 'WINNERS') && winnersStages.length > 0 && (
        <div className="bg-[#0b101d] border border-sky-500/20 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-sky-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>WINNERS BRACKET (MAIN TOURNAMENT)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono">
                    2 by 2 Duels
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Winners advance to next round • Losers drop down to the Wildcard Bracket
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-sky-400/80 font-mono">
              <span>Path to Grand Finals ──▶</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4 scrollbar-none">
            <div className="flex items-stretch min-w-max py-2 px-1">
              {winnersStages.map((col, colIdx) => (
                <React.Fragment key={col.id}>
                  <StageTreeColumn
                    col={col}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onSelectMatch={onSelectMatch}
                    trackType="WINNERS"
                  />
                  {colIdx < winnersStages.length - 1 && (
                    <WinnersTreeConnector
                      prevMatchesCount={col.matches.length}
                      nextMatchesCount={winnersStages[colIdx + 1].matches.length}
                      isCompleted={col.isCompleted}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. LOWER TRACK: WILDCARD BRACKET (3-Way & 2-Way Survival)            */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || trackFilter === 'WILDCARD') && wildcardStages.length > 0 && (
        <div className="bg-[#120f20] border border-amber-500/20 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>WILDCARD BRACKET (SECOND-CHANCE SURVIVAL)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">
                    3 by 3 & 2 by 2
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  1 Winner advances to next Wildcard round • Losers exit the tournament (eliminated)
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400/80 font-mono">
              <span>Winner battles for Crown ──▶</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4 scrollbar-none">
            <div className="flex items-stretch min-w-max py-2 px-1">
              {wildcardStages.map((col, colIdx) => (
                <React.Fragment key={col.id}>
                  <StageTreeColumn
                    col={col}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onSelectMatch={onSelectMatch}
                    trackType="WILDCARD"
                  />
                  {colIdx < wildcardStages.length - 1 && (
                    <WildcardTreeConnector
                      prevMatchesCount={col.matches.length}
                      nextMatchesCount={wildcardStages[colIdx + 1].matches.length}
                      isCompleted={col.isCompleted}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. APEX SHOWDOWN: GRAND FINALS                                       */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || finalStage) && (
        <div className="bg-gradient-to-br from-[#161224] via-[#0d0a17] to-[#120d20] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>ULTIMATE TOURNAMENT SHOWDOWN</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                GRAND FINALS CHAMPIONSHIP
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The apex battle: The undefeated <strong>Winners Bracket Champion</strong> takes on the <strong>Wildcard Bracket Champion</strong>. 1v1 duel to crown the overall tournament champion!
              </p>
            </div>

            {/* Finals Match Card or Champion Plinth */}
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              {finalStage && finalStage.matches.length > 0 ? (
                <div className="w-[300px]">
                  <BracketMatchBlock
                    match={finalStage.matches[0]}
                    isWildcard={false}
                    isFinal={true}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onClick={() => finalStage.matches[0].rawMatch && onSelectMatch(finalStage.matches[0].rawMatch)}
                  />
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-950/10 text-center w-[280px]">
                  <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-xs font-bold text-white uppercase">Awaiting Finalists</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Winners Bracket Winner vs Wildcard Winner will battle here for the crown.
                  </p>
                </div>
              )}

              {overview?.champion && (
                <div className="w-[240px] flex flex-col justify-center rounded-2xl p-5 border-2 border-amber-400 bg-gradient-to-b from-[#221a36] to-[#0f0b18] text-center shadow-2xl shadow-amber-500/20">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-black flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
                    <Trophy className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                    TOURNAMENT CHAMPION
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {overview.champion.name}
                  </h3>
                  {overview.champion.robotName && (
                    <span className="text-xs text-amber-200/90 font-medium mt-0.5">
                      Bot: {overview.champion.robotName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* STAGE TREE COLUMN COMPONENT (VERTICALLY CENTERED BRACKET SPINE)             */
/* ========================================================================== */

function StageTreeColumn({
  col,
  hoveredTeamName,
  onHoverTeam,
  onSelectMatch,
  trackType
}: {
  col: StageColumn;
  hoveredTeamName: string | null;
  onHoverTeam: (name: string | null) => void;
  onSelectMatch: (m: Match) => void;
  trackType: 'WINNERS' | 'WILDCARD';
}) {
  const isWildcard = col.isWildcard;

  return (
    <div className="w-[280px] sm:w-[305px] flex flex-col shrink-0">
      {/* Stage Header Card */}
      <div
        className={`h-[72px] shrink-0 p-3 rounded-2xl border mb-3 flex items-center justify-between shadow-lg ${
          isWildcard
            ? 'bg-[#181329]/95 border-amber-500/30 shadow-amber-950/20'
            : 'bg-[#0e1628]/95 border-sky-500/20 shadow-sky-950/20'
        }`}
      >
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            {isWildcard ? (
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Swords className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
            <h3 className="font-black text-xs text-white uppercase tracking-wider truncate">
              {col.title}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {col.subtitle}
          </p>
        </div>

        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            col.isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
          }`}
        >
          {col.isCompleted ? 'COMPLETED' : 'ACTIVE'}
        </span>
      </div>

      {/* Matches in this stage - vertically centered & distributed */}
      <div className="flex-1 flex flex-col justify-around py-1">
        {col.matches.map((m) => (
          <div
            key={m.matchId}
            className="flex-1 flex flex-col justify-center items-stretch py-2 w-full min-h-[140px]"
          >
            <BracketMatchBlock
              match={m}
              isWildcard={isWildcard}
              isFinal={col.stageType === 'FINAL'}
              hoveredTeamName={hoveredTeamName}
              onHoverTeam={onHoverTeam}
              onClick={() => m.rawMatch && onSelectMatch(m.rawMatch)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* WINNERS TREE CONNECTOR COMPONENT (AUTHENTIC TREE BRACKET FORKS)            */
/* ========================================================================== */

function WinnersTreeConnector({
  prevMatchesCount,
  nextMatchesCount,
  isCompleted
}: {
  prevMatchesCount: number;
  nextMatchesCount: number;
  isCompleted: boolean;
}) {
  const isBinaryFork = prevMatchesCount === nextMatchesCount * 2;

  return (
    <div className="w-10 sm:w-12 shrink-0 flex flex-col select-none">
      {/* Header spacer to align with the stage header card */}
      <div className="h-[72px] shrink-0 mb-3" />

      {/* Connector lines container */}
      <div className="flex-1 flex flex-col">
        {isBinaryFork ? (
          // Standard binary tree: each next match has 2 feeders
          Array.from({ length: nextMatchesCount }).map((_, idx) => (
            <div key={idx} className="flex-1 relative w-full">
              <svg
                className="w-full h-full"
                viewBox="0 0 48 100"
                preserveAspectRatio="none"
                fill="none"
              >
                {/* Feeder fork: Top from 25%, Bottom from 75%, joined at X=24 */}
                <path
                  d="M 0 25 H 24 V 75 H 0"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isCompleted ? 'text-sky-500/60' : 'text-sky-500/40'}
                />
                {/* Center branch leaving at Y=50% */}
                <path
                  d="M 24 50 H 42"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  className={isCompleted ? 'text-sky-400' : 'text-sky-400/80'}
                />
              </svg>
              {/* Arrowhead centered at Y=50% right edge */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 pointer-events-none text-sky-400">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        ) : (
          // Direct flow when counts match or non-binary
          Array.from({ length: Math.min(prevMatchesCount, nextMatchesCount) }).map((_, idx) => (
            <div key={idx} className="flex-1 relative w-full flex items-center justify-center">
              <div className="w-full flex items-center">
                <span className="w-full h-[2px] bg-sky-500/40" />
                <ChevronRight className="w-3.5 h-3.5 text-sky-400 -ml-1 flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* WILDCARD TREE CONNECTOR COMPONENT (FORWARD SURVIVAL FLOW)                  */
/* ========================================================================== */

function WildcardTreeConnector({
  prevMatchesCount,
  nextMatchesCount,
  isCompleted
}: {
  prevMatchesCount: number;
  nextMatchesCount: number;
  isCompleted: boolean;
}) {
  const isBinaryFork = prevMatchesCount === nextMatchesCount * 2;

  return (
    <div className="w-10 sm:w-12 shrink-0 flex flex-col select-none">
      {/* Header spacer to align with the stage header card */}
      <div className="h-[72px] shrink-0 mb-3" />

      {/* Connector lines container */}
      <div className="flex-1 flex flex-col">
        {isBinaryFork ? (
          // Binary fork in Wildcard (e.g. Semifinal 2 matches -> Wildcard Final 1 match)
          Array.from({ length: nextMatchesCount }).map((_, idx) => (
            <div key={idx} className="flex-1 relative w-full">
              <svg
                className="w-full h-full"
                viewBox="0 0 48 100"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M 0 25 H 24 V 75 H 0"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isCompleted ? 'text-amber-500/60' : 'text-amber-500/40'}
                />
                <path
                  d="M 24 50 H 42"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  className={isCompleted ? 'text-amber-400' : 'text-amber-400/80'}
                />
              </svg>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 pointer-events-none text-amber-400">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        ) : (
          // Multi-slot flow (e.g. 3 matches -> 3 matches, or 3 matches -> 2 matches)
          Array.from({ length: Math.min(prevMatchesCount, nextMatchesCount) }).map((_, idx) => (
            <div key={idx} className="flex-1 relative w-full flex items-center justify-center">
              <div className="w-full flex items-center">
                <span className="w-full h-[2px] bg-amber-500/40" />
                <ChevronRight className="w-3.5 h-3.5 text-amber-400 -ml-1 flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* BRACKET MATCH BLOCK COMPONENT                                              */
/* ========================================================================== */

function BracketMatchBlock({
  match,
  isWildcard,
  isFinal = false,
  hoveredTeamName,
  onHoverTeam,
  onClick
}: {
  match: MatchPairNode;
  isWildcard: boolean;
  isFinal?: boolean;
  hoveredTeamName: string | null;
  onHoverTeam: (name: string | null) => void;
  onClick: () => void;
}) {
  const isBye = match.status === 'BYE';
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  const t1 = match.topTeam;
  const t2 = match.bottomTeam;
  const t3 = match.thirdTeam;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-2.5 transition-all duration-150 cursor-pointer overflow-hidden ${
        isLive
          ? 'bg-[#151d32] border-rose-500/70 shadow-md shadow-rose-500/20'
          : isFinal
          ? 'bg-[#1c152e] border-amber-500/50 hover:border-amber-400'
          : isCompleted
          ? 'bg-[#0f172a]/90 border-slate-700/60 hover:border-slate-500'
          : isBye
          ? 'bg-[#161226]/90 border-purple-500/40'
          : isWildcard
          ? 'bg-[#1a1528]/90 border-amber-500/30 hover:border-amber-400'
          : 'bg-[#0e1628]/90 border-sky-500/20 hover:border-sky-500/50'
      }`}
    >
      {/* Match Number & Status */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 text-[10px] text-slate-400">
        <span className="font-mono font-bold text-slate-300">
          {isFinal ? '🏆 GRAND FINAL' : `Match #${match.matchNumber}`}
        </span>
        <div>
          {isLive && (
            <span className="px-1.5 py-0.2 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-400">
              FINAL
            </span>
          )}
          {isBye && (
            <span className="px-1.5 py-0.2 rounded font-bold bg-purple-500/20 text-purple-300">
              BYE ADVANCE
            </span>
          )}
          {!isLive && !isCompleted && !isBye && (
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              SCHEDULED
            </span>
          )}
        </div>
      </div>

      {/* Combatant Team Boxes */}
      {isBye ? (
        <div className="space-y-1">
          <TeamPill
            team={t1}
            isHovered={hoveredTeamName === t1.name}
            onHover={onHoverTeam}
          />
          <div className="flex items-center justify-end px-2 pt-1 text-[10px] font-mono text-purple-400">
            <span>────────▶ Advances to Next Round</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1 relative">
          <TeamPill
            team={t1}
            isHovered={hoveredTeamName === t1.name}
            onHover={onHoverTeam}
            badge={isFinal ? 'Winners Champion' : undefined}
          />

          {/* Bracket Branch between combatants */}
          <div className="flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
            <span>VS</span>
            <span className="text-slate-400 flex items-center">
              <span>├──▶</span>
              {match.winnerTeam ? (
                <span className="text-emerald-400 font-bold ml-1 truncate max-w-[110px]">
                  {match.winnerTeam.name}
                </span>
              ) : (
                <span className="text-slate-500 ml-1">Winner advances</span>
              )}
            </span>
          </div>

          {t2 && (
            <TeamPill
              team={t2}
              isHovered={hoveredTeamName === t2.name}
              onHover={onHoverTeam}
              badge={isFinal ? 'Wildcard Champion' : undefined}
            />
          )}

          {t3 && (
            <>
              <div className="flex items-center justify-between px-2 text-[9px] font-mono text-amber-500/70">
                <span>3-WAY</span>
                <span>├──▶ 1 Winner survives</span>
              </div>
              <TeamPill
                team={t3}
                isHovered={hoveredTeamName === t3.name}
                onHover={onHoverTeam}
              />
            </>
          )}

          {/* Flow destination indicator */}
          {!isWildcard && !isFinal && (
            <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-sky-400/80 flex items-center justify-between">
              <span>Loser:</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>Drops to Wildcard</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          )}

          {isWildcard && (
            <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-amber-400/90 flex items-center justify-between">
              <span>Losers:</span>
              <span className="text-rose-400 font-bold">
                Eliminated (Out)
              </span>
            </div>
          )}

          {isFinal && (
            <div className="mt-1 pt-1 border-t border-amber-500/20 text-[9px] text-amber-300 font-bold flex items-center justify-between">
              <span>Duel for the Trophy</span>
              <span>Winner = Champion 👑</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* TEAM PILL BOX COMPONENT                                                    */
/* ========================================================================== */

function TeamPill({
  team,
  isHovered,
  onHover,
  badge
}: {
  team: TeamBoxData;
  isHovered: boolean;
  onHover: (name: string | null) => void;
  badge?: string;
}) {
  const isWinner = team.isWinner;

  return (
    <div
      onMouseEnter={() => onHover(team.name)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
        isHovered
          ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50'
          : isWinner
          ? 'bg-emerald-950/40 border-emerald-500/50 text-white font-bold'
          : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-4 h-4 rounded object-contain bg-slate-950 border border-white/10 shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : team.seed !== undefined && team.seed !== null ? (
          <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">
            #{team.seed}
          </span>
        ) : null}
        <div className="truncate">
          <span className="block truncate font-semibold">
            {team.name}
          </span>
          {badge && (
            <span className="text-[9px] font-mono text-amber-400 block -mt-0.5">
              {badge}
            </span>
          )}
          {team.robotName && !badge && (
            <span className="text-[9px] text-slate-400 block -mt-0.5">
              {team.robotName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {team.score !== null && team.score !== undefined && (
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-black/40 text-white">
            {team.score}
          </span>
        )}
        {isWinner && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </div>
    </div>
  );
}
