'use client';

import React from 'react';
import { Match, MatchParticipant } from '@/lib/types';
import { Trophy, Clock, Swords, Check, ArrowRight } from 'lucide-react';

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
    <div
      onClick={onClick}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
        isLive
          ? 'bg-[#131b2e] border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
          : isCompleted
          ? 'bg-[#0f172a]/90 border-slate-700/60 hover:border-slate-500 hover:bg-[#15203b]'
          : isBye
          ? 'bg-[#181329]/90 border-purple-500/40 hover:border-purple-400'
          : isWildcard
          ? 'bg-[#171622]/90 border-amber-500/30 hover:border-amber-400/60 hover:bg-[#201d30]'
          : 'bg-[#0e1626]/90 border-white/10 hover:border-sky-500/40 hover:bg-[#131e33]'
      } ${compact ? 'p-3 text-xs min-w-[220px]' : 'p-4 min-w-[260px] sm:min-w-[280px]'}`}
    >
      {/* Top Header of the Card */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/5 text-[11px] font-semibold text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-white font-bold">
            {match.stageName || match.stageType}
          </span>
          <span className="text-slate-500">•</span>
          <span>#{match.matchNumber}</span>
        </div>

        {/* Status Indicator Pill */}
        <div>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-live-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              FINAL
            </span>
          )}
          {isBye && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
              BYE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <span>Advanced automatically</span>
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {match.participants.map((p, idx) => {
            const isWinner = isCompleted && p.teamId === match.winnerTeamId;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                  isWinner
                    ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                    : isCompleted
                    ? 'bg-slate-900/40 text-slate-400 opacity-60'
                    : 'bg-slate-900/70 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {idx + 1}.
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate block font-medium">
                        {p.team?.name || p.placeholderText || 'TBD'}
                      </span>
                      {p.team && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold flex-shrink-0 ${
                          p.team.lives === 2
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.team.lives === 1
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {p.team.lives === 2 ? '2 L' : p.team.lives === 1 ? '1 L' : '0 L'}
                        </span>
                      )}
                    </div>
                    {p.team?.robotName && (
                      <span className="text-[10px] text-slate-400 truncate block">
                        {p.team.robotName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.score !== null && p.score !== undefined && (
                    <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-black/40 text-white">
                      {p.score}
                    </span>
                  )}
                  {isWinner && (
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Card Bottom: Winner pointer or action tip */}
      {isCompleted && match.winnerTeam && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 text-[10px]">Advances:</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1 truncate">
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
    </div>
  );
}
