'use client';

import React, { useState, useMemo } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Users, Search, Shield, Trophy, Flame, AlertCircle, CheckCircle } from 'lucide-react';
import { TeamStatus } from '@/lib/types';

export default function TeamsPage() {
  const { selectedCategory, setSelectedCategory, teams, isLoading, refresh } = useTournament();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = 
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.robotName && team.robotName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (team.organization && team.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  const getStatusBadge = (status: TeamStatus) => {
    switch (status) {
      case 'CHAMPION':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black shadow-md shadow-amber-500/20">
            <Trophy className="w-3.5 h-3.5" />
            CHAMPION
          </span>
        );
      case 'FINALIST':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            FINALIST
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ACTIVE
          </span>
        );
      case 'WILDCARD':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            WILDCARD
          </span>
        );
      case 'ELIMINATED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-white/5">
            ELIMINATED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 block">
                Robot Battles Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                REGISTERED COMBAT TEAMS
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official competitor roster, machine combat specifications, and tournament standing.
          </p>
        </div>

        {/* Division Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('HEAVYWEIGHT')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'HEAVYWEIGHT'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            HEAVYWEIGHT (30kg)
          </button>
          <button
            onClick={() => setSelectedCategory('LIGHTWEIGHT')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'LIGHTWEIGHT'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            LIGHTWEIGHT (15kg)
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams, robots, or faculties..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'ACTIVE', 'WILDCARD', 'FINALIST', 'CHAMPION', 'ELIMINATED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                statusFilter === status
                  ? 'bg-white text-black'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8">
          <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-white">No teams match your search</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search criteria or clear filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team, idx) => (
            <div
              key={team.id}
              className={`p-4 rounded-2xl border transition-all ${
                team.status === 'CHAMPION'
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : team.status === 'FINALIST'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : team.status === 'WILDCARD'
                  ? 'bg-amber-950/10 border-amber-500/20'
                  : team.status === 'ACTIVE'
                  ? 'bg-[#0e1628]/90 border-white/10 hover:border-sky-500/30'
                  : 'bg-slate-900/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-10 h-10 rounded-xl object-contain bg-slate-950/80 border border-white/10 p-1 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center border border-white/5 shrink-0">
                      {team.seed ? `#${team.seed}` : idx + 1}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      {team.logoUrl && (
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">
                          #{team.seed || idx + 1}
                        </span>
                      )}
                      <h3 className="font-bold text-white text-base leading-tight">
                        {team.name}
                      </h3>
                    </div>
                    {team.organization && (
                      <p className="text-xs text-slate-400">
                        {team.organization}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {getStatusBadge(team.status)}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    team.lives === 2
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : team.lives === 1
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-500 border border-white/5'
                  }`}>
                    {team.lives === 2 ? '2/2 LIVES' : team.lives === 1 ? '1/2 LIFE' : '0/2 LIVES'}
                  </span>
                </div>
              </div>

              {/* Robot Info */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Robot: <strong className="text-white">{team.robotName || 'Unnamed Unit'}</strong></span>
                </div>

                <span className="text-[10px] text-slate-500 font-mono uppercase">
                  {selectedCategory}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
