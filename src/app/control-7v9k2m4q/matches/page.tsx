'use client';

import React, { useState, useMemo } from 'react';
import { useTournament } from '@/context/TournamentContext';
import TeamAvatar from '@/components/TeamAvatar';
import { 
  Radio, 
  Swords, 
  Play, 
  Trophy, 
  AlertTriangle, 
  Check, 
  RotateCcw, 
  X, 
  Clock
} from 'lucide-react';
import { Match, DownstreamImpact } from '@/lib/types';

export default function AdminMatchesPage() {
  const { selectedCategory, overview, matches, stages, teams, refresh } = useTournament();

  const [activeMatchForControl, setActiveMatchForControl] = useState<Match | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [scores, setScores] = useState<{ [participantId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Winner Correction State
  const [correctionTargetMatch, setCorrectionTargetMatch] = useState<Match | null>(null);
  const [newCorrectedWinnerId, setNewCorrectedWinnerId] = useState<string>('');
  const [downstreamImpact, setDownstreamImpact] = useState<DownstreamImpact | null>(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);

  // Stage filter for admin match console
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  const filteredMatches = useMemo(() => {
    if (selectedStageFilter === 'ALL') return matches;
    return matches.filter(m => m.stageId === selectedStageFilter || m.stageType === selectedStageFilter);
  }, [matches, selectedStageFilter]);

  // LIVE MATCH SPOTLIGHT
  const liveMatch = useMemo(() => {
    return overview?.liveMatch || matches.find(m => m.status === 'LIVE') || null;
  }, [overview?.liveMatch, matches]);

  // UP NEXT MATCH SPOTLIGHT
  const upNextMatch = useMemo(() => {
    if (overview?.upNextMatch) return overview.upNextMatch;
    return matches.find(m => 
      m.status === 'SCHEDULED' && 
      (!liveMatch || m.id !== liveMatch.id) &&
      m.participants.length >= 2 &&
      m.participants.every(p => Boolean(p.teamId))
    ) || null;
  }, [overview?.upNextMatch, matches, liveMatch]);

  // -------------------------------------------------------------
  // MATCH CONTROL HANDLERS (START LIVE, REVERT, SET WINNER)
  // -------------------------------------------------------------
  const handleStartMatch = async (match: Match) => {
    // Only ONE match can be live at any time!
    if (liveMatch && liveMatch.id !== match.id) {
      const confirmSwitch = confirm(
        `Match #${liveMatch.matchNumber} (${liveMatch.stageName || liveMatch.stageType}) is currently LIVE in arena.\n\nOnly ONE match can be live at a time.\n\nSet Match #${match.matchNumber} as the LIVE match instead? (Match #${liveMatch.matchNumber} will revert to Scheduled).`
      );
      if (!confirmSwitch) return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start match');

      setSuccess(`Match #${match.matchNumber} is now LIVE in arena!`);
      setActiveMatchForControl(null);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertMatch = async (matchId: string) => {
    if (!confirm('Stop arena fight and revert match back to SCHEDULED?')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revert match');

      setSuccess('Match reverted back to SCHEDULED.');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openMatchControl = (match: Match) => {
    // WINNER CAN ONLY BE DECLARED WHEN MATCH IS LIVE!
    if (match.status !== 'LIVE') {
      setError('Match must be set to LIVE in arena before recording a winner.');
      return;
    }

    setActiveMatchForControl(match);
    setSelectedWinnerId(match.winnerTeamId || (match.participants[0]?.teamId || ''));
    const initialScores: { [id: string]: number } = {};
    match.participants.forEach(p => {
      initialScores[p.id] = p.score || 0;
    });
    setScores(initialScores);
    setError(null);
  };

  const handleSetWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchForControl || !selectedWinnerId) return;

    if (!confirm('Confirm this team as the official winner? This will advance them to the next bracket round.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${activeMatchForControl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerTeamId: selectedWinnerId,
          scores
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set winner');

      setSuccess('Winner officially recorded and bracket updated!');
      setActiveMatchForControl(null);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Winner Correction Modal and check downstream impact
  const openWinnerCorrection = async (match: Match) => {
    setCorrectionTargetMatch(match);
    setNewCorrectedWinnerId('');
    setDownstreamImpact(null);
    setIsCheckingImpact(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/matches/${match.id}/impact`);
      const data = await res.json();
      if (res.ok) {
        setDownstreamImpact(data.impact);
      }
    } catch {
      // silent
    } finally {
      setIsCheckingImpact(false);
    }
  };

  const handleExecuteCorrection = async () => {
    if (!correctionTargetMatch || !newCorrectedWinnerId) return;

    if (!confirm('⚠️ EXPLICIT CONFIRMATION REQUIRED: Are you completely sure you want to correct this match winner? Any downstream matches that were affected will have their participants safely replaced/reset.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/matches/${correctionTargetMatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newWinnerTeamId: newCorrectedWinnerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Correction failed');

      setSuccess('Winner corrected safely across bracket!');
      setCorrectionTargetMatch(null);
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
            <Radio className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">
              Live Match Control Console ({selectedCategory})
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control arena fights (strictly 1 live battle), launch bouts, record match winners, and apply safe corrections.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between animate-in fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between animate-in fade-in">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ============================================================= */}
      {/* OVERVIEW SPOTLIGHT: LIVE BATTLE vs UP NEXT BATTLE (SMALL PREVIEW) */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LIVE MATCH SPOTLIGHT CARD */}
        <div className="rounded-2xl border border-red-500/40 bg-[#0c111b] p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-[0_0_25px_rgba(239,68,68,0.12)] ring-1 ring-red-500/20">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
                LIVE IN ARENA
              </h3>
            </div>
            {liveMatch && (
              <span className="text-xs font-bold text-slate-300">
                {liveMatch.stageName || liveMatch.stageType} • <span className="font-mono text-white font-black">#{liveMatch.matchNumber}</span>
              </span>
            )}
          </div>

          {liveMatch ? (
            <div className="space-y-4">
              {/* Face-off layout (supports both 2-team and 3-way matches) */}
              {liveMatch.participants.length === 3 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
                  {liveMatch.participants.map((p, idx) => {
                    const corner = idx === 0 ? 'red' : idx === 1 ? 'blue' : 'green';
                    const cornerBg = idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500';
                    return (
                      <React.Fragment key={p.id || idx}>
                        {idx > 0 && (
                          <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-[#080d18] border border-white/20 text-[10px] font-mono font-black text-slate-400 shadow-sm">
                            VS
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-[100px] flex-1">
                          <div className={`absolute top-0 inset-x-0 h-1 ${cornerBg} rounded-t-xl`} />
                          <TeamAvatar
                            logoUrl={p.team?.logoUrl}
                            name={p.team?.name}
                            cornerColor={corner}
                            size="md"
                          />
                          <span className="font-black text-white text-xs mt-1.5 truncate max-w-full">
                            {p.team?.name || 'TBD'}
                          </span>
                          {p.team?.robotName && (
                            <span className="text-[10px] text-slate-300 font-mono truncate max-w-full mt-0.5">
                              {p.team?.robotName}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                  {/* Corner 1 (Red) */}
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-0">
                    <div className="absolute top-0 inset-x-0 h-1 bg-red-500 rounded-t-xl" />
                    <TeamAvatar
                      logoUrl={liveMatch.participants[0]?.team?.logoUrl}
                      name={liveMatch.participants[0]?.team?.name}
                      cornerColor="red"
                      size="md"
                    />
                    <span className="font-black text-white text-xs mt-2 truncate max-w-full">
                      {liveMatch.participants[0]?.team?.name || 'TBD'}
                    </span>
                    {liveMatch.participants[0]?.team?.robotName && (
                      <span className="text-[10px] text-red-300 font-mono truncate max-w-full mt-0.5">
                        {liveMatch.participants[0]?.team?.robotName}
                      </span>
                    )}
                  </div>

                  {/* VS Badge */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#080d18] border border-white/20 flex items-center justify-center font-black font-mono text-[10px] sm:text-xs text-slate-300 shadow-md">
                      VS
                    </div>
                  </div>

                  {/* Corner 2 (Blue) */}
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-0">
                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-500 rounded-t-xl" />
                    <TeamAvatar
                      logoUrl={liveMatch.participants[1]?.team?.logoUrl}
                      name={liveMatch.participants[1]?.team?.name}
                      cornerColor="blue"
                      size="md"
                    />
                    <span className="font-black text-white text-xs mt-2 truncate max-w-full">
                      {liveMatch.participants[1]?.team?.name || 'TBD'}
                    </span>
                    {liveMatch.participants[1]?.team?.robotName && (
                      <span className="text-[10px] text-blue-300 font-mono truncate max-w-full mt-0.5">
                        {liveMatch.participants[1]?.team?.robotName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Live Match Controls */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRevertMatch(liveMatch.id)}
                  disabled={loading}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                  title="Stop arena fight and revert to scheduled"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>End Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => openMatchControl(liveMatch)}
                  disabled={loading}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Set Winner</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 my-auto">
              <Swords className="w-7 h-7 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-white text-xs">Arena Cage On Standby</p>
              <p className="text-[11px] text-slate-500 mt-0.5">No duel currently in progress. Click &quot;Set Live&quot; on any ready scheduled match below.</p>
            </div>
          )}
        </div>

        {/* UP NEXT MATCH SPOTLIGHT CARD */}
        <div className="rounded-2xl border border-white/10 bg-[#0c111b] p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">
                UP NEXT IN ARENA
              </h3>
            </div>
            {upNextMatch && (
              <span className="text-xs font-bold text-slate-300">
                {upNextMatch.stageName || upNextMatch.stageType} • <span className="font-mono text-white font-black">#{upNextMatch.matchNumber}</span>
              </span>
            )}
          </div>

          {upNextMatch ? (
            <div className="space-y-4">
              {/* Face-off layout (supports both 2-team and 3-way matches) */}
              {upNextMatch.participants.length === 3 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
                  {upNextMatch.participants.map((p, idx) => {
                    const corner = idx === 0 ? 'red' : idx === 1 ? 'blue' : 'green';
                    const cornerBg = idx === 0 ? 'bg-red-500/70' : idx === 1 ? 'bg-blue-500/70' : 'bg-emerald-500/70';
                    return (
                      <React.Fragment key={p.id || idx}>
                        {idx > 0 && (
                          <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-[#080d18] border border-white/20 text-[10px] font-mono font-black text-slate-400 shadow-sm">
                            VS
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-[100px] flex-1">
                          <div className={`absolute top-0 inset-x-0 h-1 ${cornerBg} rounded-t-xl`} />
                          <TeamAvatar
                            logoUrl={p.team?.logoUrl}
                            name={p.team?.name}
                            cornerColor={corner}
                            size="md"
                          />
                          <span className="font-black text-white text-xs mt-1.5 truncate max-w-full">
                            {p.team?.name || 'TBD'}
                          </span>
                          {p.team?.robotName && (
                            <span className="text-[10px] text-slate-300 font-mono truncate max-w-full mt-0.5">
                              {p.team?.robotName}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                  {/* Corner 1 */}
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-0">
                    <div className="absolute top-0 inset-x-0 h-1 bg-red-500/70 rounded-t-xl" />
                    <TeamAvatar
                      logoUrl={upNextMatch.participants[0]?.team?.logoUrl}
                      name={upNextMatch.participants[0]?.team?.name}
                      cornerColor="red"
                      size="md"
                    />
                    <span className="font-black text-white text-xs mt-2 truncate max-w-full">
                      {upNextMatch.participants[0]?.team?.name || 'TBD'}
                    </span>
                    {upNextMatch.participants[0]?.team?.robotName && (
                      <span className="text-[10px] text-red-300 font-mono truncate max-w-full mt-0.5">
                        {upNextMatch.participants[0]?.team?.robotName}
                      </span>
                    )}
                  </div>

                  {/* VS Badge */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#080d18] border border-white/20 flex items-center justify-center font-black font-mono text-[10px] sm:text-xs text-slate-300 shadow-md">
                      VS
                    </div>
                  </div>

                  {/* Corner 2 */}
                  <div className="flex flex-col items-center text-center p-3 rounded-xl bg-[#080d18]/80 border border-white/5 relative min-w-0">
                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-500/70 rounded-t-xl" />
                    <TeamAvatar
                      logoUrl={upNextMatch.participants[1]?.team?.logoUrl}
                      name={upNextMatch.participants[1]?.team?.name}
                      cornerColor="blue"
                      size="md"
                    />
                    <span className="font-black text-white text-xs mt-2 truncate max-w-full">
                      {upNextMatch.participants[1]?.team?.name || 'TBD'}
                    </span>
                    {upNextMatch.participants[1]?.team?.robotName && (
                      <span className="text-[10px] text-blue-300 font-mono truncate max-w-full mt-0.5">
                        {upNextMatch.participants[1]?.team?.robotName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Launch Match Controls */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartMatch(upNextMatch)}
                  disabled={loading}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch This Match as LIVE</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 my-auto">
              <Clock className="w-7 h-7 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-white text-xs">No Match On Deck</p>
              <p className="text-[11px] text-slate-500 mt-0.5">All remaining matches are either completed or awaiting slot billings.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage Selector Tabs */}
      {stages.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
          <button
            onClick={() => setSelectedStageFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedStageFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            All Stages ({matches.length})
          </button>
          {stages.map((stage) => {
            const count = matches.filter(m => m.stageId === stage.id).length;
            if (count === 0) return null;
            const isFilterActive = selectedStageFilter === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageFilter(stage.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isFilterActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{stage.displayName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isFilterActive ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
                {stage.status === 'ACTIVE' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl bg-slate-900/40">
            <Swords className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No matches found in this stage.</p>
            <p className="text-xs text-slate-500 mt-1">
              Select another stage or view All Stages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match) => {
              const isLive = match.status === 'LIVE';
              const isCompleted = match.status === 'COMPLETED';
              const isBye = match.status === 'BYE';
              const isWildcardMatch = match.stageType.toLowerCase().includes('wildcard');
              const canEditTeams = !isCompleted && !isBye && !isLive && !isWildcardMatch;

              return (
                <div
                  key={match.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isLive
                      ? 'bg-blue-950/30 border-blue-500 shadow-xl shadow-blue-950/40 ring-1 ring-blue-400/50'
                      : isCompleted
                      ? 'bg-slate-900/60 border-slate-700/60'
                      : isBye
                      ? 'bg-blue-950/20 border-blue-500/30'
                      : 'bg-slate-900/90 border-white/10'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 text-xs">
                    <span className="font-bold text-white">
                      {match.stageName || match.stageType} • #{match.matchNumber}
                    </span>
                    <div>
                      {isLive && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          LIVE IN ARENA
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          COMPLETED
                        </span>
                      )}
                      {isBye && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                          BYE
                        </span>
                      )}
                      {!isLive && !isCompleted && !isBye && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                          SCHEDULED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Combatants List */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
                      <span>Combatants</span>
                    </div>

                    {[1, 2].map((slotNumber) => {
                      const participant = match.participants.find(p => p.participantOrder === slotNumber);
                      const teamId = participant?.teamId;
                      const team = participant?.team || (teamId ? teams.find(t => t.id === teamId) : null);
                      const isWinner = isCompleted && teamId === match.winnerTeamId;

                      if (!teamId || !team) {
                        return (
                          <div
                            key={slotNumber}
                            className="h-9 px-3 rounded-xl border border-dashed border-white/10 bg-slate-950/20 text-slate-500 text-xs flex items-center gap-2 select-none"
                          >
                            <span className="text-[10px] text-slate-500 font-mono">{slotNumber}.</span>
                            <span>Waiting for progression</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slotNumber}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between transition-all select-none ${
                            isWinner
                              ? 'bg-blue-500/20 border border-blue-500/40 text-white font-bold'
                              : 'bg-slate-800/80 text-slate-300 border border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="text-[10px] text-slate-400 font-mono">{slotNumber}.</span>
                            <span className="truncate font-semibold">{team.name}</span>
                            {team.seed && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-blue-400 font-mono">
                                #{team.seed}
                              </span>
                            )}
                            {team.robotName && (
                              <span className="text-[10px] text-slate-400 font-mono truncate hidden sm:inline">
                                ({team.robotName})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isWinner && <Trophy className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    {!isCompleted && !isBye && (
                      <>
                        {isLive ? (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => handleRevertMatch(match.id)}
                              disabled={loading}
                              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                              title="End live fight and revert to scheduled"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                              <span>End Live</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openMatchControl(match)}
                              disabled={loading}
                              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span>Set Winner</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            {match.participants.length >= 2 && match.participants.every(p => Boolean(p.teamId)) ? (
                              <button
                                type="button"
                                onClick={() => handleStartMatch(match)}
                                disabled={loading}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition-all"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Set Live</span>
                              </button>
                            ) : (
                              <div className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800/40 text-slate-500 border border-white/5 flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Waiting for progression</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => openWinnerCorrection(match)}
                        disabled={loading}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-400/10 border border-blue-400/30 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Correct Winner</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Control Modal (Declare Winner - ONLY WHEN LIVE) */}
      {activeMatchForControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1628] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                <span>Declare Winner: #{activeMatchForControl.matchNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveMatchForControl(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetWinner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Winning Combatant:
                </label>
                <div className="space-y-2">
                  {activeMatchForControl.participants.map((p) => {
                    if (!p.teamId) return null;
                    const isSelected = selectedWinnerId === p.teamId;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedWinnerId(p.teamId!)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                            : 'bg-slate-900 border-white/10 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="winner"
                            checked={isSelected}
                            onChange={() => setSelectedWinnerId(p.teamId!)}
                            className="accent-blue-400"
                          />
                          <span>{p.team?.name || p.placeholderText}</span>
                        </div>

                        {/* Optional Score Input */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400">Score:</span>
                          <input
                            type="number"
                            min="0"
                            value={scores[p.id] !== undefined ? scores[p.id] : 0}
                            onChange={(e) => setScores({ ...scores, [p.id]: Number(e.target.value) })}
                            className="w-14 px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-xs font-mono text-center"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
                Confirming will mark this match as Completed and advance the winner in the tournament tree.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveMatchForControl(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedWinnerId}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Recording...' : 'Confirm Winner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Winner Correction Warning & Execution Modal */}
      {correctionTargetMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1628] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2 text-blue-400">
                <AlertTriangle className="w-5 h-5 text-blue-400" />
                <span>Winner Correction System</span>
              </h3>
              <button
                type="button"
                onClick={() => setCorrectionTargetMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are correcting the declared winner for <strong className="text-white">Match #{correctionTargetMatch.matchNumber}</strong> ({correctionTargetMatch.stageName || correctionTargetMatch.stageType}).
            </p>

            {/* Downstream Impact Alert */}
            {downstreamImpact && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                downstreamImpact.hasCompletedMatches
                  ? 'bg-blue-950/40 border-blue-500/60 text-blue-300'
                  : 'bg-blue-950/30 border-blue-500/40 text-blue-300'
              }`}>
                <h4 className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Downstream Impact Analysis</span>
                </h4>
                <p>{downstreamImpact.message}</p>
                {downstreamImpact.affectedMatches.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                    {downstreamImpact.affectedMatches.map((m) => (
                      <li key={m.matchId}>
                        Match #{m.matchNumber} ({m.stageType}) — Action: <span className="font-bold text-blue-400">{m.action}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Choose New Winner */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Select New True Winner:
              </label>
              {correctionTargetMatch.participants.map((p) => {
                if (!p.teamId) return null;
                const isCurrent = p.teamId === correctionTargetMatch.winnerTeamId;
                const isSelected = newCorrectedWinnerId === p.teamId;

                return (
                  <div
                    key={p.id}
                    onClick={() => setNewCorrectedWinnerId(p.teamId!)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-900 border-white/10 text-slate-300'
                    }`}
                  >
                    <span>{p.team?.name || p.placeholderText}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Current Recorded Winner
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCorrectionTargetMatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCorrection}
                disabled={loading || !newCorrectedWinnerId || newCorrectedWinnerId === correctionTargetMatch.winnerTeamId}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                {loading ? 'Applying Correction...' : 'Apply Safe Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
