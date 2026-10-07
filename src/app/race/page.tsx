'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Flag, 
  Timer, 
  Clock, 
  Play, 
  CheckCircle2, 
  Search, 
  Printer, 
  Award, 
  AlertCircle, 
  Check, 
  Loader2, 
  Trophy,
  Medal,
  Calendar,
  Lock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { RaceScheduleSlot } from '@/lib/types';

export default function RobotRacePublicPage() {
  const [schedule, setSchedule] = useState<RaceScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active section tab: 'SCHEDULE' or 'LEADERBOARD'
  const [activeSection, setActiveSection] = useState<'SCHEDULE' | 'LEADERBOARD'>('SCHEDULE');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SCHOOL' | 'UNIVERSITY'>('ALL');

  // Real-time local clock
  const [currentTime, setCurrentTime] = useState<string>('');

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

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Time Schedule: Filtered list (strictly departure times and teams)
  const filteredSchedule = useMemo(() => {
    return schedule.filter(slot => {
      const matchesSearch = 
        slot.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (slot.robotName && slot.robotName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (slot.organization && slot.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
        slot.scheduledTime.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || slot.status === statusFilter;
      const matchesDivision = divisionFilter === 'ALL' || slot.categoryDivision === divisionFilter;
      return matchesSearch && matchesStatus && matchesDivision;
    });
  }, [schedule, searchQuery, statusFilter, divisionFilter]);

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
        (s.robotName && s.robotName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.organization && s.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDivision = divisionFilter === 'ALL' || s.categoryDivision === divisionFilter;
      return matchesSearch && matchesDivision;
    });

    return [...valid].sort((a, b) => {
      const hasTimeA = Boolean(a.timeRecorded) || a.score !== null && a.score !== undefined;
      const hasTimeB = Boolean(b.timeRecorded) || b.score !== null && b.score !== undefined;

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
  }, [schedule, searchQuery]);

  // Fastest leader time for delta calculation
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

  // Top 3 Podium for Leaderboard
  const podium = useMemo(() => {
    const finishedRacers = leaderboardEntries.filter(e => e.timeRecorded || (e.score !== null && e.score !== undefined));
    return {
      first: finishedRacers[0] || null,
      second: finishedRacers[1] || null,
      third: finishedRacers[2] || null
    };
  }, [leaderboardEntries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#071714] via-[#091018] to-[#0d1618] p-6 sm:p-8 shadow-2xl shadow-emerald-500/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <Flag className="w-3.5 h-3.5" />
                <span>ROBOT GAMES 2026 • CATEGORY 2</span>
              </div>

              {currentTime && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-black/40 text-slate-300 border border-white/10">
                  <Clock className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>LIVE CLOCK: {currentTime}</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              ROBOT RACE
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Official spectator portal. View the live <strong>Time Schedule</strong> for heat departure times and the <strong>Race Leaderboard</strong> for verified standings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Tab Switcher: TIME SCHEDULE vs LEADERBOARD */}
            <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 shadow-xl">
              <button
                onClick={() => { setActiveSection('SCHEDULE'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSection === 'SCHEDULE'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20 font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>TIME SCHEDULE</span>
              </button>

              <button
                onClick={() => { setActiveSection('LEADERBOARD'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSection === 'LEADERBOARD'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/20 font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>LEADERBOARD</span>
              </button>
            </div>

            {/* Organizer Portal Link (Admin Login / Control Panel) */}
            <Link
              href="/admin/race"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/40 transition-colors"
              title="Access Admin Race Management"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Organizer Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: TIME SCHEDULE (VIEW-ONLY FOR USERS)                             */}
      {/* ========================================================================= */}
      {activeSection === 'SCHEDULE' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  OFFICIAL DEPARTURE TIME SCHEDULE
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Heat departure times assigned to each team. (Schedule managed by tournament organizers).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title="Print Official Race Schedule"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Schedule</span>
              </button>
            </div>
          </div>

          {/* Schedule Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Racers</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-white">{scheduleStats.total}</span>
                <span className="text-xs text-slate-500 font-mono">Teams</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">In Queue</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-sky-300">{scheduleStats.scheduled}</span>
                <span className="text-xs text-slate-500 font-mono">Upcoming</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 bg-emerald-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                Completed
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-emerald-300">{scheduleStats.completed}</span>
                <span className="text-xs text-slate-500 font-mono">Finished</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Schedule Window</span>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">{scheduleStats.firstTime}</span>
                <span className="text-slate-600">→</span>
                <span className="text-slate-300 font-bold">{scheduleStats.lastTime}</span>
              </div>
            </div>
          </div>

          {/* Up Next / Next Departure Card */}
          {upNext && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {upNext.logoUrl ? (
                  <img
                    src={upNext.logoUrl}
                    alt={upNext.teamName}
                    className="w-11 h-11 rounded-xl object-contain bg-slate-950 border border-white/10 p-1 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 shrink-0 font-mono font-bold text-xs">
                    #{upNext.slotNumber}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-sky-400 block">UP NEXT • ON DECK</span>
                  <h4 className="text-base font-bold text-white truncate">{upNext.teamName}</h4>
                  <p className="text-xs text-slate-400 truncate">
                    {upNext.robotName ? `Bot: ${upNext.robotName}` : upNext.organization || 'In Queue'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Departure</span>
                <div className="text-base font-black font-mono text-amber-400">
                  {upNext.scheduledTime}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams, robots, or scheduled times..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Division Switcher */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setDivisionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'ALL'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setDivisionFilter('SCHOOL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'SCHOOL'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SCHOOL
                </button>
                <button
                  onClick={() => setDivisionFilter('UNIVERSITY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'UNIVERSITY'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UNIVERSITY
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['ALL', 'SCHEDULED', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      statusFilter === st
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {st === 'ALL' ? 'ALL SLOTS' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Schedule Table (STRICTLY VIEW ONLY: TIMES & TEAMS ONLY) */}
          {loading ? (
            <div className="p-16 text-center rounded-3xl border border-white/10 bg-slate-900/40">
              <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-300">Loading schedule...</p>
            </div>
          ) : schedule.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 space-y-3">
              <Timer className="w-10 h-10 mx-auto text-slate-500" />
              <h3 className="text-base font-bold text-white">No Departure Schedule Published Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                The competition departure times will appear here once finalized by tournament officials.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Assigned Departure Time</th>
                    <th className="py-3 px-4">Logo</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Robot Name</th>
                    <th className="py-3 px-4">Faculty / Department</th>
                    <th className="py-3 px-4">Track / Bay</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredSchedule.map((slot) => {
                    const isDone = slot.status === 'COMPLETED';
                    const isSchool = slot.categoryDivision === 'SCHOOL';

                    return (
                      <tr
                        key={slot.id}
                        className={`transition-colors ${
                          isDone
                            ? 'hover:bg-white/5 opacity-80'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                          #{slot.slotNumber}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSchool ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              SCHOOL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              UNIVERSITY
                            </span>
                          )}
                        </td>

                        {/* Large Assigned Departure Time */}
                        <td className="py-3 px-4 font-mono font-black text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-white">
                              {slot.scheduledTime}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {slot.logoUrl ? (
                            <img
                              src={slot.logoUrl}
                              alt={slot.teamName}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-white/10 p-0.5"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500">
                              <Flag className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {slot.teamName}
                        </td>

                        <td className="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">
                          {slot.robotName || '—'}
                        </td>

                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {slot.organization || '—'}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {slot.track || 'Track 1'}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {slot.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              COMPLETED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              SCHEDULED
                            </span>
                          )}
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
      {/* SECTION 2: LEADERBOARD (VIEW-ONLY FOR USERS: SCORES & RANKINGS ONLY)      */}
      {/* ========================================================================= */}
      {activeSection === 'LEADERBOARD' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  OFFICIAL ROBOT RACE LEADERBOARD & SCORES
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified competition scores, recorded lap times, and competitor championship standings.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setDivisionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'ALL'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setDivisionFilter('SCHOOL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'SCHOOL'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SCHOOL
                </button>
                <button
                  onClick={() => setDivisionFilter('UNIVERSITY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    divisionFilter === 'UNIVERSITY'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UNIVERSITY
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standings</span>
              </button>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          {(podium.first || podium.second || podium.third) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1st Place */}
              {podium.first && (
                <div className="order-1 md:order-2 p-5 rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/40 via-slate-900 to-[#191307] shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-amber-400/20 font-black text-6xl select-none font-mono">1</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black mb-3">
                    <Trophy className="w-3.5 h-3.5 fill-black" />
                    <span>RACE LEADER • 1ST PLACE</span>
                  </div>

                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-950 border border-amber-500/40 p-1.5 mb-2 shadow-lg">
                    {podium.first.logoUrl ? (
                      <img src={podium.first.logoUrl} alt={podium.first.teamName} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400 font-black text-xl">#1</div>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">{podium.first.teamName}</h3>
                  <p className="text-xs text-amber-300 font-medium">Bot: {podium.first.robotName || 'Primary Unit'}</p>

                  <div className="mt-3 pt-3 border-t border-amber-500/20">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Fastest Lap / Score</span>
                    <span className="text-2xl font-black font-mono text-amber-400">
                      {podium.first.timeRecorded || `${podium.first.score} pts`}
                    </span>
                  </div>
                </div>
              )}

              {/* 2nd Place */}
              {podium.second && (
                <div className="order-2 md:order-1 p-5 rounded-3xl border border-slate-400/40 bg-gradient-to-br from-slate-900 to-slate-950 text-center relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-slate-400/20 font-black text-6xl select-none font-mono">2</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-300/20 text-slate-200 border border-slate-400/30 mb-3">
                    <Medal className="w-3.5 h-3.5 text-slate-300" />
                    <span>2ND PLACE</span>
                  </div>

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-slate-400/40 p-1.5 mb-2 shadow-lg">
                    {podium.second.logoUrl ? (
                      <img src={podium.second.logoUrl} alt={podium.second.teamName} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-lg">#2</div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">{podium.second.teamName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Bot: {podium.second.robotName || 'Primary Unit'}</p>

                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Score / Time</span>
                    <span className="text-xl font-black font-mono text-slate-200">
                      {podium.second.timeRecorded || `${podium.second.score} pts`}
                    </span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podium.third && (
                <div className="order-3 p-5 rounded-3xl border border-amber-700/40 bg-gradient-to-br from-[#191114] to-slate-950 text-center relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-amber-700/20 font-black text-6xl select-none font-mono">3</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-700/20 text-amber-300 border border-amber-600/30 mb-3">
                    <Medal className="w-3.5 h-3.5 text-amber-400" />
                    <span>3RD PLACE</span>
                  </div>

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-amber-700/40 p-1.5 mb-2 shadow-lg">
                    {podium.third.logoUrl ? (
                      <img src={podium.third.logoUrl} alt={podium.third.teamName} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400 font-black text-lg">#3</div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">{podium.third.teamName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Bot: {podium.third.robotName || 'Primary Unit'}</p>

                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Score / Time</span>
                    <span className="text-xl font-black font-mono text-amber-400">
                      {podium.third.timeRecorded || `${podium.third.score} pts`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Table (VIEW ONLY FOR SPECTATORS) */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Logo</th>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Robot Name</th>
                  <th className="py-3 px-4">Faculty / Department</th>
                  <th className="py-3 px-4">Race Score / Lap Time</th>
                  <th className="py-3 px-4">Gap / Delta</th>
                  <th className="py-3 px-4 text-right">Status</th>
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
                          ? 'bg-amber-950/20 hover:bg-amber-950/30 font-semibold'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold">
                        {isFirst ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs shadow-md">
                            1
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-black font-black text-xs">
                            2
                          </span>
                        ) : isThird ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            SCHOOL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
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
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {entry.teamName}
                      </td>

                      <td className="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">
                        {entry.robotName || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {entry.organization || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {entry.timeRecorded ? (
                          <span className="text-base font-black text-amber-300 px-2 py-0.5 rounded bg-black/40 border border-amber-500/30">
                            {entry.timeRecorded}
                          </span>
                        ) : entry.score !== null && entry.score !== undefined ? (
                          <span className="text-base font-black text-amber-300 px-2 py-0.5 rounded bg-black/40 border border-amber-500/30">
                            {entry.score} pts
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">Awaiting Run</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {deltaText === 'LEADER' ? (
                          <span className="text-amber-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            LEADER
                          </span>
                        ) : (
                          <span>{deltaText}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasScore ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            VERIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500">
                            PENDING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
