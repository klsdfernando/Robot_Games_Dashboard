'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { Team } from '@/lib/types';

export default function AdminTeamsPage() {
  const { selectedCategory, overview, teams, refresh } = useTournament();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRobotName, setFormRobotName] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formSeed, setFormSeed] = useState<string>('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount?: number;
    logosDownloadedCount?: number;
    warnings?: string[];
  } | null>(null);

  const openAddModal = () => {
    setFormName('');
    setFormRobotName('');
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
    setFormRobotName(team.robotName || '');
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
            robotName: formRobotName,
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
            robotName: formRobotName,
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
            <Users className="w-5 h-5 text-amber-400" />
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
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Excel Template</span>
          </a>

          {/* Import Excel Button */}
          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/30 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Import Teams by Excel</span>
          </button>

          {/* Register New Team */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
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
              <th className="py-3 px-4">Robot Name</th>
              <th className="py-3 px-4">Faculty / Org</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
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
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        WITHDRAWN
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sky-400 font-medium">
                    {team.robotName || '—'}
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
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-amber-400 hover:bg-amber-500/10'
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

                      <button
                        onClick={() => handleDeleteTeam(team)}
                        title="Delete Team"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports Google Drive share links, direct image URLs, or local paths.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Robot Name
                </label>
                <input
                  type="text"
                  value={formRobotName}
                  onChange={(e) => setFormRobotName(e.target.value)}
                  placeholder="e.g. Doomsday 9000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
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
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
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
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
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
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer bg-slate-900/40 transition-colors">
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
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1.5">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Import Complete
                    </div>
                    <p className="text-slate-300">
                      Imported/updated <strong>{importResult.importedCount}</strong> team(s).
                    </p>
                    <p className="text-slate-300">
                      Downloaded & saved <strong>{importResult.logosDownloadedCount}</strong> team logo(s) locally.
                    </p>
                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <div className="pt-1 text-[11px] text-amber-300 space-y-0.5">
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
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black transition-colors"
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
    </div>
  );
}
