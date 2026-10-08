'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTournament } from '@/context/TournamentContext';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  AlertCircle, 
  Check, 
  X, 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  Image as ImageIcon,
  Loader2,
  Lock,
  Unlock,
  Swords,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Team } from '@/lib/types';

export default function AdminTeamsPage() {
  const { selectedCategory, overview, teams, refresh } = useTournament();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formSeed, setFormSeed] = useState<string>('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tournament Bracket Lock & Generation State
  const isLocked = Boolean(overview?.stages && overview.stages.length > 0);
  const activeTeams = teams.filter(t => !t.isWithdrawn);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [randomizePairings, setRandomizePairings] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount?: number;
    logosDownloadedCount?: number;
    warnings?: string[];
  } | null>(null);

  const handleConfirmRosterAndBuildBracket = async () => {
    if (!overview?.categoryId) return;
    setLoading(true);
    setError(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to confirm roster and build bracket');

      setSuccess(`Tournament confirmed! All teams are locked and full bracket slots generated.`);
      setIsConfirmModalOpen(false);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTournamentBracket = async () => {
    if (!overview?.categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: overview.categoryId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset tournament bracket');

      setSuccess(`Tournament bracket reset successfully. Team roster is now unlocked!`);
      setIsResetModalOpen(false);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormName('');
    setFormOrg('');
    setFormSeed('');
    setFormLogoUrl('');
    setFormNotes('');
    setError(null);
    setIsAdding(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormOrg(team.organization || '');
    setFormSeed(team.seed ? String(team.seed) : '');
    setFormLogoUrl(team.logoUrl || '');
    setFormNotes(team.notes || '');
    setError(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.categoryId) return;
    setError(null);
    setLoading(true);

    try {
      if (editingTeam) {
        // Update
        const res = await fetch(`/api/admin/teams/${editingTeam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            organization: formOrg,
            seed: formSeed ? Number(formSeed) : null,
            logoUrl: formLogoUrl,
            notes: formNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update team');
        setSuccess('Team updated successfully');
        setEditingTeam(null);
      } else {
        // Create
        const res = await fetch('/api/admin/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: overview.categoryId,
            name: formName,
            organization: formOrg,
            seed: formSeed ? Number(formSeed) : null,
            logoUrl: formLogoUrl,
            notes: formNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create team');
        setSuccess('Team created successfully');
        setIsAdding(false);
      }
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !overview?.categoryId) return;

    setImportLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('categoryId', overview.categoryId);

      const res = await fetch('/api/admin/teams/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import teams');

      setImportResult({
        importedCount: data.importedCount,
        logosDownloadedCount: data.logosDownloadedCount,
        warnings: data.warnings
      });

      setSuccess(`Successfully imported ${data.importedCount} team(s)! ${data.logosDownloadedCount} logo(s) downloaded and stored.`);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete ${team.name}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete team');

      setSuccess(`Deleted ${team.name}`);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWithdrawn = async (team: Team) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWithdrawn: !team.isWithdrawn })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">
              Team Management ({selectedCategory})
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register teams manually or bulk-import via Excel with Google Drive logo links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Download Template Button */}
          <a
            href="/api/admin/teams/template"
            download="teams_template.xlsx"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors shadow-sm"
            title="Download blank Excel spreadsheet template with 2 columns"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Excel Template</span>
          </a>

          {/* Import Excel Button */}
          <button
            onClick={() => {
              if (isLocked) {
                alert('Tournament roster is currently locked. Reset the bracket below if you need to import or modify teams.');
                return;
              }
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isLocked
                ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white shadow-lg shadow-blue-950/30'
            }`}
            title={isLocked ? 'Roster is locked because the tournament bracket is active' : 'Import teams via Excel'}
          >
            {isLocked ? <Lock className="w-4 h-4 text-slate-500" /> : <FileSpreadsheet className="w-4 h-4 text-white" />}
            <span>Import Teams by Excel</span>
          </button>

          {/* Register New Team */}
          <button
            onClick={() => {
              if (isLocked) {
                alert('Tournament roster is currently locked. Reset the bracket below if you need to add new teams.');
                return;
              }
              openAddModal();
            }}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              isLocked
                ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                : 'bg-blue-500 hover:bg-blue-400 text-black shadow-lg shadow-blue-500/20'
            }`}
            title={isLocked ? 'Roster is locked because the tournament bracket is active' : 'Add new team'}
          >
            {isLocked ? <Lock className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4" />}
            <span>Add Team</span>
          </button>
        </div>
      </div>

      {/* Roster Status & Bracket Generator Hero Banner */}
      {isLocked ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-blue-950/30 border border-blue-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  TOURNAMENT ROSTER LOCKED ({teams.length} Teams)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  BRACKET SLOTS ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Tournament tree architecture is generated and active. As matches are completed in the arena, winners advance and wildcard losers automatically bill downstream slots.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Link
              href="/control-7v9k2m4q/bracket"
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Swords className="w-4 h-4" />
              <span>View Bracket Tree</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-blue-950/60 hover:text-blue-400 text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5"
              title="Reset Bracket to make changes to roster"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset & Unlock</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-blue-950/20 border border-blue-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  ROSTER PENDING CONFIRMATION ({teams.length} Teams Registered)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  UNLOCKED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Upload or edit all {selectedCategory} teams. Once finalized, confirm the roster to lock teams and automatically generate the complete tournament bracket tree with live slot advancement.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={activeTeams.length < 2 || loading}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-black shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CONFIRM ROSTER & GENERATE BRACKET</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Teams Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
            <tr>
              <th className="py-3 px-4">Seed</th>
              <th className="py-3 px-4">Logo</th>
              <th className="py-3 px-4">Team Name</th>
              <th className="py-3 px-4">Faculty / Org</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No teams registered for this category yet. Click &quot;Import Teams by Excel&quot; or &quot;Add Team&quot; above.
                </td>
              </tr>
            ) : (
              teams.map((team, idx) => (
                <tr key={team.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">
                    {team.seed ? `#${team.seed}` : idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {team.name}
                    {team.isWithdrawn && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        WITHDRAWN
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {team.organization || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {team.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleWithdrawn(team)}
                        title={team.isWithdrawn ? 'Reinstate Team' : 'Mark Withdrawn'}
                        className={`p-1.5 rounded-lg text-xs font-semibold ${
                          team.isWithdrawn
                            ? 'text-blue-400 hover:bg-blue-500/10'
                            : 'text-blue-400 hover:bg-blue-500/10'
                        }`}
                      >
                        {team.isWithdrawn ? 'Reinstate' : 'Withdraw'}
                      </button>

                      <button
                        onClick={() => openEditModal(team)}
                        title="Edit Team"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {isLocked ? (
                        <button
                          disabled
                          title="Cannot delete team while tournament is locked. Reset bracket to unlock."
                          className="p-1.5 rounded-lg text-slate-600 cursor-not-allowed opacity-50"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          title="Delete Team"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add / Edit Team */}
      {(isAdding || editingTeam) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1628] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingTeam ? `Edit ${editingTeam.name}` : `Register New Team (${selectedCategory})`}
              </h3>
              <button
                onClick={() => { setIsAdding(false); setEditingTeam(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Chronos Dynamics"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Logo (Google Drive Link or URL)
                </label>
                <input
                  type="text"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  placeholder="e.g. https://drive.google.com/file/d/... or /uploads/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports Google Drive share links, direct image URLs, or local paths.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Faculty / University Department
                </label>
                <input
                  type="text"
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  placeholder="e.g. Faculty of Engineering"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Seed Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formSeed}
                    onChange={(e) => setFormSeed(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCategory}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/5 text-slate-400 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingTeam(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors"
                >
                  {loading ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Excel Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1628] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  Import Teams via Excel
                </h3>
              </div>
              <button
                onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportResult(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-950/30 border border-blue-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Excel Format Instructions
                </p>
                <p>The spreadsheet must contain the following 2 columns:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 font-mono text-[11px]">
                  <li><span className="text-white font-semibold">Column 1:</span> Team Name</li>
                  <li><span className="text-white font-semibold">Column 2:</span> Team Logo Drive Link</li>
                </ul>
                <p className="text-[11px] text-slate-400">
                  Logo images from Google Drive links will be automatically downloaded and stored locally for fast, offline-ready display.
                </p>
                <div className="pt-1">
                  <a
                    href="/api/admin/teams/template"
                    download="teams_template.xlsx"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample Excel Template
                  </a>
                </div>
              </div>

              <form onSubmit={handleImportExcel} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Upload Spreadsheet (.xlsx, .xls, .csv)
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer bg-slate-900/40 transition-colors">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-200">
                      {importFile ? importFile.name : 'Click to select or drag and drop spreadsheet'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Supports Excel (.xlsx, .xls) and CSV'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                          setImportResult(null);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {importResult && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs space-y-1.5">
                    <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Import Complete
                    </div>
                    <p className="text-slate-300">
                      Imported/updated <strong>{importResult.importedCount}</strong> team(s).
                    </p>
                    <p className="text-slate-300">
                      Downloaded & saved <strong>{importResult.logosDownloadedCount}</strong> team logo(s) locally.
                    </p>
                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <div className="pt-1 text-[11px] text-blue-300 space-y-0.5">
                        <div className="font-semibold">Notes:</div>
                        {importResult.warnings.map((w, idx) => (
                          <div key={idx}>• {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportResult(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || importLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-black transition-colors"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing & Downloading Logos...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        Upload & Import
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Confirm Roster & Build Bracket */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0e1628] border border-blue-500/40 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Confirm Roster & Lock Bracket
                  </h3>
                  <p className="text-xs text-blue-400/90 font-medium">
                    {selectedCategory} Division • {activeTeams.length} Active Teams
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-2 text-slate-300">
              <p className="font-bold text-blue-300">
                What happens when you confirm:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-300">
                <li><strong className="text-white">Roster Lock:</strong> All {activeTeams.length} teams will be locked into the tournament bracket.</li>
                <li><strong className="text-white">Full Bracket Tree:</strong> The complete tournament tree (Round 1, Wildcards, Semifinals, Winners Final, Wildcard Final, and Grand Finals) is generated instantly with designated placeholder slots.</li>
                <li><strong className="text-white">Automatic Advancement:</strong> As matches finish in the arena, winning and losing teams will automatically bill downstream positions in real time.</li>
                <li><strong className="text-white">Cloud Sync:</strong> All bracket architecture will immediately sync to Supabase for live spectator viewing.</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
              <input
                id="randomizePairings"
                type="checkbox"
                checked={randomizePairings}
                onChange={(e) => setRandomizePairings(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 focus:ring-0 accent-blue-500 cursor-pointer"
              />
              <label htmlFor="randomizePairings" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-semibold text-white block">Shuffle / Randomize Matchup Order</span>
                <span className="text-[11px] text-slate-400">If unchecked, teams will follow their numbered seeds / input order.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRosterAndBuildBracket}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Locking & Generating Slots...</span>
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
        </div>
      )}

      {/* Modal for Reset Bracket & Unlock Teams */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0e1628] border border-blue-500/40 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Reset Bracket & Unlock Roster
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
                This will delete all matches, stages, and combat records for {selectedCategory}. Teams will be reset to ACTIVE status and unlocked so you can add, import, or remove teams freely.
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
                    <span>Yes, Reset Bracket & Unlock</span>
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
