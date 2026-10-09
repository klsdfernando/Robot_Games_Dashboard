'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Match } from '@/lib/types';
import { X, Trophy, Swords, ArrowRight, Clock } from 'lucide-react';
import TeamAvatar from './TeamAvatar';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export default function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && match) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mounted, match]);

  if (!match || !mounted) return null;

  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const isBye = match.status === 'BYE';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0e1626] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>Match #{match.matchNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  {match.stageName || match.stageType}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Category: <span className="text-blue-400 font-semibold">{match.categoryId.includes('heavy') ? 'HEAVYWEIGHT (20kg)' : 'LIGHTWEIGHT (3kg)'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close match details modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Status Banner */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-xs text-slate-400 font-medium">Match Status</span>
            <div>
              {isLive && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-live-pulse" />
                  LIVE NOW IN ARENA
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Trophy className="w-3.5 h-3.5" />
                  COMPLETED
                </span>
              )}
              {isBye && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  AUTOMATIC BYE
                </span>
              )}
              {!isLive && !isCompleted && !isBye && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  SCHEDULED / UPCOMING
                </span>
              )}
            </div>
          </div>

          {/* Participants Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {match.participants.length === 3 ? '3-Way Wildcard Battle' : 'Combatants'}
            </h3>

            {isBye ? (
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamAvatar
                      logoUrl={match.participants[0]?.team?.logoUrl}
                      name={match.participants[0]?.team?.name}
                      size="md"
                    />
                    <div>
                      <h4 className="font-bold text-white text-base">
                        {match.participants[0]?.team?.name || 'TBD Team'}
                      </h4>
                      {match.participants[0]?.team?.organization && <p className="text-xs text-blue-300">{match.participants[0].team.organization}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    BYE ADVANCE
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  This participant received an automatic BYE due to odd round numbers and advances directly to the Main Winner path without combat.
                </p>
              </div>
            ) : (
              match.participants.map((p, idx) => {
                const isWinner = isCompleted && p.teamId === match.winnerTeamId;
                const isEmpty = !p.teamId || !p.team;
                if (isEmpty) {
                  return (
                    <div
                      key={p.id}
                      className="h-14 px-3.5 rounded-xl border border-dashed border-white/10 bg-slate-950/20 flex items-center"
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
                    className={`p-3.5 rounded-xl border transition-all ${
                      isWinner
                        ? 'bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-500/10'
                        : isCompleted
                        ? 'bg-slate-900/40 border-white/5 opacity-75'
                        : 'bg-slate-900/80 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamAvatar
                          logoUrl={p.team?.logoUrl}
                          name={p.team?.name}
                          cornerColor={isWinner ? 'blue' : idx === 0 ? 'red' : idx === 1 ? 'blue' : 'yellow'}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {p.team?.name || ''}
                            </span>
                            {isWinner && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-black">
                                WINNER
                              </span>
                            )}
                          </div>
                          {p.team?.organization && <p className="text-xs text-slate-400">{p.team.organization}</p>}
                          {p.advancementSource && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Source: {p.advancementSource.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {typeof p.score === 'number' && p.score !== 0 && (
                        <div className="text-right">
                          <span className="text-lg font-mono font-bold text-white">{p.score}</span>
                          <span className="block text-[10px] text-slate-500">PTS</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tournament Journey & Next Destination */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Tournament Path Progression</span>
            </h4>
            
            {match.stageType === 'ROUND_1' && (
              <div className="space-y-1 text-slate-400">
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Winner:</strong> Advances to Quarterfinals (Winners Bracket 2v2).</span>
                </p>
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Loser:</strong> Drops into Round 1 Wildcard (3-way / 2-way battles).</span>
                </p>
              </div>
            )}

            {match.stageType === 'WILDCARD' && (
              <p className="text-blue-300/90">
                <strong>Round 1 Wildcard:</strong> 3-way (or 2-way) survival match. 1 winner advances to QF Wildcard. Losers are permanently eliminated.
              </p>
            )}

            {match.stageType === 'QUARTERFINAL' && (
              <div className="space-y-1 text-slate-400">
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Winner:</strong> Advances to Semifinals (Winners Bracket 2v2).</span>
                </p>
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Loser:</strong> Drops to Quarterfinal Wildcard.</span>
                </p>
              </div>
            )}

            {match.stageType === 'QUARTERFINAL_WILDCARD' && (
              <p className="text-blue-300/90">
                <strong>QF Wildcard:</strong> 3-way / 2-way match between WC R1 winners and QF losers. 1 winner advances to SF Wildcard. Losers are permanently eliminated.
              </p>
            )}

            {match.stageType === 'SEMIFINAL' && (
              <div className="space-y-1 text-slate-400">
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Winner:</strong> Advances to Winners Final (Upper Championship).</span>
                </p>
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Loser:</strong> Drops to Semifinal Wildcard for a second chance lifeline.</span>
                </p>
              </div>
            )}

            {match.stageType === 'SEMIFINAL_WILDCARD' && (
              <p className="text-blue-300/90">
                <strong>Semifinals Wildcard:</strong> 3-way / 2-way battles between QF WC winners and SF losers. 1 winner advances to Wildcard Final. Losers are permanently eliminated.
              </p>
            )}

            {match.stageType === 'WINNERS_FINAL' && (
              <div className="space-y-1 text-slate-400">
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Winner:</strong> Crowned Winners Bracket Champion (Upper Winner) & advances to Grand Finals!</span>
                </p>
                <p className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Loser:</strong> Drops to Wildcard Final for one last shot at the crown!</span>
                </p>
              </div>
            )}

            {match.stageType === 'WILDCARD_SEMIFINAL' && (
              <p className="text-blue-300/90">
                <strong>Wildcard Semifinals:</strong> Surviving contenders battle! Winners advance to the Wildcard Final Decider. Losers are permanently eliminated.
              </p>
            )}

            {match.stageType === 'WILDCARD_FINAL' && (
              <p className="text-blue-300/90">
                <strong>Wildcard Final Decider:</strong> The final showdown for the Wildcard title! Winner is crowned Wildcard Champion & advances to Grand Finals. Loser is eliminated.
              </p>
            )}

            {match.stageType === 'FINAL' && (
              <p className="text-blue-400 font-semibold">
                <strong>Grand Finals:</strong> Head-to-head 2v2 title match between the Upper Winner (Winner Matches Winner) and the Wildcard Winner (Loser Battles Winner) to crown the Tournament Champion!
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/80 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
