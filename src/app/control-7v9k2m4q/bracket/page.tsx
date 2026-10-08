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
  Columns3,
  RotateCcw,
  Lock,
  Unlock,
  Loader2
} from 'lucide-react';
import { Team, Match } from '@/lib/types';

export default function AdminBracketPage() {
  const { selectedCategory, overview, stages, matches, teams, refresh } = useTournament();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [previewViewMode, setPreviewViewMode] = useState<'TREE' | 'CARDS'>('TREE');
  const [randomizePairings, setRandomizePairings] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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

  const handleConfirmFullBracket = async () => {
    if (!overview?.categoryId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bracket/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: overview.categoryId,
          randomize: randomizePairings
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate full bracket');

      setSuccess('Full tournament bracket architecture generated and locked! Downstream slots will bill live as matches are scored.');
      setPreviewPlan(null);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTournamentBracket = async () => {
    if (!overview?.categoryId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset tournament bracket');

      setSuccess('Tournament bracket reset successfully. Team roster is unlocked!');
      setIsResetModalOpen(false);
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
            <Swords className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">
              Bracket Architecture & Progression ({selectedCategory})
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pre-generate full tournament slots, lock confirmed teams, and track automated downstream progression as matches finish.
          </p>
        </div>

        {r1Stage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsResetModalOpen(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-blue-950/60 hover:text-blue-400 text-slate-300 border border-white/10 transition-colors"
              title="Reset tournament bracket and unlock teams"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Bracket</span>
            </button>

            <button
              onClick={handleAdvanceNextStage}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-colors shadow-lg shadow-blue-500/20"
            >
              <span>Progress Stage</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Full Tournament Bracket Generation Section (If Bracket not generated yet) */}
      {!r1Stage ? (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Generate Full Tournament Bracket Slots
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {activeTeams.length} Active Teams
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Lock the {selectedCategory} roster and pre-build all tournament stages (Round 1, Wildcards, Semifinals, Winners Final, Wildcard Final, and Grand Finals). As matches finish in the arena, winning teams and wildcard drops will automatically bill downstream positions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGeneratePreview}
                disabled={loading || activeTeams.length < 2}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 border border-white/10 disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-blue-400" />
                <span>Preview Pairings</span>
              </button>

              <button
                onClick={handleConfirmFullBracket}
                disabled={loading || activeTeams.length < 2}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-black flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Slots...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Generate Full Bracket</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center gap-3">
            <input
              id="bracketRandomize"
              type="checkbox"
              checked={randomizePairings}
              onChange={(e) => setRandomizePairings(e.target.checked)}
              className="w-4 h-4 rounded text-blue-500 focus:ring-0 accent-blue-500 cursor-pointer"
            />
            <label htmlFor="bracketRandomize" className="text-xs text-slate-300 cursor-pointer select-none">
              <span className="font-semibold text-white">Shuffle / Randomize match pairings</span>
              <span className="text-[11px] text-slate-400 ml-2">(Uncheck to preserve registered seed order)</span>
            </label>
          </div>

          {/* Manual BYE Selector (For Odd Teams) */}
          {activeTeams.length % 2 !== 0 && (
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2">
              <label className="block text-xs font-bold text-blue-300">
                Manual BYE Override (Optional)
              </label>
              <p className="text-[11px] text-slate-400">
                Odd number of teams ({activeTeams.length}). By default, top seeds receive an automatic pass:
              </p>
              <select
                value={selectedManualBye}
                onChange={(e) => setSelectedManualBye(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 rounded-xl bg-slate-900 border border-blue-500/40 text-white text-xs focus:outline-none"
              >
                <option value="">-- Let system choose based on seeds --</option>
                {activeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Proposed Round 1 Preview Modal / Panel */}
          {previewPlan && (
            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-blue-500/40 space-y-4 animate-in fade-in">
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
                        previewViewMode === 'TREE' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tree Look
                    </button>
                    <button
                      onClick={() => setPreviewViewMode('CARDS')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        previewViewMode === 'CARDS' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
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
                    onClick={handleConfirmFullBracket}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm & Lock Full Bracket</span>
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
                    <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40">
                      <div className="flex items-center justify-between mb-2 text-[10px] text-blue-300 font-mono">
                        <span>AUTOMATIC BYE</span>
                        <span className="font-bold">ADVANCE</span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-900/40 text-white font-bold text-xs truncate">
                        {previewPlan.byeTeam.name}
                      </div>
                      <p className="text-[10px] text-blue-300 mt-2">
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
                        ? 'bg-blue-950/30 border-blue-400'
                        : stage.status === 'COMPLETED'
                        ? 'bg-slate-900 border-blue-500/30'
                        : 'bg-slate-900/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{stage.displayName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stage.status === 'ACTIVE'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : stage.status === 'COMPLETED'
                          ? 'bg-blue-500/20 text-blue-400'
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
                <GitBranch className="w-4 h-4 text-blue-400" />
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

      {/* Modal for Reset Bracket */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0e1628] border border-blue-500/40 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Reset Tournament Bracket
                </h3>
                <p className="text-xs text-blue-400 font-medium">
                  {selectedCategory} Division
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-2 text-blue-200/90">
              <p className="font-bold text-blue-300">
                Are you sure you want to reset this tournament bracket?
              </p>
              <p className="text-[11px] text-slate-300">
                This will delete all matches, stages, and combat records for {selectedCategory}. Teams will be reset to ACTIVE status and the roster will be unlocked.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetTournamentBracket}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Yes, Reset Bracket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
