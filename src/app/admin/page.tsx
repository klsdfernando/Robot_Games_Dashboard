'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTournament } from '@/context/TournamentContext';
import { 
  Shield, 
  Swords, 
  Flame, 
  Users, 
  Radio, 
  ArrowRight, 
  AlertTriangle, 
  Check, 
  Play, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { selectedCategory, overview, stages, matches, teams, refresh } = useTournament();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activeStage = stages.find(s => s.status === 'ACTIVE');
  const liveMatch = overview?.liveMatch;
  const isCompleted = overview?.isCompleted;

  const handleAdvanceStage = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`Are you sure you want to advance ${selectedCategory} to the next tournament stage?`)) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/stages/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance stage');

      setMsg({ text: `Advanced to ${data.nextStage}!`, type: 'success' });
      await refresh();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`Seed realistic demo teams for ${selectedCategory}? This will replace current teams in this category.`)) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed');

      setMsg({ text: `Successfully seeded ${data.count} demo combat teams!`, type: 'success' });
      await refresh();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetTournament = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`⚠️ DANGER: Reset all tournament matches and stages for ${selectedCategory}? Teams will remain but bracket history will be erased.`)) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');

      setMsg({ text: 'Tournament bracket reset successfully!', type: 'success' });
      await refresh();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Stage Status Hero Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
            {selectedCategory} Division Status
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            {overview?.currentStageDisplayName || 'Pre-Tournament Registration'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            {matches.length === 0
              ? 'No matches have been generated yet. Add your registered teams and generate Round 1 to start.'
              : `${overview?.completedMatchesCount || 0} of ${matches.length} matches completed in this division.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {matches.length === 0 ? (
            <Link
              href="/admin/bracket"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Generate Round 1</span>
            </Link>
          ) : (
            <>
              <Link
                href="/admin/matches"
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black flex items-center justify-center gap-2"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Match Console</span>
              </Link>

              {!isCompleted && (
                <button
                  onClick={handleAdvanceStage}
                  disabled={loading}
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Advance Stage</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Action Control Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/teams"
          className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-400/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Teams Registered</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-white">{teams.length}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Manage Rosters →</span>
        </Link>

        <Link
          href="/admin/matches"
          className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-400/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Total Matches</span>
            <Swords className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-black text-white">{matches.length}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Declare Winners →</span>
        </Link>

        <Link
          href="/admin/wildcard"
          className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-400/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Wildcard Pool</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl font-black text-amber-400">
            {teams.filter(t => t.status === 'WILDCARD').length}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Group Generator →</span>
        </Link>

        <Link
          href="/admin/bracket"
          className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-400/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Stages Configured</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-white">{stages.length}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Bracket Architecture →</span>
        </Link>
      </div>

      {/* Quick Utilities / Emergency Reset & Demo Data */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Tournament Organizer Utilities
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDemo}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Seed Realistic Demo Teams ({selectedCategory})</span>
          </button>

          <button
            onClick={handleResetTournament}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-500/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Division Tournament</span>
          </button>
        </div>
      </div>
    </div>
  );
}
