'use client';

import React from 'react';
import { Match } from '@/lib/types';
import { Trophy, Check, ArrowRight } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  compact?: boolean;
}

export default function MatchCard({ match, onClick, compact = false }: MatchCardProps) {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const isBye = match.status === 'BYE';
  const isWildcard = match.stageType.includes('WILDCARD');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden border text-left transition-all duration-200 ${
        isLive
          ? 'border-red-500/70 bg-gradient-to-br from-[#1a080d] to-slate-950 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_18px_40px_rgba(185,28,28,0.25)]'
          : isCompleted
          ? 'border-blue-500/15 bg-[#080d18] hover:border-blue-400/45'
          : isBye
          ? 'border-blue-500/35 bg-blue-950/20 hover:border-blue-400'
          : isWildcard
          ? 'border-blue-500/25 bg-[#080d18] hover:border-blue-400/60 hover:bg-blue-950/20'
          : 'border-blue-500/15 bg-[#080d18] hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-[#0a1222]'
      } ${compact ? 'min-w-[220px] p-3 text-xs' : 'min-w-[260px] p-4 sm:min-w-[280px]'}`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${isLive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-blue-600/60'}`} aria-hidden="true" />
      {/* Top Header of the Card */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-blue-500/10 pb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-blue-200">
            {match.stageName || match.stageType}
          </span>
          <span className="text-slate-500">•</span>
          <span>#{match.matchNumber}</span>
        </div>

        {/* Status Indicator Pill */}
        <div>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm shadow-red-950">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              FINAL
            </span>
          )}
          {isBye && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              BYE
            </span>
          )}
          {!isLive && !isCompleted && !isBye && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              UPCOMING
            </span>
          )}
        </div>
      </div>

      {/* Card Body: Participants */}
      {isBye ? (
        <div className="py-2 px-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              {match.participants[0]?.team?.name || 'TBD Team'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              BYE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-blue-400" />
            <span>Advanced automatically</span>
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {(() => {
            const slots = match.participants.map((p) => ({
              id: p.id,
              isEmpty: !p.teamId,
              name: p.team?.name || '',
              score: p.score,
              isWinner: isCompleted && p.teamId === match.winnerTeamId
            }));

            // Always ensure at least 2 combatant slots for non-bye matches
            while (slots.length < 2) {
              const sNum = slots.length + 1;
              slots.push({
                id: `synth-slot-${sNum}`,
                isEmpty: true,
                name: '',
                score: null,
                isWinner: false
              });
            }

            return slots.map((p, idx) => {
              if (p.isEmpty) {
                return (
                  <div
                    key={p.id}
                    className="flex h-10 select-none items-center border border-dashed border-blue-500/15 bg-black/20 px-2.5"
                  />
                );
              }

              return (
                <React.Fragment key={p.id}>
                  {idx > 0 && (
                    <div className="flex items-center gap-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-blue-500/60">
                      <span className="h-px flex-1 bg-blue-500/10" />VS<span className="h-px flex-1 bg-blue-500/10" />
                    </div>
                  )}
                  <div
                  className={`flex items-center justify-between border px-2.5 py-2.5 text-xs transition-colors ${
                    p.isWinner
                      ? 'border-blue-400/35 bg-blue-500/15 font-bold text-white'
                      : isCompleted
                      ? 'border-blue-500/10 bg-black/20 text-slate-500'
                      : 'border-blue-500/10 bg-blue-950/20 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {idx + 1}.
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate block font-medium">
                          {p.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {typeof p.score === 'number' && p.score !== 0 && (
                      <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-black/40 text-white">
                        {p.score}
                      </span>
                    )}
                    {p.isWinner && (
                      <Trophy className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}

      {/* Card Bottom: Winner pointer or action tip */}
      {isCompleted && match.winnerTeam && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-blue-300 text-[10px] font-black tracking-wider">WINNER</span>
          <span className="font-bold text-blue-400 flex items-center gap-1 truncate">
            <span className="truncate">{match.winnerTeam.name}</span>
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
          </span>
        </div>
      )}

      {!isCompleted && !isBye && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-slate-400">
          <span>{match.participants.length} combatants</span>
          <span className="flex items-center gap-1">
            <span>Details</span>
            <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      )}
    </button>
  );
}
