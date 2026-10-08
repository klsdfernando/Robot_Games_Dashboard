'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flag, 
  Timer, 
  Clock, 
  Play, 
  CheckCircle2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  Printer, 
  Zap, 
  Award, 
  AlertCircle, 
  X, 
  Check, 
  Loader2, 
  Trophy, 
  Medal, 
  Calendar, 
  Layers, 
  ArrowRight,
  Users,
  GraduationCap,
  Building2,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Database,
  RefreshCw
} from 'lucide-react';
import { RaceScheduleSlot, RaceSlotStatus, Team, RaceCategoryDivision } from '@/lib/types';

export default function AdminRobotRacePage() {
  const [schedule, setSchedule] = useState<RaceScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active section tab: 'TEAMS' | 'SCHEDULE' | 'LEADERBOARD'
  const [activeSection, setActiveSection] = useState<'TEAMS' | 'SCHEDULE' | 'LEADERBOARD'>('TEAMS');

  // Division filters
  const [teamDivisionFilter, setTeamDivisionFilter] = useState<'ALL' | 'SCHOOL' | 'UNIVERSITY'>('ALL');
  const [scheduleDivisionFilter, setScheduleDivisionFilter] = useState<'ALL' | 'SCHOOL' | 'UNIVERSITY'>('ALL');
  const [leaderboardDivisionFilter, setLeaderboardDivisionFilter] = useState<'ALL' | 'SCHOOL' | 'UNIVERSITY'>('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Real-time clock
  const [currentTime, setCurrentTime] = useState<string>('');

  // Modals state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseInfo, setSupabaseInfo] = useState<{
    configured: boolean;
    url?: string;
    status: string;
    message?: string;
    tablesFound?: string[];
  } | null>(null);
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);

  // Race Teams state
  const [raceTeams, setRaceTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Form states for Add / Edit Team
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormCategory, setTeamFormCategory] = useState<'SCHOOL' | 'UNIVERSITY'>('SCHOOL');
  const [teamFormDriveLink, setTeamFormDriveLink] = useState('');
  const [teamFormRobotName, setTeamFormRobotName] = useState('');
  const [teamFormOrg, setTeamFormOrg] = useState('');
  const [teamFormNotes, setTeamFormNotes] = useState('');
  const [teamFormLoading, setTeamFormLoading] = useState(false);

  // Form states for Generate Schedule
  const [genStartTime, setGenStartTime] = useState('09:30 AM');
  const [genInterval, setGenInterval] = useState('10');
  const [genTrack, setGenTrack] = useState('Track 1');
  const [genDivision, setGenDivision] = useState<'ALL' | 'SCHOOL' | 'UNIVERSITY'>('ALL');
  const [genRandomize, setGenRandomize] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  // Form states for Add / Edit Slot
  const [editingSlot, setEditingSlot] = useState<RaceScheduleSlot | null>(null);
  const [slotTeamName, setSlotTeamName] = useState('');
  const [slotRobotName, setSlotRobotName] = useState('');
  const [slotOrg, setSlotOrg] = useState('');
  const [slotCategoryDivision, setSlotCategoryDivision] = useState<'SCHOOL' | 'UNIVERSITY'>('SCHOOL');
  const [slotTime, setSlotTime] = useState('09:30 AM');
  const [slotStatus, setSlotStatus] = useState<RaceSlotStatus>('SCHEDULED');
  const [slotLogoUrl, setSlotLogoUrl] = useState('');
  const [slotTrack, setSlotTrack] = useState('Track 1');
  const [slotNotes, setSlotNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Form states for Record / Edit Score (Leaderboard)
  const [targetScoreSlot, setTargetScoreSlot] = useState<RaceScheduleSlot | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [scoreTimeInput, setScoreTimeInput] = useState('');
  const [scoreStatusInput, setScoreStatusInput] = useState<RaceSlotStatus>('COMPLETED');
  const [scoreSaveLoading, setScoreSaveLoading] = useState(false);

  // Excel import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDivision, setImportDivision] = useState<'SCHOOL' | 'UNIVERSITY'>('SCHOOL');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch teams
  const fetchRaceTeams = async () => {
    try {
      setTeamsLoading(true);
      const res = await fetch('/api/admin/race/teams');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load race teams');
      setRaceTeams(data.teams || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Fetch schedule
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/race/schedule');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load race schedule');
      setSchedule(data.schedule || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Supabase status
  const checkSupabaseStatus = async () => {
    try {
      const res = await fetch('/api/admin/supabase');
      const data = await res.json();
      setSupabaseInfo(data);
    } catch {
      // ignore
    }
  };

  const handleSyncSupabase = async () => {
    setSupabaseSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync to Supabase');
      setSuccess(data.message || 'Successfully synced data to Supabase cloud database!');
      await checkSupabaseStatus();
    } catch (err: any) {
      setError(err.message || 'Supabase sync failed');
    } finally {
      setSupabaseSyncing(false);
    }
  };

  useEffect(() => {
    fetchRaceTeams();
    fetchSchedule();
    checkSupabaseStatus();
  }, []);

  // Derived teams
  const schoolTeams = useMemo(() => {
    return raceTeams.filter(t => t.raceCategory === 'SCHOOL');
  }, [raceTeams]);

  const universityTeams = useMemo(() => {
    return raceTeams.filter(t => t.raceCategory === 'UNIVERSITY');
  }, [raceTeams]);

  const filteredTeams = useMemo(() => {
    return raceTeams.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.organization && t.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDivision = teamDivisionFilter === 'ALL' || t.raceCategory === teamDivisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [raceTeams, searchQuery, teamDivisionFilter]);

  // Time Schedule: Filtered list (strictly departure times and teams)
  const filteredSchedule = useMemo(() => {
    return schedule.filter(slot => {
      const matchesSearch = 
        slot.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (slot.organization && slot.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
        slot.scheduledTime.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || slot.status === statusFilter;
      const matchesDivision = scheduleDivisionFilter === 'ALL' || slot.categoryDivision === scheduleDivisionFilter;

      return matchesSearch && matchesStatus && matchesDivision;
    });
  }, [schedule, searchQuery, statusFilter, scheduleDivisionFilter]);

  // Leaderboard Helper: Parse time string to seconds
  const parseTimeToSeconds = (val?: string | null): number => {
    if (!val) return Infinity;
    const clean = val.replace(/s/gi, '').trim();
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const mins = parseFloat(parts[0]) || 0;
      const secs = parseFloat(parts[1]) || 0;
      return mins * 60 + secs;
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? Infinity : parsed;
  };

  // Leaderboard: Ranked entries sorted by fastest recorded time / highest score
  const leaderboardEntries = useMemo(() => {
    const valid = schedule.filter(s => {
      const matchesSearch = 
        s.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.organization && s.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDivision = leaderboardDivisionFilter === 'ALL' || s.categoryDivision === leaderboardDivisionFilter;

      return matchesSearch && matchesDivision;
    });

    return [...valid].sort((a, b) => {
      const hasTimeA = Boolean(a.timeRecorded) || (a.score !== null && a.score !== undefined);
      const hasTimeB = Boolean(b.timeRecorded) || (b.score !== null && b.score !== undefined);

      if (hasTimeA && !hasTimeB) return -1;
      if (!hasTimeA && hasTimeB) return 1;

      if (a.timeRecorded && b.timeRecorded) {
        return parseTimeToSeconds(a.timeRecorded) - parseTimeToSeconds(b.timeRecorded);
      }

      if (a.score !== null && a.score !== undefined && b.score !== null && b.score !== undefined) {
        return b.score - a.score;
      }

      return a.slotNumber - b.slotNumber;
    });
  }, [schedule, searchQuery, leaderboardDivisionFilter]);

  // Leader time for delta calculation
  const leaderSeconds = useMemo(() => {
    const firstWithTime = leaderboardEntries.find(e => e.timeRecorded);
    return firstWithTime ? parseTimeToSeconds(firstWithTime.timeRecorded) : null;
  }, [leaderboardEntries]);

  // Derived statistics for schedule
  const scheduleStats = useMemo(() => {
    const total = schedule.length;
    const scheduled = schedule.filter(s => s.status === 'SCHEDULED').length;
    const completed = schedule.filter(s => s.status === 'COMPLETED').length;
    const firstTime = schedule[0]?.scheduledTime || '—';
    const lastTime = schedule[schedule.length - 1]?.scheduledTime || '—';
    return { total, scheduled, completed, firstTime, lastTime };
  }, [schedule]);

  const upNext = useMemo(() => {
    return schedule.find(s => s.status === 'SCHEDULED') || null;
  }, [schedule]);

  // Top 3 Podium
  const podium = useMemo(() => {
    const finishedRacers = leaderboardEntries.filter(e => e.timeRecorded || (e.score !== null && e.score !== undefined));
    return {
      first: finishedRacers[0] || null,
      second: finishedRacers[1] || null,
      third: finishedRacers[2] || null
    };
  }, [leaderboardEntries]);

  // --------------------------------------------------------------------------
  // Handlers for Race Teams (School vs University)
  // --------------------------------------------------------------------------
  const handleOpenAddTeamModal = (category: 'SCHOOL' | 'UNIVERSITY' = 'SCHOOL') => {
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormCategory(category);
    setTeamFormDriveLink('');
    setTeamFormRobotName('');
    setTeamFormOrg('');
    setTeamFormNotes('');
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = (team: Team) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormCategory(team.raceCategory === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL');
    setTeamFormDriveLink(team.logoUrl?.startsWith('http') ? team.logoUrl : '');
    setTeamFormRobotName(team.robotName || '');
    setTeamFormOrg(team.organization || '');
    setTeamFormNotes(team.notes || '');
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      setTeamFormLoading(true);
      setError(null);

      if (editingTeam) {
        const res = await fetch(`/api/admin/race/teams/${editingTeam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamFormName,
            categoryDivision: teamFormCategory,
            driveLink: teamFormDriveLink,
            robotName: teamFormRobotName,
            organization: teamFormOrg,
            notes: teamFormNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update team');
        setSuccess(`Team "${teamFormName}" updated successfully!`);
      } else {
        const res = await fetch('/api/admin/race/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamFormName,
            categoryDivision: teamFormCategory,
            driveLink: teamFormDriveLink,
            robotName: teamFormRobotName,
            organization: teamFormOrg,
            notes: teamFormNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register team');
        setSuccess(`Registered "${teamFormName}" in ${teamFormCategory === 'SCHOOL' ? 'School Category' : 'University Category'}! Logo URL saved to database.`);
      }

      setIsTeamModalOpen(false);
      setEditingTeam(null);
      await fetchRaceTeams();
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message || 'Error saving team');
    } finally {
      setTeamFormLoading(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete team "${team.name}"? This will also remove any schedule slots for this team.`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/race/teams/${team.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete team');
      }
      setSuccess(`Team "${team.name}" removed.`);
      await fetchRaceTeams();
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message || 'Error deleting team');
    }
  };

  const handleClearTeams = async (division: 'ALL' | 'SCHOOL' | 'UNIVERSITY' = 'ALL') => {
    const label = division === 'ALL' ? 'ALL race teams' : `all ${division} category teams`;
    if (!confirm(`⚠️ Are you sure you want to delete ${label}? This will remove them completely and unschedule any runs.`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/race/teams?division=${division}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clear teams');
      }
      const data = await res.json();
      setSuccess(data.message || 'Teams cleared.');
      await fetchRaceTeams();
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message || 'Error clearing teams');
    }
  };

  const handleQuickAddToSchedule = async (team: Team) => {
    try {
      setError(null);
      // Calculate next departure time based on last slot
      let nextTime = '09:30 AM';
      if (schedule.length > 0) {
        const lastSlot = schedule[schedule.length - 1];
        const parts = lastSlot.scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (parts) {
          let h = parseInt(parts[1], 10);
          let m = parseInt(parts[2], 10);
          const period = parts[3].toUpperCase();
          if (period === 'PM' && h < 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          let totalMins = h * 60 + m + 10;
          let newH = Math.floor(totalMins / 60) % 24;
          let newM = totalMins % 60;
          let newPeriod = newH >= 12 ? 'PM' : 'AM';
          let dispH = newH % 12;
          if (dispH === 0) dispH = 12;
          nextTime = `${dispH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')} ${newPeriod}`;
        }
      }

      const res = await fetch('/api/race/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          teamName: team.name,
          robotName: team.robotName,
          organization: team.organization,
          logoUrl: team.logoUrl,
          categoryDivision: team.raceCategory || 'SCHOOL',
          scheduledTime: nextTime
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add slot');
      setSuccess(`Added "${team.name}" to departure schedule at ${nextTime}!`);
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message || 'Error scheduling team');
    }
  };

  // --------------------------------------------------------------------------
  // Handlers for Schedule & Leaderboard
  // --------------------------------------------------------------------------
  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/race/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: genStartTime,
          intervalMinutes: Number(genInterval),
          track: genTrack,
          randomize: genRandomize,
          categoryDivision: genDivision
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate schedule');
      setSchedule(data.schedule || []);
      setSuccess(`Generated departure schedule for ${data.schedule?.length || 0} competitors!`);
      setIsGenerateModalOpen(false);
      await fetchRaceTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleOpenAddSlotModal = () => {
    setEditingSlot(null);
    setSlotTeamName('');
    setSlotRobotName('');
    setSlotOrg('');
    setSlotCategoryDivision('SCHOOL');
    setSlotTime('09:30 AM');
    setSlotStatus('SCHEDULED');
    setSlotLogoUrl('');
    setSlotTrack('Track 1');
    setSlotNotes('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditSlot = (slot: RaceScheduleSlot) => {
    setEditingSlot(slot);
    setSlotTeamName(slot.teamName);
    setSlotRobotName(slot.robotName || '');
    setSlotOrg(slot.organization || '');
    setSlotCategoryDivision(slot.categoryDivision === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL');
    setSlotTime(slot.scheduledTime);
    setSlotStatus(slot.status);
    setSlotLogoUrl(slot.logoUrl || '');
    setSlotTrack(slot.track || 'Track 1');
    setSlotNotes(slot.notes || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTeamName.trim() || !slotTime.trim()) {
      setError('Team name and departure time are required');
      return;
    }

    setSaveLoading(true);
    setError(null);
    try {
      if (editingSlot) {
        const res = await fetch(`/api/race/schedule/${editingSlot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: slotTeamName,
            robotName: slotRobotName,
            organization: slotOrg,
            categoryDivision: slotCategoryDivision,
            scheduledTime: slotTime,
            status: slotStatus,
            logoUrl: slotLogoUrl,
            track: slotTrack,
            notes: slotNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update slot');
        setSuccess('Departure slot updated successfully');
      } else {
        const res = await fetch('/api/race/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: slotTeamName,
            robotName: slotRobotName,
            organization: slotOrg,
            categoryDivision: slotCategoryDivision,
            scheduledTime: slotTime,
            status: slotStatus,
            logoUrl: slotLogoUrl,
            track: slotTrack,
            notes: slotNotes
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create slot');
        setSuccess('New departure slot created successfully');
      }
      setIsAddEditModalOpen(false);
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled slot?')) return;
    try {
      const res = await fetch(`/api/race/schedule/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete slot');
      }
      setSuccess('Slot removed successfully');
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClearSchedule = async () => {
    if (!confirm('Are you sure you want to clear the entire race schedule?')) return;
    try {
      const res = await fetch('/api/race/schedule', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear schedule');
      setSuccess('Race schedule cleared');
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetStatus = async (slot: RaceScheduleSlot, newStatus: RaceSlotStatus) => {
    try {
      const res = await fetch(`/api/race/schedule/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenScoreModal = (slot: RaceScheduleSlot) => {
    setTargetScoreSlot(slot);
    setScoreInput(slot.score !== null && slot.score !== undefined ? String(slot.score) : '');
    setScoreTimeInput(slot.timeRecorded || '');
    setScoreStatusInput(slot.status || 'COMPLETED');
    setIsScoreModalOpen(true);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetScoreSlot) return;

    setScoreSaveLoading(true);
    setError(null);
    try {
      const scoreVal = scoreInput.trim() ? parseFloat(scoreInput) : null;
      const res = await fetch(`/api/race/schedule/${targetScoreSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: scoreVal,
          timeRecorded: scoreTimeInput.trim() || null,
          status: scoreStatusInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update score');
      setSuccess(`Recorded score & lap time for ${targetScoreSlot.teamName}!`);
      setIsScoreModalOpen(false);
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScoreSaveLoading(false);
    }
  };

  // Excel Import Handler
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setImportLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const categoryId = importDivision === 'UNIVERSITY' ? 'cat-race-university' : 'cat-race-school';
      formData.append('categoryId', categoryId);

      const res = await fetch('/api/admin/teams/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import race teams');

      setImportResult(data);
      setSuccess(`Successfully imported ${data.importedCount} teams into ${importDivision === 'UNIVERSITY' ? 'University Category' : 'School Category'}! Downloading logos...`);

      // Refresh teams & schedule
      await fetchRaceTeams();
      await fetchSchedule();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Section Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ORGANIZER CONTROL PANEL
            </span>
            {currentTime && (
              <span className="text-xs font-mono text-slate-400">
                • {currentTime}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>ROBOT RACE MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Register teams (School & University categories), manage departure time schedules, and record verified lap times.
          </p>
        </div>

        {/* 3 Main Action Section Tabs */}
        <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-white/10 shadow-lg overflow-x-auto max-w-full">
          {/* TAB 1: TEAMS */}
          <button
            onClick={() => { setActiveSection('TEAMS'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'TEAMS'
                ? 'bg-gradient-to-r from-blue-500 to-blue-500 text-white shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams ({raceTeams.length})</span>
          </button>

          {/* TAB 2: SCHEDULE */}
          <button
            onClick={() => { setActiveSection('SCHEDULE'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'SCHEDULE'
                ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-black shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Time Schedule ({schedule.length})</span>
          </button>

          {/* TAB 3: LEADERBOARD */}
          <button
            onClick={() => { setActiveSection('LEADERBOARD'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === 'LEADERBOARD'
                ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-black shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Scores & Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: TEAMS MANAGEMENT (SCHOOL CATEGORY vs UNIVERSITY CATEGORY)       */}
      {/* ========================================================================= */}
      {activeSection === 'TEAMS' && (
        <div className="space-y-6">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Race Competitors</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white">{raceTeams.length}</span>
                <span className="text-xs text-slate-500 font-mono">Teams</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  School Category
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">Division 1</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-300">{schoolTeams.length}</span>
                <span className="text-xs text-slate-400 font-mono">School Teams</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  University Category
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">Division 2</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-300">{universityTeams.length}</span>
                <span className="text-xs text-slate-400 font-mono">University Teams</span>
              </div>
            </div>
          </div>

          {/* Supabase Cloud Database Sync Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-[#0b1220] border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Supabase Cloud Database
                  </h3>
                  {supabaseInfo?.configured ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Connected ({supabaseInfo.url || 'Cloud'})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Cloud DB Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Stores team names, Google Drive logo URLs, and category divisions directly in your database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Supabase Setup</span>
              </button>

              <button
                type="button"
                onClick={handleSyncSupabase}
                disabled={supabaseSyncing}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-500 to-blue-400 hover:brightness-110 text-black shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {supabaseSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Sync to Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Toolbar & Division Filter */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search race teams, robots, or institutions..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Division Switcher */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setTeamDivisionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teamDivisionFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL DIVISIONS ({raceTeams.length})
              </button>
              <button
                onClick={() => setTeamDivisionFilter('SCHOOL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teamDivisionFilter === 'SCHOOL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>SCHOOL ({schoolTeams.length})</span>
              </button>
              <button
                onClick={() => setTeamDivisionFilter('UNIVERSITY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teamDivisionFilter === 'UNIVERSITY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>UNIVERSITY ({universityTeams.length})</span>
              </button>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenAddTeamModal('SCHOOL')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                title="Add School Category Team"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>+ Add School Team</span>
              </button>

              <button
                onClick={() => handleOpenAddTeamModal('UNIVERSITY')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                title="Add University Category Team"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>+ Add University Team</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>

              {raceTeams.length > 0 && (
                <button
                  onClick={() => handleClearTeams(teamDivisionFilter)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 transition-colors"
                  title="Clear all race teams currently displayed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear {teamDivisionFilter === 'ALL' ? 'All' : teamDivisionFilter} Teams</span>
                </button>
              )}
            </div>
          </div>

          {/* Teams Table / Divided Listing */}
          {teamsLoading ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              Loading race teams...
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-base font-bold text-white">No Race Teams Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No teams registered for this category filter yet. Add a School or University team above or import an Excel spreadsheet.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenAddTeamModal('SCHOOL')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
                >
                  Add School Team
                </button>
                <button
                  onClick={() => handleOpenAddTeamModal('UNIVERSITY')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
                >
                  Add University Team
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Logo</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Institution / Faculty</th>
                    <th className="py-3 px-4 text-center">Schedule Status</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredTeams.map((team, idx) => {
                    const isSchool = team.raceCategory === 'SCHOOL';
                    const hasScheduleSlot = schedule.some(s => s.teamId === team.id || s.teamName.toLowerCase() === team.name.toLowerCase());

                    return (
                      <tr key={team.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          #{idx + 1}
                        </td>

                        {/* Category Division Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSchool ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <GraduationCap className="w-3 h-3" />
                              SCHOOL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <Building2 className="w-3 h-3" />
                              UNIVERSITY
                            </span>
                          )}
                        </td>

                        {/* Logo */}
                        <td className="py-3 px-4">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="w-9 h-9 rounded-xl object-contain bg-slate-950 border border-white/10 p-0.5"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500">
                              <Flag className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        {/* Team Name */}
                        <td className="py-3 px-4 font-bold text-white text-sm whitespace-nowrap">
                          {team.name}
                        </td>

                        {/* Organization */}
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {team.organization || '—'}
                        </td>

                        {/* Schedule Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {hasScheduleSlot ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Check className="w-3 h-3" />
                              Scheduled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleQuickAddToSchedule(team)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
                              title="Add departure time slot for this team"
                            >
                              + Schedule Run
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditTeamModal(team)}
                              title="Edit Team"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team)}
                              title="Delete Team"
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: TIME SCHEDULE (MANAGEMENT VIEW)                                */}
      {/* ========================================================================= */}
      {activeSection === 'SCHEDULE' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams, robots, or scheduled times..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Division Filter */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setScheduleDivisionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleDivisionFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setScheduleDivisionFilter('SCHOOL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleDivisionFilter === 'SCHOOL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SCHOOL
              </button>
              <button
                onClick={() => setScheduleDivisionFilter('UNIVERSITY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleDivisionFilter === 'UNIVERSITY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                UNIVERSITY
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-500 to-blue-400 text-black hover:opacity-90 transition-opacity"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Generate Schedule</span>
              </button>

              <button
                onClick={handleOpenAddSlotModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Add Slot</span>
              </button>

              {schedule.length > 0 && (
                <button
                  onClick={handleClearSchedule}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-blue-950/60 text-slate-400 hover:text-blue-400 border border-white/10 transition-colors"
                  title="Clear Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Schedule Table */}
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              Loading schedule...
            </div>
          ) : schedule.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 space-y-3">
              <Timer className="w-10 h-10 mx-auto text-blue-400" />
              <h3 className="text-base font-bold text-white">No Departure Slots Created</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Generate an automated departure schedule or add slots manually.
              </p>
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-black hover:bg-blue-400 transition-colors"
              >
                Generate Schedule Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Assigned Time</th>
                    <th className="py-3 px-4">Logo</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Track</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredSchedule.map((slot) => {
                    const isSchool = slot.categoryDivision === 'SCHOOL';

                    return (
                      <tr key={slot.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                          #{slot.slotNumber}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSchool ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              SCHOOL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              UNIVERSITY
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-sm whitespace-nowrap text-white">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{slot.scheduledTime}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {slot.logoUrl ? (
                            <img
                              src={slot.logoUrl}
                              alt={slot.teamName}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-white/10 p-0.5"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                              <Flag className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {slot.teamName}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {slot.track || 'Track 1'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            slot.status === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {slot.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {slot.status === 'SCHEDULED' ? (
                              <button
                                onClick={() => handleSetStatus(slot, 'COMPLETED')}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                              >
                                Mark Done
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSetStatus(slot, 'SCHEDULED')}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                Reset
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditSlot(slot)}
                              title="Edit Slot Time"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              title="Delete Slot"
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: LEADERBOARD & SCORING (MANAGEMENT VIEW)                         */}
      {/* ========================================================================= */}
      {activeSection === 'LEADERBOARD' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  ROBOT RACE SCORE RECORDING & LIVE STANDINGS
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Record verified lap times, points, and manage competitor championship standings.
              </p>
            </div>

            {/* Division Filter */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setLeaderboardDivisionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaderboardDivisionFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setLeaderboardDivisionFilter('SCHOOL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaderboardDivisionFilter === 'SCHOOL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SCHOOL
              </button>
              <button
                onClick={() => setLeaderboardDivisionFilter('UNIVERSITY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaderboardDivisionFilter === 'UNIVERSITY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                UNIVERSITY
              </button>
            </div>
          </div>

          {/* Leaderboard Table with Edit Action */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Logo</th>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Recorded Lap Time / Score</th>
                  <th className="py-3 px-4">Gap / Delta</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Score Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {leaderboardEntries.map((entry, idx) => {
                  const hasScore = Boolean(entry.timeRecorded) || (entry.score !== null && entry.score !== undefined);
                  const isFirst = idx === 0 && hasScore;
                  const isSecond = idx === 1 && hasScore;
                  const isThird = idx === 2 && hasScore;

                  const entrySeconds = entry.timeRecorded ? parseTimeToSeconds(entry.timeRecorded) : null;
                  let deltaText = '—';
                  if (entrySeconds !== null && leaderSeconds !== null) {
                    if (idx === 0) deltaText = 'LEADER';
                    else {
                      const diff = entrySeconds - leaderSeconds;
                      deltaText = diff > 0 ? `+${diff.toFixed(2)}s` : '0.00s';
                    }
                  }

                  const isSchool = entry.categoryDivision === 'SCHOOL';

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isFirst
                          ? 'bg-blue-950/20 hover:bg-blue-950/30 font-semibold'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold">
                        {isFirst ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-black font-black text-xs shadow-md">
                            1
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-black font-black text-xs">
                            2
                          </span>
                        ) : isThird ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 pl-1.5 font-bold">
                            #{idx + 1}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSchool ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            SCHOOL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            UNIVERSITY
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {entry.logoUrl ? (
                          <img
                            src={entry.logoUrl}
                            alt={entry.teamName}
                            className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-white/10 p-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {entry.teamName}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {entry.timeRecorded ? (
                          <span className="text-base font-black text-blue-300 px-2 py-0.5 rounded bg-black/40 border border-blue-500/30">
                            {entry.timeRecorded}
                          </span>
                        ) : entry.score !== null && entry.score !== undefined ? (
                          <span className="text-base font-black text-blue-300 px-2 py-0.5 rounded bg-black/40 border border-blue-500/30">
                            {entry.score} pts
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No score recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {deltaText === 'LEADER' ? (
                          <span className="text-blue-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            LEADER
                          </span>
                        ) : (
                          <span>{deltaText}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasScore ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            RECORDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500">
                            PENDING
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenScoreModal(entry)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
                        >
                          {hasScore ? 'Edit Score' : 'Record Score'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT RACE TEAM (SCHOOL / UNIVERSITY)                       */}
      {/* ========================================================================= */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  {editingTeam ? 'Edit Race Team' : 'Register New Race Team'}
                </h3>
              </div>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-4 text-xs">
              {/* Category Division Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Competition Category Division <span className="text-blue-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    teamFormCategory === 'SCHOOL'
                      ? 'border-blue-500 bg-blue-950/40 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="teamDivision"
                      checked={teamFormCategory === 'SCHOOL'}
                      onChange={() => setTeamFormCategory('SCHOOL')}
                      className="text-blue-500"
                    />
                    <div>
                      <span className="font-bold block text-sm flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-400" />
                        School Category
                      </span>
                      <span className="text-[10px] text-slate-400">Schools & Junior level</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    teamFormCategory === 'UNIVERSITY'
                      ? 'border-blue-500 bg-blue-950/40 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="teamDivision"
                      checked={teamFormCategory === 'UNIVERSITY'}
                      onChange={() => setTeamFormCategory('UNIVERSITY')}
                      className="text-blue-500"
                    />
                    <div>
                      <span className="font-bold block text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        University Category
                      </span>
                      <span className="text-[10px] text-slate-400">Universities & Colleges</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamFormName}
                  onChange={(e) => setTeamFormName(e.target.value)}
                  placeholder="e.g. Apex Predator, Velocity X"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Google Drive Link / Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    Team Logo Google Drive Link / URL
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold">Saves URL to Database</span>
                </label>
                <input
                  type="text"
                  value={teamFormDriveLink}
                  onChange={(e) => setTeamFormDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1.../view?usp=sharing"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Paste any public Google Drive link or image URL. The URL is stored directly in the database without saving local files.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {teamFormCategory === 'SCHOOL' ? 'School Name' : 'University / Faculty'}
                </label>
                <input
                  type="text"
                  value={teamFormOrg}
                  onChange={(e) => setTeamFormOrg(e.target.value)}
                  placeholder={teamFormCategory === 'SCHOOL' ? "e.g. St. Peter's College" : "e.g. Univ. of Moratuwa"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Competitor Remarks
                </label>
                <textarea
                  rows={2}
                  value={teamFormNotes}
                  onChange={(e) => setTeamFormNotes(e.target.value)}
                  placeholder="Additional team info, driver name, chassis spec..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teamFormLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors"
                >
                  {teamFormLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTeam ? 'Save Changes' : 'Register Team'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD / EDIT SCORE & LAP TIME                                   */}
      {/* ========================================================================= */}
      {isScoreModalOpen && targetScoreSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Record Race Score / Lap Time</h3>
              </div>
              <button onClick={() => setIsScoreModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Racer</span>
                <h4 className="text-sm font-bold text-white">{targetScoreSlot.teamName}</h4>
                <p className="text-[11px] text-blue-400 font-mono">
                  Slot #{targetScoreSlot.slotNumber} • Departure: {targetScoreSlot.scheduledTime}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recorded Lap Time (Formatted string)
                </label>
                <input
                  type="text"
                  value={scoreTimeInput}
                  onChange={(e) => setScoreTimeInput(e.target.value)}
                  placeholder="e.g. 42.15s or 01:14.28"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Fastest lap time takes priority on the Leaderboard ranking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Race Points / Score (Numeric)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder="e.g. 100, 85.5"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Run Status
                </label>
                <select
                  value={scoreStatusInput}
                  onChange={(e) => setScoreStatusInput(e.target.value as RaceSlotStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="SCHEDULED">SCHEDULED (PENDING)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsScoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scoreSaveLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors"
                >
                  {scoreSaveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Score</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT SCHEDULE SLOT                                         */}
      {/* ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  {editingSlot ? 'Edit Departure Slot' : 'Add Competitor Slot'}
                </h3>
              </div>
              <button onClick={() => setIsAddEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Team Name <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slotTeamName}
                    onChange={(e) => setSlotTeamName(e.target.value)}
                    placeholder="e.g. Lightning Bot"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category Division <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={slotCategoryDivision}
                    onChange={(e) => setSlotCategoryDivision(e.target.value as 'SCHOOL' | 'UNIVERSITY')}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                  >
                    <option value="SCHOOL">School Category</option>
                    <option value="UNIVERSITY">University Category</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Departure Time <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    placeholder="e.g. 09:30 AM"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={slotStatus}
                    onChange={(e) => setSlotStatus(e.target.value as RaceSlotStatus)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Track / Bay
                </label>
                <input
                  type="text"
                  value={slotTrack}
                  onChange={(e) => setSlotTrack(e.target.value)}
                  placeholder="Track 1"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Institution / School / Organization
                </label>
                <input
                  type="text"
                  value={slotOrg}
                  onChange={(e) => setSlotOrg(e.target.value)}
                  placeholder="e.g. Faculty of Engineering, St. Peter's"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Logo URL or Google Drive Link
                </label>
                <input
                  type="text"
                  value={slotLogoUrl}
                  onChange={(e) => setSlotLogoUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or /uploads/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors"
                >
                  {saveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSlot ? 'Save Changes' : 'Create Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: GENERATE SCHEDULE                                                */}
      {/* ========================================================================= */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Generate Automated Schedule</h3>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Division
                </label>
                <select
                  value={genDivision}
                  onChange={(e) => setGenDivision(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Competitors (School + University)</option>
                  <option value="SCHOOL">School Category Only</option>
                  <option value="UNIVERSITY">University Category Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={genStartTime}
                    onChange={(e) => setGenStartTime(e.target.value)}
                    placeholder="09:30 AM"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={genInterval}
                    onChange={(e) => setGenInterval(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Track Name
                </label>
                <input
                  type="text"
                  value={genTrack}
                  onChange={(e) => setGenTrack(e.target.value)}
                  placeholder="Track 1"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={genRandomize}
                  onChange={(e) => setGenRandomize(e.target.checked)}
                  className="rounded bg-slate-900 border-white/20 text-blue-500"
                />
                <span className="text-slate-300 text-xs font-medium">Randomize competitor departure order</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black transition-colors"
                >
                  {genLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Slots</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: IMPORT EXCEL                                                     */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Import Race Teams via Excel</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportExcel} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Category Division
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    importDivision === 'SCHOOL' ? 'border-blue-500 bg-blue-950/40 text-white' : 'border-white/10 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="impDiv"
                      checked={importDivision === 'SCHOOL'}
                      onChange={() => setImportDivision('SCHOOL')}
                    />
                    <span className="font-bold flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                      School Category
                    </span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    importDivision === 'UNIVERSITY' ? 'border-blue-500 bg-blue-950/40 text-white' : 'border-white/10 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="impDiv"
                      checked={importDivision === 'UNIVERSITY'}
                      onChange={() => setImportDivision('UNIVERSITY')}
                    />
                    <span className="font-bold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      University Category
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/5 space-y-2">
                <p className="text-slate-300 font-semibold">Excel Format Requirements:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                  <li><span className="text-white font-semibold">Column 1:</span> Team Name</li>
                  <li><span className="text-white font-semibold">Column 2:</span> Team Logo Drive Link</li>
                </ul>
                <p className="text-[10px] text-slate-500 pt-1">
                  Drive links will be resolved and saved directly as logo URLs in the database (no local files stored).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Choose Excel Spreadsheet (.xlsx or .xls)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <a
                  href="/api/admin/teams/template"
                  download="race_teams_template.xlsx"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Excel</span>
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importLoading || !importFile}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black disabled:opacity-50 transition-colors"
                  >
                    {importLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Upload & Import</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: SUPABASE CLOUD DATABASE SETUP & SYNC                             */}
      {/* ========================================================================= */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-blue-500/30 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Supabase Cloud Database Integration
                </h3>
              </div>
              <button onClick={() => setIsSupabaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              supabaseInfo?.configured
                ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
            }`}>
              <Database className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold">
                  {supabaseInfo?.configured ? 'Supabase is Configured' : 'Supabase Not Connected Yet'}
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {supabaseInfo?.message || (supabaseInfo?.configured ? 'Connected and operational.' : 'To store teams, race schedules, and logo URLs in your Supabase PostgreSQL cloud database, follow the 3 quick steps below.')}
                </p>
              </div>
            </div>

            {/* Quick 3-Step Setup Instructions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                How to Connect Your Supabase Database:
              </h4>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Create Project in Supabase</span>
                </div>
                <p className="text-slate-400 text-[11px] pl-7">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">supabase.com</a>, start a new project, and navigate to the <strong>SQL Editor</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Run Schema in SQL Editor</span>
                </div>
                <p className="text-slate-400 text-[11px] pl-7">
                  Copy and run the prepared script in <code className="text-blue-300 bg-white/5 px-1 rounded">supabase/schema.sql</code>. It creates all tables (<code className="text-blue-300">teams</code> with <code className="text-blue-300">logo_url</code>, <code className="text-blue-300">race_schedule</code>, and categories).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Add Environment Variables</span>
                </div>
                <p className="text-slate-400 text-[11px] pl-7">
                  Add your project API URL and public key to your <code className="text-blue-300 bg-white/5 px-1 rounded">.env.local</code> file (template in <code className="text-blue-300 bg-white/5 px-1 rounded">.env.example</code>):
                </p>
                <pre className="mt-1 ml-7 p-2 rounded-lg bg-black/70 text-[10px] font-mono text-blue-300 overflow-x-auto border border-white/5">
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={checkSupabaseStatus}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-check Connection</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupabaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSyncSupabase();
                    setIsSupabaseModalOpen(false);
                  }}
                  disabled={supabaseSyncing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-400 text-black hover:brightness-110 disabled:opacity-50 transition-all shadow-md"
                >
                  {supabaseSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>Push Data to Supabase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
