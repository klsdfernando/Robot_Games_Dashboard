'use client';

import React, { useState, useMemo } from 'react';
import { useTournament } from '@/context/TournamentContext';
import TournamentTreeGraph from '@/components/TournamentTreeGraph';
import MatchDetailModal from '@/components/MatchDetailModal';
import { 
  Swords, 
  Play, 
  RotateCw, 
  Check, 
  ArrowRight, 
  AlertCircle, 
  Shield, 
  Sparkles,
  HelpCircle,
  GitBranch,
  Columns3
} from 'lucide-react';
import { Team, Match } from '@/lib/types';

export default function AdminBracketPage() {
  const { selectedCategory, overview, stages, matches, teams, refresh } = useTournament();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [previewViewMode, setPreviewViewMode] = useState<'TREE' | 'CARDS'>('TREE');

  // Round 1 Generation & Preview State
  const [previewPlan, setPreviewPlan] = useState<{
    matches: { matchNumber: number; team1: Team; team2: Team }[];
    byeTeam: Team | null;
  } | null>(null);

  const [selectedManualBye, setSelectedManualBye] = useState<string>('');

  const r1Stage = stages.find(s => s.stageType === 'ROUND_1');
  const activeTeams = teams.filter(t => !t.isWithdrawn);

  // Convert preview plan to Match[] to feed into TournamentTreeGraph
  const previewMatches: Match[] = useMemo(() => {
    if (!previewPlan || !overview?.categoryId) return [];
    const list: Match[] = previewPlan.matches.map(m => ({
      id: `prev-${m.matchNumber}`,
      categoryId: overview.categoryId,
      stageId: 'prev-r1',
      stageType: 'ROUND_1',
      stageName: 'Preliminary Round',
      matchNumber: m.matchNumber,
      roundOrder: 1,
      status: 'SCHEDULED',
      participants: [
        { id: `p1-${m.matchNumber}`, matchId: `prev-${m.matchNumber}`, participantOrder: 1, isWinner: false, team: m.team1, teamId: m.team1.id },
        { id: `p2-${m.matchNumber}`, matchId: `prev-${m.matchNumber}`, participantOrder: 2, isWinner: false, team: m.team2, teamId: m.team2.id }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    if (previewPlan.byeTeam) {
      list.push({
        id: `prev-${list.length + 1}`,
        categoryId: overview.categoryId,
        stageId: 'prev-r1',
        stageType: 'ROUND_1',
        stageName: 'Preliminary Round',
        matchNumber: list.length + 1,
        roundOrder: 1,
        status: 'BYE',
        winnerTeamId: previewPlan.byeTeam.id,
        winnerTeam: previewPlan.byeTeam,
        participants: [
          { id: `p1-bye`, matchId: `prev-${list.length + 1}`, participantOrder: 1, isWinner: true, team: previewPlan.byeTeam, teamId: previewPlan.byeTeam.id, advancementSource: 'ROUND_1_BYE' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return list;
  }, [previewPlan, overview?.categoryId]);

  const handleGeneratePreview = async () => {
    if (!overview?.categoryId) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/round1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: overview.categoryId,
          manualByeTeamId: selectedManualBye || undefined,
          previewOnly: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview plan');

      setPreviewPlan({
        matches: data.matches,
        byeTeam: data.byeTeam
      });
      if (data.byeTeam) {
        setSelectedManualBye(data.byeTeam.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRound1 = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`Confirm and generate Round 1 bracket for ${selectedCategory}?`)) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/round1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: overview.categoryId,
          manualByeTeamId: selectedManualBye || undefined,
          previewOnly: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start Round 1');

      setSuccess('Round 1 officially locked and generated!');
      setPreviewPlan(null);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceNextStage = async () => {
    if (!overview?.categoryId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stages/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance stage');

      setSuccess(`Advanced to stage: ${data.nextStage}!`);
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
            <Swords className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">
              Bracket Architecture & Progression ({selectedCategory})
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate initial Round 1 pairings, review BYE distributions, and progress tournament stages through the tree.
          </p>
        </div>

        {r1Stage && (
          <button
            onClick={handleAdvanceNextStage}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-lg shadow-sky-500/20"
          >
            <span>Progress to Next Stage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Round 1 Generation Section (If Round 1 not generated yet) */}
      {!r1Stage ? (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Generate Round 1 Bracket</span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {activeTeams.length} Active Teams
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeTeams.length % 2 !== 0
                  ? `Odd number of teams (${activeTeams.length}). The algorithm will automatically allocate 1 BYE.`
                  : `Even number of teams (${activeTeams.length}). Will produce ${activeTeams.length / 2} clean 1v1 pairings.`}
              </p>
            </div>

            <button
              onClick={handleGeneratePreview}
              disabled={loading || activeTeams.length < 2}
              className="px-5 py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Preview Proposed Round 1</span>
            </button>
          </div>

          {/* Manual BYE Selector (For Odd Teams) */}
          {activeTeams.length % 2 !== 0 && (
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <label className="block text-xs font-bold text-purple-300">
                Manual BYE Override (Optional)
              </label>
              <p className="text-[11px] text-slate-400">
                By default, the system chooses a random eligible participant. You may manually select a team to receive the automatic Round 1 pass:
              </p>
              <select
                value={selectedManualBye}
                onChange={(e) => setSelectedManualBye(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/40 text-white text-xs focus:outline-none"
              >
                <option value="">-- Let system choose randomly --</option>
                {activeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.robotName ? `(${t.robotName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Proposed Round 1 Preview Modal / Panel */}
          {previewPlan && (
            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-amber-500/40 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    PROPOSED ROUND 1 PAIRINGS PREVIEW
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Review and verify all matchups in tree format before locking matches into the database.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-white/5 mr-2">
                    <button
                      onClick={() => setPreviewViewMode('TREE')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        previewViewMode === 'TREE' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tree Look
                    </button>
                    <button
                      onClick={() => setPreviewViewMode('CARDS')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        previewViewMode === 'CARDS' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cards
                    </button>
                  </div>

                  <button
                    onClick={handleGeneratePreview}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reshuffle</span>
                  </button>

                  <button
                    onClick={handleConfirmRound1}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Lock Round 1</span>
                  </button>
                </div>
              </div>

              {/* Render Tree Graph Preview or Matchups Grid */}
              {previewViewMode === 'TREE' ? (
                <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                  <TournamentTreeGraph
                    stages={[{
                      id: 'prev-r1',
                      categoryId: overview?.categoryId || '',
                      stageType: 'ROUND_1',
                      stageOrder: 1,
                      displayName: 'Round 1',
                      status: 'PENDING'
                    }]}
                    matches={previewMatches}
                    overview={overview}
                    onSelectMatch={() => {}}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {previewPlan.matches.map((m) => (
                    <div
                      key={m.matchNumber}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2 text-[10px] text-slate-400 font-mono">
                        <span>Match #{m.matchNumber}</span>
                        <span>1v1 Knockout</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="p-2 rounded-lg bg-slate-800/80 text-white font-semibold text-xs truncate">
                          {m.team1.name}
                        </div>
                        <div className="text-[10px] text-center font-bold text-slate-500">VS</div>
                        <div className="p-2 rounded-lg bg-slate-800/80 text-white font-semibold text-xs truncate">
                          {m.team2.name}
                        </div>
                      </div>
                    </div>
                  ))}

                  {previewPlan.byeTeam && (
                    <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40">
                      <div className="flex items-center justify-between mb-2 text-[10px] text-purple-300 font-mono">
                        <span>AUTOMATIC BYE</span>
                        <span className="font-bold">ADVANCE</span>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-900/40 text-white font-bold text-xs truncate">
                        {previewPlan.byeTeam.name}
                      </div>
                      <p className="text-[10px] text-purple-300 mt-2">
                        Advances automatically to Main Winner path without fighting this round.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Stages Pipeline View & Live Tournament Tree */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white">Generated Tournament Stages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stages.map((stage) => {
                const stageMatches = matches.filter(m => m.stageId === stage.id);
                const completedCount = stageMatches.filter(m => m.status === 'COMPLETED' || m.status === 'BYE').length;

                return (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-2xl border ${
                      stage.status === 'ACTIVE'
                        ? 'bg-sky-950/30 border-sky-400'
                        : stage.status === 'COMPLETED'
                        ? 'bg-slate-900 border-emerald-500/30'
                        : 'bg-slate-900/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{stage.displayName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stage.status === 'ACTIVE'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : stage.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {stage.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {stageMatches.length} Matches • {completedCount} Completed
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Tournament Tree Graph */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-sky-400" />
                <span>Live Tournament Tree & Wildcard Separation</span>
              </h3>
            </div>

            <TournamentTreeGraph
              stages={stages}
              matches={matches}
              overview={overview}
              onSelectMatch={(m) => setSelectedMatch(m)}
            />
          </div>
        </div>
      )}

      {/* Match Detail Modal for Admin view */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
