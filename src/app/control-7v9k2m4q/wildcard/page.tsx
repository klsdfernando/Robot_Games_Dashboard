'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Flame, Play, Check, AlertTriangle, RotateCw, Users, Shield, ArrowRight } from 'lucide-react';
import { Team, WildcardProposal } from '@/lib/types';

export default function AdminWildcardPage() {
  const { selectedCategory, overview, stages, refresh } = useTournament();
  const [sourceStageType, setSourceStageType] = useState<string>('ROUND_1');
  const [targetStageType, setTargetStageType] = useState<string>('WILDCARD');
  const [poolTeams, setPoolTeams] = useState<Team[]>([]);
  const [proposal, setProposal] = useState<WildcardProposal | null>(null);
  const [isAlreadyGenerated, setIsAlreadyGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchWildcardData = async (stageOverride?: string) => {
    if (!overview?.categoryId) return;
    setLoading(true);
    setError(null);
    const stageToQuery = stageOverride || sourceStageType;
    try {
      const res = await fetch(`/api/admin/wildcard?categoryId=${overview.categoryId}&sourceStage=${stageToQuery}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch wildcard data');

      setPoolTeams(data.poolTeams || []);
      setProposal(data.proposal || null);
      setIsAlreadyGenerated(Boolean(data.isAlreadyGenerated));
      if (data.sourceStageType) setSourceStageType(data.sourceStageType);
      if (data.targetStageType) setTargetStageType(data.targetStageType);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWildcardData();
  }, [overview?.categoryId, selectedCategory]);

  const handleStageTabChange = (newStage: string) => {
    setSourceStageType(newStage);
    fetchWildcardData(newStage);
  };

  const handleConfirmWildcard = async () => {
    if (!overview?.categoryId) return;
    const stageName = sourceStageType === 'QUARTERFINAL' ? 'Quarterfinals Wildcard' : 'Round 1 Wildcard';
    if (!confirm(`Confirm and generate ${stageName} for ${selectedCategory}?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/wildcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId, sourceStage: sourceStageType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate wildcard stage');

      setSuccess(`${stageName} successfully generated and saved!`);
      await fetchWildcardData();
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">
              Wildcard Second-Chance Management ({selectedCategory})
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            2-Lives Rule: After every main round (Round 1, Quarterfinals), 1st-loss contenders get a Wildcard battle. A 2nd loss eliminates the team.
          </p>

          {/* Stage Pool Selector Tabs */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => handleStageTabChange('ROUND_1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sourceStageType === 'ROUND_1'
                  ? 'bg-blue-500 text-black shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Round 1 Wildcard Pool
            </button>
            <button
              onClick={() => handleStageTabChange('QUARTERFINAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sourceStageType === 'QUARTERFINAL'
                  ? 'bg-blue-500 text-black shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Quarterfinals Wildcard Pool
            </button>
          </div>
        </div>

        {!isAlreadyGenerated && poolTeams.length > 0 && (
          <button
            onClick={handleConfirmWildcard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black shadow-lg shadow-blue-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Generate {sourceStageType === 'QUARTERFINAL' ? 'QF Wildcard' : 'Wildcard'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Warnings & 1-team rule alert */}
      {proposal?.warnings && proposal.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 text-blue-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Notice for Wildcard Engine</span>
          </div>
          {proposal.warnings.map((w, i) => (
            <p key={i} className="text-slate-300 pl-5">{w}</p>
          ))}
        </div>
      )}

      {/* Wildcard Pool Box */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>WILDCARD POOL</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                {poolTeams.length} Losing Teams from Round 1
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These teams were defeated in Round 1 and qualify for the second chance stage.
            </p>
          </div>

          <button
            onClick={() => fetchWildcardData()}
            title="Refresh Pool"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {poolTeams.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No teams in the Wildcard pool yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Teams enter this pool automatically when they lose their Round 1 match.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {poolTeams.map((team) => (
              <div
                key={team.id}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-white/5 text-xs font-semibold text-white flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{team.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proposed Wildcard Match Groups */}
      {proposal && proposal.groups.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="font-bold text-white text-base">
                PROPOSED WILDCARD GROUPS (3-WAY & 2-WAY)
              </h3>
              <p className="text-xs text-slate-400">
                Balanced according to tournament rules: groups of 3 primarily, with remainder rebalanced to prevent 1-team free passes.
              </p>
            </div>
            {isAlreadyGenerated && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ACTIVE ON BRACKET
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposal.groups.map((group) => (
              <div
                key={group.matchNumber}
                className="p-4 rounded-2xl bg-[#0b101c] border border-blue-500/30 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-blue-400 font-bold border-b border-white/5 pb-2">
                  <span>Wildcard #{group.matchNumber}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300">
                    {group.size === 3 ? '3-Way Battle (1 Winner)' : '1v1 Duel (1 Winner)'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.teams.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-white font-medium flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500 text-[10px] font-mono">{idx + 1}.</span>
                        <span className="truncate">{t.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Winner returns to Main Knockouts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
