'use client';

import React, { useState, useMemo } from 'react';
import { Match, MatchParticipant, TournamentStage, TournamentOverview, Team } from '@/lib/types';
import {
  Trophy,
  Flame,
  Swords,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Crown,
  GripVertical
} from 'lucide-react';
import TeamAvatar from './TeamAvatar';

interface TournamentTreeGraphProps {
  stages: TournamentStage[];
  matches: Match[];
  overview: TournamentOverview | null;
  teams?: Team[];
  onSelectMatch: (match: Match) => void;
  isEditable?: boolean;
  onSwapTeams?: (
    source: { matchId: string; slotOrder: number; teamId?: string; teamName?: string },
    target: { matchId: string; slotOrder: number; teamId?: string; teamName?: string }
  ) => void;
}

interface TeamBoxData {
  id?: string;
  name: string;
  logoUrl?: string;
  score?: number | null;
  isWinner?: boolean;
  isBye?: boolean;
  seed?: number;
  matchId?: string;
  status?: string;
  advancementSource?: string | null;
  placeholderText?: string | null;
  isEmptySlot?: boolean;
  slotNumber?: number;
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
  teams = [],
  onSelectMatch,
  isEditable = false,
  onSwapTeams
}: TournamentTreeGraphProps) {
  const [hoveredTeamName, setHoveredTeamName] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'WINNERS' | 'WILDCARD'>('ALL');
  const [dragOverTargetSlot, setDragOverTargetSlot] = useState<string | null>(null);

  const teamsMap = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) {
      if (t.id) map.set(t.id, t);
      if (t.name) map.set(t.name.toLowerCase().trim(), t);
    }
    return map;
  }, [teams]);

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
        title = 'ROUND 1';
        subtitle = 'Winners advance · losers enter Wildcard';
      } else if (st === 'WILDCARD') {
        title = 'WILDCARD ROUND 1';
        subtitle = 'One winner advances · others are eliminated';
      } else if (st === 'QUARTERFINAL') {
        title = 'QUARTERFINALS';
        subtitle = 'Winners advance · losers enter Wildcard';
      } else if (st === 'QUARTERFINAL_WILDCARD') {
        title = 'WILDCARD QUARTERFINALS';
        subtitle = 'One winner advances from each match';
      } else if (st === 'SEMIFINAL') {
        title = 'SEMIFINALS';
        subtitle = 'Winners advance · losers enter Wildcard';
      } else if (st === 'SEMIFINAL_WILDCARD') {
        title = 'WILDCARD SEMIFINALS';
        subtitle = 'One winner advances from each match';
      } else if (st === 'WINNERS_FINAL') {
        title = 'MAIN BRACKET FINAL';
        subtitle = 'Winner advances to the grand final';
      } else if (st === 'WILDCARD_SEMIFINAL') {
        title = 'WILDCARD SEMIFINALS';
        subtitle = 'Surviving teams play for the final';
      } else if (st === 'WILDCARD_FINAL') {
        title = 'WILDCARD FINAL';
        subtitle = 'Winner advances to the grand final';
      } else if (st === 'FINAL') {
        title = 'GRAND FINAL';
        subtitle = 'Main bracket winner vs Wildcard winner';
      }

      const matchNodes: MatchPairNode[] = stageMatches.map((m) => {
        const isBye = m.status === 'BYE';
        const p1 = m.participants[0];
        const p2 = m.participants[1];
        const p3 = m.participants[2];

        const isThreeWay = Boolean(p3) || (m.participants.length >= 3);

        const makeTeamBox = (p: MatchParticipant | undefined, slotNumber: number): TeamBoxData => {
          const isEmpty = !p || !p.team?.id;
          const fallbackTeam = p?.teamId
            ? teamsMap.get(p.teamId)
            : p?.team?.name
            ? teamsMap.get(p.team.name.toLowerCase().trim())
            : undefined;
          const logoUrl = p?.team?.logoUrl || fallbackTeam?.logoUrl;
          const seed = p?.team?.seed !== undefined && p?.team?.seed !== null
            ? p.team.seed
            : fallbackTeam?.seed !== undefined && fallbackTeam?.seed !== null
            ? fallbackTeam.seed
            : undefined;

          return {
            id: p?.team?.id || p?.teamId || undefined,
            name: p?.team?.name || fallbackTeam?.name || '',
            logoUrl: logoUrl || undefined,
            score: p?.score,
            isWinner: Boolean(p?.isWinner || (p?.teamId && m.winnerTeamId === p.teamId)),
            isBye: isBye && slotNumber === 1,
            seed,
            matchId: m.id,
            status: m.status,
            advancementSource: p?.advancementSource,
            placeholderText: undefined,
            isEmptySlot: isEmpty,
            slotNumber,
            rawMatch: m
          };
        };

        const topTeam: TeamBoxData = makeTeamBox(p1, 1);

        let bottomTeam: TeamBoxData | undefined = undefined;
        if (!isBye) {
          bottomTeam = makeTeamBox(p2, 2);
        }

        let thirdTeam: TeamBoxData | undefined = undefined;
        if (isThreeWay || p3) {
          thirdTeam = makeTeamBox(p3, 3);
        }

        let winnerTeam: TeamBoxData | undefined = undefined;
        if (m.winnerTeam) {
          const fallbackWTeam = teamsMap.get(m.winnerTeam.id) || teamsMap.get(m.winnerTeam.name.toLowerCase().trim());
          winnerTeam = {
            id: m.winnerTeam.id,
            name: m.winnerTeam.name,
            logoUrl: m.winnerTeam.logoUrl || fallbackWTeam?.logoUrl,
            isWinner: true,
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

      // Older generated brackets placed seeded BYE teams directly into the
      // quarterfinals. Surface those advances as opening-round BYE fixtures so
      // the visual always contracts 8 → 4 → 2 → 1.
      if (st === 'ROUND_1') {
        const existingByeTeamIds = new Set(
          stageMatches
            .filter((match) => match.status === 'BYE')
            .flatMap((match) => match.participants.map((participant) => participant.team?.id))
            .filter(Boolean)
        );
        const directByeParticipants = (stageMap.get('QUARTERFINAL') || [])
          .flatMap((match) => match.participants)
          .filter((participant) =>
            participant.advancementSource === 'ROUND_1_BYE'
            && participant.team?.id
            && !existingByeTeamIds.has(participant.team.id)
          );

        directByeParticipants.forEach((participant, index) => {
          const team = participant.team!;
          const fallbackTeam = teamsMap.get(team.id) || teamsMap.get(team.name.toLowerCase().trim());
          const logoUrl = team.logoUrl || fallbackTeam?.logoUrl;
          const seed = team.seed !== undefined && team.seed !== null ? team.seed : fallbackTeam?.seed;
          matchNodes.push({
            matchId: `display-bye-${team.id}`,
            matchNumber: stageMatches.length + index + 1,
            stageType: 'ROUND_1',
            stageName: title,
            status: 'BYE',
            topTeam: {
              id: team.id,
              name: team.name,
              logoUrl: logoUrl || undefined,
              seed,
              isWinner: true,
              isBye: true,
              status: 'BYE',
            },
            winnerTeam: {
              id: team.id,
              name: team.name,
              logoUrl: logoUrl || undefined,
              seed,
              isWinner: true,
              isBye: true,
              status: 'BYE',
            },
          });
        });

        // Bracket-align Round 1 matches so they order by their Quarterfinal destination match and slot
        const qfMatches = (stageMap.get('QUARTERFINAL') || [])
          .slice()
          .sort((a, b) => a.matchNumber - b.matchNumber);

        if (qfMatches.length > 0) {
          const qfOrderMap = new Map<string, { qfNum: number; slot: number }>();
          qfMatches.forEach(qf => {
            qf.participants.forEach(p => {
              if (p.sourceMatchId) {
                qfOrderMap.set(p.sourceMatchId, {
                  qfNum: qf.matchNumber,
                  slot: p.participantOrder || 1
                });
              }
              if (p.team?.id) {
                qfOrderMap.set(`team-${p.team.id}`, {
                  qfNum: qf.matchNumber,
                  slot: p.participantOrder || 1
                });
              }
            });
          });

          matchNodes.sort((a, b) => {
            const getInfo = (node: MatchPairNode) => {
              const rawId = node.rawMatch?.id || node.matchId;
              const byId = qfOrderMap.get(rawId) || qfOrderMap.get(node.matchId);
              if (byId) return byId;

              if (node.topTeam.id && qfOrderMap.has(`team-${node.topTeam.id}`)) {
                return qfOrderMap.get(`team-${node.topTeam.id}`)!;
              }

              if (node.rawMatch?.nextMatchId) {
                const qf = qfMatches.find(q => q.id === node.rawMatch?.nextMatchId);
                if (qf) return { qfNum: qf.matchNumber, slot: 99 };
              }

              return { qfNum: 999, slot: node.matchNumber };
            };

            const infoA = getInfo(a);
            const infoB = getInfo(b);
            if (infoA.qfNum !== infoB.qfNum) return infoA.qfNum - infoB.qfNum;
            if (infoA.slot !== infoB.slot) return infoA.slot - infoB.slot;
            return a.matchNumber - b.matchNumber;
          });
        }

        const byeCount = matchNodes.filter((match) => match.status === 'BYE').length;
        if (byeCount > 0) {
          subtitle = `${matchNodes.length - byeCount} opening duels • ${byeCount} seeded ${byeCount === 1 ? 'bye' : 'byes'} • ${matchNodes.length} teams advance`;
        }
      }

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
  }, [matches, stages, teamsMap]);

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
    <div className="space-y-4 animate-in fade-in duration-200 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 overflow-x-auto border-y border-white/[0.08] bg-[#080c13] px-2 py-2">
          <div className="hidden items-center gap-2 px-1 text-xs font-semibold text-slate-500 md:flex">
            <GitBranch className="h-4 w-4 text-blue-400" />
            <span>Bracket view</span>
          </div>
          <div className="flex min-w-max flex-1 items-center gap-1 sm:flex-none">
            <button
              onClick={() => setTrackFilter('ALL')}
              className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-bold transition-all sm:flex-none ${
                trackFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Tracks
            </button>
            <button
              onClick={() => setTrackFilter('WINNERS')}
              className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-bold transition-all sm:flex-none ${
                trackFilter === 'WINNERS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Main bracket
            </button>
            <button
              onClick={() => setTrackFilter('WILDCARD')}
              className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-bold transition-all sm:flex-none ${
                trackFilter === 'WILDCARD'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wildcard
            </button>
          </div>
      </div>

      {isEditable && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs">
          <GripVertical className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-white">Hold & Drag Bracket Customizer: </span>
            <span className="text-slate-300">
              Hold and drag any combatant card and drop it onto another team to instantly swap matchup combinations in scheduled rounds.
            </span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. UPPER TRACK: WINNERS BRACKET (2 by 2)                             */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || trackFilter === 'WINNERS') && winnersStages.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0f18] shadow-[0_18px_60px_rgba(0,0,0,0.26)]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-white sm:text-base">
                  <span>Main bracket</span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-blue-400">1v1</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Winners advance · losing teams enter Wildcard
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-600 sm:flex">
              <span>{winnersStages.length} rounds</span>
              <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>

          <div className="px-3 pt-3 text-[10px] font-medium text-slate-600 sm:hidden">Swipe to follow each round →</div>
          <div className="scrollbar-none w-full snap-x snap-mandatory overflow-x-auto px-3 pb-4 sm:px-5">
            <div className="flex min-w-max items-stretch py-2">
              {winnersStages.map((col, colIdx) => (
                <React.Fragment key={col.id}>
                  <StageTreeColumn
                    col={col}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onSelectMatch={onSelectMatch}
                    trackType="WINNERS"
                    isEditable={isEditable}
                    onSwapTeams={onSwapTeams}
                    dragOverTargetSlot={dragOverTargetSlot}
                    setDragOverTargetSlot={setDragOverTargetSlot}
                  />
                  {colIdx < winnersStages.length - 1 && (
                    <WinnersTreeConnector
                      prevCol={col}
                      nextCol={winnersStages[colIdx + 1]}
                      isCompleted={col.isCompleted}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 2. LOWER TRACK: WILDCARD BRACKET (3-Way & 2-Way Survival)            */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || trackFilter === 'WILDCARD') && wildcardStages.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090e17] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-white sm:text-base">
                  <span>Wildcard bracket</span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-blue-400">Elimination</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  One winner advances · remaining teams are eliminated
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-600 sm:flex">
              <span>{wildcardStages.length} rounds</span>
              <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </div>

          <div className="px-3 pt-3 text-[10px] font-medium text-slate-600 sm:hidden">Swipe to follow each round →</div>
          <div className="scrollbar-none w-full snap-x snap-mandatory overflow-x-auto px-3 pb-4 sm:px-5">
            <div className="flex min-w-max items-stretch py-2">
              {wildcardStages.map((col, colIdx) => (
                <React.Fragment key={col.id}>
                  <StageTreeColumn
                    col={col}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onSelectMatch={onSelectMatch}
                    trackType="WILDCARD"
                    isEditable={isEditable}
                    onSwapTeams={onSwapTeams}
                    dragOverTargetSlot={dragOverTargetSlot}
                    setDragOverTargetSlot={setDragOverTargetSlot}
                  />
                  {colIdx < wildcardStages.length - 1 && (
                    <WildcardTreeConnector
                      prevCol={col}
                      nextCol={wildcardStages[colIdx + 1]}
                      isCompleted={col.isCompleted}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 3. APEX SHOWDOWN: GRAND FINALS                                       */}
      {/* ==================================================================== */}
      {(trackFilter === 'ALL' || finalStage) && (
        <section className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-[#090f1a] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" aria-hidden="true" />
          <div className="flex flex-col items-stretch justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">
                <Crown className="w-4 h-4 text-blue-400" />
                <span>Championship match</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Grand final
              </h2>
              <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
                Main bracket winner versus Wildcard winner. One final match decides the champion.
              </p>
            </div>

            {/* Finals Match Card or Champion Plinth */}
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              {finalStage && finalStage.matches.length > 0 ? (
                <div className="w-full sm:w-[300px]">
                  <BracketMatchBlock
                    match={finalStage.matches[0]}
                    isWildcard={false}
                    isFinal={true}
                    hoveredTeamName={hoveredTeamName}
                    onHoverTeam={setHoveredTeamName}
                    onClick={() => finalStage.matches[0].rawMatch && onSelectMatch(finalStage.matches[0].rawMatch)}
                    isEditable={isEditable}
                    onSwapTeams={onSwapTeams}
                    dragOverTargetSlot={dragOverTargetSlot}
                    setDragOverTargetSlot={setDragOverTargetSlot}
                  />
                </div>
              ) : (
                <div className="w-full border border-dashed border-blue-500/30 bg-blue-950/10 p-6 text-center sm:w-[280px]">
                  <Crown className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-xs font-bold text-white uppercase">Awaiting Finalists</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Winners Bracket Winner vs Wildcard Winner will battle here for the crown.
                  </p>
                </div>
              )}

              {overview?.champion && (
                <div className="flex w-full flex-col justify-center border border-blue-400 bg-[#0b1220] p-5 text-center shadow-xl shadow-blue-500/10 sm:w-[240px]">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    <Trophy className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase">
                    TOURNAMENT CHAMPION
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {overview.champion.name}
                  </h3>
                </div>
              )}
            </div>
          </div>
        </section>
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
  trackType,
  isEditable = false,
  onSwapTeams,
  dragOverTargetSlot,
  setDragOverTargetSlot
}: {
  col: StageColumn;
  hoveredTeamName: string | null;
  onHoverTeam: (name: string | null) => void;
  onSelectMatch: (m: Match) => void;
  trackType: 'WINNERS' | 'WILDCARD';
  isEditable?: boolean;
  onSwapTeams?: (
    source: { matchId: string; slotOrder: number; teamId?: string; teamName?: string },
    target: { matchId: string; slotOrder: number; teamId?: string; teamName?: string }
  ) => void;
  dragOverTargetSlot?: string | null;
  setDragOverTargetSlot?: (slot: string | null) => void;
}) {
  const isWildcard = col.isWildcard;

  return (
    <div className="flex w-[calc(100vw-6rem)] max-w-[300px] shrink-0 snap-start flex-col sm:w-[305px]">
      {/* Stage Header Card */}
      <div
        className={`mb-3 flex h-[68px] shrink-0 items-center justify-between border-l-2 border-y border-r p-3 ${
          isWildcard
            ? 'border-blue-500/35 bg-[#0b111c]'
            : 'border-blue-500/30 bg-[#0c121e]'
        }`}
      >
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            {isWildcard ? (
              <Flame className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            ) : (
              <Swords className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <h3 className="truncate text-[11px] font-extrabold uppercase tracking-[0.08em] text-white sm:text-xs">
              {col.title}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {col.subtitle}
          </p>
        </div>

        <span
          className={`shrink-0 text-[8px] font-bold uppercase tracking-wider ${
            col.isCompleted
              ? 'text-blue-400'
              : 'text-blue-300'
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
            className="flex min-h-[132px] w-full flex-1 flex-col items-stretch justify-center py-2"
          >
            <BracketMatchBlock
              match={m}
              isWildcard={isWildcard}
              isFinal={col.stageType === 'FINAL'}
              hoveredTeamName={hoveredTeamName}
              onHoverTeam={onHoverTeam}
              onClick={() => m.rawMatch && onSelectMatch(m.rawMatch)}
              isEditable={isEditable}
              onSwapTeams={onSwapTeams}
              dragOverTargetSlot={dragOverTargetSlot}
              setDragOverTargetSlot={setDragOverTargetSlot}
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

interface TreeConnectorProps {
  prevCol: StageColumn;
  nextCol: StageColumn;
  isCompleted: boolean;
  trackType?: 'WINNERS' | 'WILDCARD';
}

function TreeConnector({
  prevCol,
  nextCol,
  isCompleted,
  trackType
}: TreeConnectorProps) {
  const prevMatches = prevCol.matches;
  const nextMatches = nextCol.matches;
  const prevCount = prevMatches.length;
  const nextCount = nextMatches.length;

  // Map each nextMatch to its feeder match indices in prevCol
  const feederGroups = useMemo(() => {
    if (prevCount === 0 || nextCount === 0) return [];

    // 1. Check for explicit linkages via participant sourceMatchId or nextMatchId
    const directGroups: { nextIndex: number; feederIndices: number[] }[] = [];
    let hasAnyDirectLink = false;

    // Collect all valid IDs belonging to matches in prevCol
    const prevMatchIds = new Set(
      prevMatches.flatMap(m => [m.matchId, m.rawMatch?.id].filter(Boolean) as string[])
    );

    for (let j = 0; j < nextCount; j++) {
      const nextMatch = nextMatches[j];
      const feeders: number[] = [];

      // Check if nextMatch has any participant explicitly declaring a source from prevCol
      const hasParticipantFromPrev = Boolean(
        nextMatch.rawMatch?.participants?.some(
          p => p.sourceMatchId && prevMatchIds.has(p.sourceMatchId)
        )
      );

      for (let i = 0; i < prevCount; i++) {
        const prevMatch = prevMatches[i];
        const prevIds = [prevMatch.matchId, prevMatch.rawMatch?.id].filter(Boolean) as string[];

        let isMatch = false;
        if (hasParticipantFromPrev) {
          // Explicit participant link takes strict precedence
          isMatch = Boolean(
            nextMatch.rawMatch?.participants?.some(
              p => p.sourceMatchId && prevIds.includes(p.sourceMatchId)
            )
          );
        } else {
          // Fall back to nextMatchId only when participant sources are not yet defined
          const nextId = prevMatch.rawMatch?.nextMatchId;
          const nextIds = [nextMatch.matchId, nextMatch.rawMatch?.id].filter(Boolean) as string[];
          isMatch = Boolean(nextId && nextIds.includes(nextId));
        }

        if (isMatch) {
          if (!feeders.includes(i)) {
            feeders.push(i);
          }
          hasAnyDirectLink = true;
        }
      }

      // In WINNERS bracket (strictly 1v1 duels), a match can have at most 2 feeder matches
      if (trackType === 'WINNERS' && feeders.length > 2) {
        feeders.splice(2);
      }

      directGroups.push({ nextIndex: j, feederIndices: feeders });
    }

    if (hasAnyDirectLink) {
      return directGroups;
    }

    // 2. Fallback: Standard binary tree fork (2 to 1)
    if (prevCount === nextCount * 2) {
      return Array.from({ length: nextCount }, (_, j) => ({
        nextIndex: j,
        feederIndices: [2 * j, 2 * j + 1]
      }));
    }

    // 3. Fallback: Proportional bucket partition
    if (prevCount >= nextCount) {
      return Array.from({ length: nextCount }, (_, j) => {
        const start = Math.round((j * prevCount) / nextCount);
        const end = Math.round(((j + 1) * prevCount) / nextCount);
        const feeders: number[] = [];
        for (let i = start; i < end && i < prevCount; i++) {
          feeders.push(i);
        }
        return { nextIndex: j, feederIndices: feeders };
      });
    }

    // 4. Fallback: 1-to-1 or expanding
    return Array.from({ length: nextCount }, (_, j) => ({
      nextIndex: j,
      feederIndices: j < prevCount ? [j] : []
    }));
  }, [prevMatches, nextMatches, prevCount, nextCount, trackType]);

  // Compute SVG layout parameters with vertical collision avoidance (channel routing)
  const routedGroups = useMemo(() => {
    if (prevCount === 0 || nextCount === 0) return [];

    const active = feederGroups
      .filter(g => g.feederIndices.length > 0)
      .map(g => {
        const yTo = ((g.nextIndex + 0.5) / nextCount) * 100;
        const yValues = g.feederIndices
          .map(i => ((i + 0.5) / prevCount) * 100)
          .sort((a, b) => a - b);
        const minY = Math.min(yTo, yValues[0]);
        const maxY = Math.max(yTo, yValues[yValues.length - 1]);
        const isFlat = yValues.length === 1 && Math.abs(maxY - minY) < 0.2;
        return {
          ...g,
          yTo,
          yValues,
          minY,
          maxY,
          isFlat,
          channel: 0
        };
      });

    // Assign non-flat groups to separate channels if their vertical spans overlap
    const nonFlat = active.filter(g => !g.isFlat);
    nonFlat.sort((a, b) => a.minY - b.minY);

    const channelMaxY: number[] = [];
    for (const g of nonFlat) {
      let placed = false;
      for (let c = 0; c < channelMaxY.length; c++) {
        // If there's clear vertical space above this group in channel c, reuse channel c
        if (channelMaxY[c] + 0.5 < g.minY) {
          channelMaxY[c] = g.maxY;
          g.channel = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        g.channel = channelMaxY.length;
        channelMaxY.push(g.maxY);
      }
    }

    const numChannels = Math.max(1, channelMaxY.length);
    return active.map(g => {
      let trunkX = 24;
      if (numChannels === 2) {
        trunkX = g.channel === 0 ? 18 : 30;
      } else if (numChannels > 2) {
        trunkX = 14 + (g.channel * (20 / (numChannels - 1)));
      }
      return {
        ...g,
        trunkX
      };
    });
  }, [feederGroups, prevCount, nextCount]);

  if (prevCount === 0 || nextCount === 0) {
    return null;
  }

  return (
    <div className="w-10 sm:w-12 shrink-0 flex flex-col select-none">
      {/* Header spacer to align with the stage header card (h-[68px] mb-3) */}
      <div className="h-[68px] shrink-0 mb-3" />

      {/* Connector lines container */}
      <div className="flex-1 relative w-full">
        <svg
          className="w-full h-full absolute inset-0"
          viewBox="0 0 48 100"
          preserveAspectRatio="none"
          fill="none"
        >
          {routedGroups.map(({ nextIndex, feederIndices, yValues, yTo, isFlat, trunkX }) => {
            if (isFlat) {
              return (
                <path
                  key={`path-${nextIndex}`}
                  d={`M 0 ${yTo} H 42`}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isCompleted ? 'text-blue-500/60' : 'text-blue-500/40'}
                />
              );
            }

            if (feederIndices.length === 1) {
              const yFrom = yValues[0];
              const pathD = `M 0 ${yFrom} H ${trunkX} V ${yTo} H 42`;
              return (
                <path
                  key={`path-${nextIndex}`}
                  d={pathD}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isCompleted ? 'text-blue-500/60' : 'text-blue-500/40'}
                />
              );
            }

            // Multiple feeders (2, 3, or more into 1 destination match)
            // Draw a single continuous path by retracing lines to ensure strokeLinejoin="round" 
            // perfectly rounds all corners, avoiding ugly flat butt-joints.
            let pathD = `M 0 ${yValues[0]} H ${trunkX}`;
            for (let i = 1; i < yValues.length; i++) {
              pathD += ` V ${yValues[i]} H 0 H ${trunkX}`;
            }
            // Retrace trunk to the destination Y, then branch right
            pathD += ` V ${yTo} H 42`;

            return (
              <path
                key={`group-${nextIndex}`}
                d={pathD}
                stroke="currentColor"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isCompleted ? 'text-blue-500/60' : 'text-blue-500/40'}
              />
            );
          })}
        </svg>

        {/* Arrowheads centered at destination match Y positions */}
        {routedGroups.map(({ nextIndex, yTo }) => (
          <div
            key={`arrow-${nextIndex}`}
            className="absolute right-0 -translate-y-1/2 translate-x-1 pointer-events-none text-blue-400"
            style={{ top: `${yTo}%` }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WinnersTreeConnector(props: {
  prevCol: StageColumn;
  nextCol: StageColumn;
  isCompleted: boolean;
}) {
  return <TreeConnector {...props} trackType="WINNERS" />;
}

function WildcardTreeConnector(props: {
  prevCol: StageColumn;
  nextCol: StageColumn;
  isCompleted: boolean;
}) {
  return <TreeConnector {...props} trackType="WILDCARD" />;
}

/* ========================================================================== */
/* BRACKET MATCH BLOCK COMPONENT                                              */
/* ========================================================================== */

/* ========================================================================== */
/* BRACKET MATCH BLOCK COMPONENT                                              */
/* ========================================================================== */

function BracketMatchBlock({
  match,
  isWildcard,
  isFinal = false,
  hoveredTeamName,
  onHoverTeam,
  onClick,
  isEditable = false,
  onSwapTeams,
  dragOverTargetSlot,
  setDragOverTargetSlot
}: {
  match: MatchPairNode;
  isWildcard: boolean;
  isFinal?: boolean;
  hoveredTeamName: string | null;
  onHoverTeam: (name: string | null) => void;
  onClick: () => void;
  isEditable?: boolean;
  onSwapTeams?: (
    source: { matchId: string; slotOrder: number; teamId?: string; teamName?: string },
    target: { matchId: string; slotOrder: number; teamId?: string; teamName?: string }
  ) => void;
  dragOverTargetSlot?: string | null;
  setDragOverTargetSlot?: (targetKey: string | null) => void;
}) {
  const isBye = match.status === 'BYE';
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  // Only scheduled non-wildcard matches can have their teams dragged/swapped
  const isMatchSwappable =
    isEditable &&
    !isWildcard &&
    match.status === 'SCHEDULED' &&
    !match.matchId.startsWith('display-bye') &&
    Boolean(onSwapTeams);

  const t1 = match.topTeam;
  const t2 = match.bottomTeam;
  const t3 = match.thirdTeam;

  const renderTeamSlot = (team: TeamBoxData | undefined, slotNumber: number, badge?: string) => {
    if (!team) return null;
    const slotKey = `${match.matchId}-${slotNumber}`;
    const canDrag = isMatchSwappable && !team.isEmptySlot && Boolean(team.id);
    const canDrop = isMatchSwappable;
    const isDragOver = dragOverTargetSlot === slotKey;

    return (
      <TeamPill
        team={team}
        slotNumber={slotNumber}
        isHovered={hoveredTeamName === team.name}
        onHover={onHoverTeam}
        badge={badge}
        isWildcardTrack={isWildcard}
        isDraggable={canDrag}
        isDroppable={canDrop}
        isDragOver={isDragOver}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(
            'application/bracket-slot',
            JSON.stringify({
              matchId: match.matchId,
              slotOrder: slotNumber,
              teamId: team.id,
              teamName: team.name
            })
          );
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!canDrop) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          if (setDragOverTargetSlot && dragOverTargetSlot !== slotKey) {
            setDragOverTargetSlot(slotKey);
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (setDragOverTargetSlot && dragOverTargetSlot === slotKey) {
            setDragOverTargetSlot(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (setDragOverTargetSlot) setDragOverTargetSlot(null);
          if (!canDrop || !onSwapTeams) return;
          try {
            const raw = e.dataTransfer.getData('application/bracket-slot');
            if (!raw) return;
            const source = JSON.parse(raw);
            if (source.matchId === match.matchId && source.slotOrder === slotNumber) {
              return; // Dropped on itself
            }
            onSwapTeams(source, {
              matchId: match.matchId,
              slotOrder: slotNumber,
              teamId: team.id,
              teamName: team.name
            });
          } catch (err) {
            console.error('Failed to parse drag drop data:', err);
          }
        }}
      />
    );
  };

  return (
    <div
      onClick={onClick}
      className={`overflow-hidden rounded-lg border p-2.5 transition duration-150 ${match.rawMatch ? 'cursor-pointer' : 'cursor-default'} ${
        isLive
          ? 'border-red-500/80 bg-[#1f090e] shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_12px_30px_rgba(239,68,68,0.18)]'
          : isFinal
          ? 'bg-[#0b1220] border-blue-500/50 hover:border-blue-400'
          : isCompleted
          ? 'border-slate-700/60 bg-[#0c131f] hover:border-slate-500'
          : isBye
          ? 'border-blue-500/35 bg-[#0a1220]'
          : isWildcard
          ? 'border-blue-500/25 bg-[#0b121e] hover:border-blue-400/70'
          : 'border-white/[0.09] bg-[#0d1420] hover:border-blue-500/45'
      }`}
    >
      {/* Match Number & Status */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 text-[10px] text-slate-400">
        <span className="font-mono font-bold text-slate-300">
          {isFinal ? 'GRAND FINAL' : `Match ${String(match.matchNumber).padStart(2, '0')}`}
        </span>
        <div>
          {isLive && (
            <span className="flex items-center gap-1.5 font-black text-[10px] tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="font-bold text-blue-400">
              FINAL
            </span>
          )}
          {isBye && (
            <span className="font-bold text-blue-300">
              BYE
            </span>
          )}
          {!isLive && !isCompleted && !isBye && (
            <span className="font-mono text-[9px] text-slate-500">
              SCHEDULED
            </span>
          )}
        </div>
      </div>

      {/* Combatant Team Boxes */}
      {isBye ? (
        <div className="space-y-1">
          {renderTeamSlot(t1, 1)}
          <div className="flex items-center justify-end gap-1 px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-blue-400">
            <span>Advances</span><ArrowRight className="h-3 w-3" />
          </div>
        </div>
      ) : (
        <div className="space-y-1 relative">
          {renderTeamSlot(t1, 1, isFinal && !t1.isEmptySlot ? 'Winners Champion' : undefined)}

          {/* Bracket Branch between combatants */}
          <div className="flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
            <span>VS</span>
            {match.winnerTeam && (
              <span className="text-slate-400 flex items-center">
                <span>├──▶</span>
                <span className={`${isWildcard ? 'text-white' : 'text-yellow-400'} ml-1 max-w-[110px] truncate font-bold`}>
                  {match.winnerTeam.name}
                </span>
              </span>
            )}
          </div>

          {t2 && renderTeamSlot(t2, 2, isFinal && !t2.isEmptySlot ? 'Wildcard Champion' : undefined)}

          {t3 && (
            <>
              <div className="flex items-center justify-between px-2 text-[9px] font-mono text-blue-500/70">
                <span>3-WAY</span>
              </div>
              {renderTeamSlot(t3, 3)}
            </>
          )}

          {/* Flow destination indicator */}
          {!isWildcard && !isFinal && (
            <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-blue-400/80 flex items-center justify-between">
              <span>Loser:</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <span>Drops to Wildcard</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          )}

          {isWildcard && (
            <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-blue-400/90 flex items-center justify-between">
              <span>Losers:</span>
              <span className="text-blue-400 font-bold">
                Eliminated (Out)
              </span>
            </div>
          )}

          {isFinal && (
            <div className="mt-1 pt-1 border-t border-blue-500/20 text-[9px] text-blue-300 font-bold flex items-center justify-between">
              <span>Duel for the Trophy</span>
              <span>Winner becomes champion</span>
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
  slotNumber,
  isHovered,
  onHover,
  badge,
  isWildcardTrack = false,
  isDraggable = false,
  isDroppable = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}: {
  team: TeamBoxData;
  slotNumber?: number;
  isHovered: boolean;
  onHover: (name: string | null) => void;
  badge?: string;
  isWildcardTrack?: boolean;
  isDraggable?: boolean;
  isDroppable?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const isEmpty = team.isEmptySlot || !team.id;
  const isWinner = team.isWinner;
  const hasFinalResult = team.status === 'COMPLETED' || team.status === 'BYE';
  const resultTextColor = hasFinalResult
    ? isWildcardTrack
      ? isWinner
        ? 'text-white'
        : 'text-red-400'
      : isWinner
        ? 'text-yellow-400'
        : 'text-white'
    : 'text-slate-300';

  if (isEmpty) {
    return (
      <div
        onDragOver={isDroppable ? onDragOver : undefined}
        onDragLeave={isDroppable ? onDragLeave : undefined}
        onDrop={isDroppable ? onDrop : undefined}
        className={`h-8 rounded-md border border-dashed transition-all select-none flex items-center justify-center text-[10px] font-mono ${
          isDragOver
            ? 'border-blue-400 bg-blue-500/20 text-blue-300 ring-2 ring-blue-500/50'
            : isWildcardTrack
            ? 'bg-blue-950/15 border-blue-500/25 text-slate-500'
            : 'bg-slate-950/30 border-white/10 text-slate-600'
        }`}
      >
        {isDragOver ? 'Drop Team Here' : ''}
      </div>
    );
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragOver={isDroppable ? onDragOver : undefined}
      onDragLeave={isDroppable ? onDragLeave : undefined}
      onDrop={isDroppable ? onDrop : undefined}
      onMouseEnter={() => onHover(team.name)}
      onMouseLeave={() => onHover(null)}
      className={`group/pill flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-all ${
        isDraggable ? 'cursor-grab active:cursor-grabbing hover:border-blue-400/60' : ''
      } ${
        isDragOver
          ? 'border-blue-400 bg-blue-500/30 ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
          : isHovered
          ? 'border-blue-400 bg-blue-500/15 ring-1 ring-blue-400/30'
          : isWinner
          ? 'border-blue-500/45 bg-blue-950/35 font-bold text-white'
          : 'border-white/[0.06] bg-black/20 text-slate-300 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {isDraggable && (
          <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover/pill:text-blue-400 shrink-0 transition-colors" />
        )}
        <TeamAvatar
          logoUrl={team.logoUrl}
          name={team.name}
          size="xs"
        />
        <div className="truncate">
          <div className="flex items-center gap-1.5 truncate">
            {team.logoUrl && team.seed !== undefined && team.seed !== null && (
              <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">
                #{team.seed}
              </span>
            )}
            <span className={`block truncate font-semibold ${resultTextColor}`}>
              {team.name}
            </span>
          </div>
          {badge && (
            <span className="text-[9px] font-mono text-blue-400 block -mt-0.5">
              {badge}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {isDragOver ? (
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-400/40">
            Swap
          </span>
        ) : (
          <>
            {typeof team.score === 'number' && team.score !== 0 && (
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs font-bold text-white">
                {team.score}
              </span>
            )}
            {isWinner && (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
