'use client';

import React from 'react';
import { TournamentStage, StageType } from '@/lib/types';
import { Check, Clock, Radio, Play } from 'lucide-react';

interface StepperProps {
  stages: TournamentStage[];
  currentStage: StageType;
  isCompleted: boolean;
}

export default function TournamentProgressStepper({ stages, currentStage, isCompleted }: StepperProps) {
  if (!stages || stages.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Tournament Stage Flow</span>
        </h3>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {isCompleted ? 'All Stages Concluded' : 'Official Bracket Progression'}
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-max gap-2 sm:gap-3">
          {stages.map((stage, idx) => {
            const isStageCompleted = stage.status === 'COMPLETED';
            const isActive = stage.status === 'ACTIVE';
            const isPending = stage.status === 'PENDING';

            return (
              <React.Fragment key={stage.id}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isStageCompleted
                    ? 'bg-slate-900/80 border-blue-500/30 text-blue-400'
                    : isActive
                    ? 'bg-blue-950/60 border-blue-400 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/30 border-white/5 text-slate-500'
                }`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isStageCompleted
                      ? 'bg-blue-500 text-black'
                      : isActive
                      ? 'bg-blue-400 text-black animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isStageCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                  </div>

                  <span>{stage.displayName}</span>

                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>

                {idx < stages.length - 1 && (
                  <div className={`w-4 h-0.5 ${
                    isStageCompleted ? 'bg-blue-500/40' : 'bg-slate-800'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
