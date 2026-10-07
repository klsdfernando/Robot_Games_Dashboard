'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Settings, Save, AlertTriangle, RotateCcw, Sparkles, Check, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  const { selectedCategory, overview, refresh } = useTournament();
  const [wildcardRule, setWildcardRule] = useState<'MANUAL' | 'ELIMINATE' | 'AWARD_BYE'>('MANUAL');
  const [autoProgress, setAutoProgress] = useState(false);
  const [allowManualPairings, setAllowManualPairings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!overview?.categoryId) return;
    async function loadSettings() {
      try {
        const res = await fetch(`/api/admin/settings?categoryId=${overview?.categoryId}`);
        const data = await res.json();
        if (data.settings) {
          setWildcardRule(data.settings.wildcard_single_team_rule || 'MANUAL');
          setAutoProgress(Boolean(data.settings.auto_progress_stages));
          setAllowManualPairings(Boolean(data.settings.allow_manual_pairings));
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
      }
    }
    loadSettings();
  }, [overview?.categoryId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.categoryId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: overview.categoryId,
          wildcardSingleTeamRule: wildcardRule,
          autoProgressStages: autoProgress,
          allowManualPairings: allowManualPairings
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setSuccess('Tournament settings saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`⚠️ DANGER: Reset all tournament matches and stages for ${selectedCategory}? Teams will remain but bracket history will be erased.`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');

      setSuccess('Tournament bracket reset successfully!');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!overview?.categoryId) return;
    if (!confirm(`Seed realistic demo combat teams for ${selectedCategory}?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed');

      setSuccess(`Successfully seeded ${data.count} demo combat teams!`);
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
      <div className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white">
            Tournament Settings & Rules ({selectedCategory})
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure progression rules, wildcard oddities, and administrative options.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Wildcard Rule Setting */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Wildcard Single Participant Rule</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Special Case
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Defines the policy when only exactly 1 team ends up in the Wildcard pool:
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="radio"
                name="wildcardRule"
                value="MANUAL"
                checked={wildcardRule === 'MANUAL'}
                onChange={() => setWildcardRule('MANUAL')}
                className="mt-0.5 accent-amber-400"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Require Manual Admin Resolution (Default & Recommended)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Do not advance automatically. The system alerts the admin to decide whether to award a BYE or eliminate.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="radio"
                name="wildcardRule"
                value="ELIMINATE"
                checked={wildcardRule === 'ELIMINATE'}
                onChange={() => setWildcardRule('ELIMINATE')}
                className="mt-0.5 accent-amber-400"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Automatic Elimination (Strict Combat Rule)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Eliminate team because no combatant opponent exists to earn a second-chance victory.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="radio"
                name="wildcardRule"
                value="AWARD_BYE"
                checked={wildcardRule === 'AWARD_BYE'}
                onChange={() => setWildcardRule('AWARD_BYE')}
                className="mt-0.5 accent-amber-400"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Award Wildcard BYE
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Automatically pass the solo team directly to the Re-entry stage without fighting.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Pairing Preferences */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white">General Tournament Automation</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={allowManualPairings}
                onChange={(e) => setAllowManualPairings(e.target.checked)}
                className="accent-amber-400 w-4 h-4 rounded"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Allow Manual Seed Pairings & Custom BYE selection
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Enables organizers to hand-pick Round 1 matchups and select who gets the BYE.
                </span>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </form>

      {/* Database & Management Actions */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 pt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>Database & Maintenance</span>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Seed Realistic Combat Teams</span>
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Division Tournament</span>
          </button>
        </div>
      </div>
    </div>
  );
}
