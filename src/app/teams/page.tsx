'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useTournament } from '@/context/TournamentContext';
import { Users, Search, Trophy, CheckCircle2, XCircle, LayoutGrid, Building2 } from 'lucide-react';
import { TeamStatus } from '@/lib/types';

export default function TeamsPage() {
  const { selectedCategory, teams } = useTournament();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = 
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.organization && team.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'COMPETING' && team.status !== 'ELIMINATED')
        || team.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  const filters = [
    { value: 'ALL', label: 'All teams', icon: LayoutGrid, count: teams.length },
    { value: 'COMPETING', label: 'Competing', icon: CheckCircle2, count: teams.filter((team) => team.status !== 'ELIMINATED').length },
    { value: 'CHAMPION', label: 'Champion', icon: Trophy, count: teams.filter((team) => team.status === 'CHAMPION').length },
    { value: 'ELIMINATED', label: 'Eliminated', icon: XCircle, count: teams.filter((team) => team.status === 'ELIMINATED').length },
  ];

  const getStatusBadge = (status: TeamStatus) => {
    switch (status) {
      case 'CHAMPION':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500 text-black shadow-md shadow-blue-500/20">
            <Trophy className="w-3.5 h-3.5" />
            CHAMPION
          </span>
        );
      case 'FINALIST':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            FINALIST
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            ACTIVE
          </span>
        );
      case 'WILDCARD':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
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
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 block">
                Robot Battles Category
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                REGISTERED COMBAT TEAMS
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official competitor directory and live tournament standing.
          </p>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1019]/80 p-2.5 sm:flex sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams or organizations..."
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/25 py-2.5 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-black/40"
          />
        </div>

        <div className="scrollbar-none mt-2 flex items-center gap-1 overflow-x-auto rounded-xl bg-black/25 p-1 sm:mt-0">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition ${active
                  ? 'bg-blue-600 text-white shadow-[0_6px_18px_rgba(37,99,235,0.24)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
                <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] ${active ? 'bg-black/25 text-blue-100' : 'bg-white/5 text-slate-500'}`}>
                  {filter.count}
                </span>
              </button>
            );
          })}
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.map((team, idx) => (
            <div
              key={team.id}
              className={`group relative overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.24)] ${
                team.status === 'CHAMPION'
                  ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : team.status === 'FINALIST'
                  ? 'bg-blue-950/20 border-blue-500/30'
                  : team.status === 'WILDCARD'
                  ? 'bg-blue-950/10 border-blue-500/20'
                  : team.status === 'ACTIVE'
                  ? 'bg-[#0e1628]/90 border-white/10 hover:border-blue-500/35'
                  : 'bg-slate-900/40 border-white/5 opacity-60'
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {team.logoUrl ? (
                    <Image
                      src={team.logoUrl}
                      alt={team.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-slate-950/80 object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/[0.07] font-mono text-xs font-black text-blue-300">
                      {String(team.seed || idx + 1).padStart(2, '0')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-blue-400/80">Seed {team.seed ? `#${team.seed}` : 'TBD'}</p>
                    <h3 className="truncate text-[15px] font-extrabold leading-tight text-white">{team.name}</h3>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  {getStatusBadge(team.status)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
                <div className="flex min-w-0 items-center gap-2 text-slate-400">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  <span className="truncate">{team.organization || 'Independent entry'}</span>
                </div>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-600">{selectedCategory}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
