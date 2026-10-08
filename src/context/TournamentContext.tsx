'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  TournamentCategory,
  Category,
  TournamentOverview,
  TournamentStage,
  Match,
  Team
} from '@/lib/types';

interface TournamentContextType {
  selectedCategory: TournamentCategory;
  setSelectedCategory: (cat: TournamentCategory) => void;
  categories: Category[];
  overview: TournamentOverview | null;
  stages: TournamentStage[];
  matches: Match[];
  teams: Team[];
  isLoading: boolean;
  isPolling: boolean;
  lastUpdated: number;
  refresh: () => Promise<void>;
  selectedMatch: Match | null;
  setSelectedMatch: (m: Match | null) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory>('HEAVYWEIGHT');
  const [categories, setCategories] = useState<Category[]>([]);
  const [overview, setOverview] = useState<TournamentOverview | null>(null);
  const [stages, setStages] = useState<TournamentStage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const fetchState = useCallback(async (category: TournamentCategory, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch(`/api/public/tournament-state?category=${category}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Failed to fetch tournament state');
      const data = await res.json();
      setCategories(data.categories || []);
      setOverview(data.overview || null);
      setStages(data.stages || []);
      setMatches(data.matches || []);
      setTeams(data.teams || []);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error fetching tournament state:', err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState(selectedCategory);
  }, [selectedCategory, fetchState]);

  // Real-time polling check every 3.5 seconds
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      if (document.hidden) return; // Save bandwidth when tab inactive
      try {
        setIsPolling(true);
        const res = await fetch('/api/realtime');
        if (res.ok) {
          const stats = await res.json();
          // Check if updates exist
          if (overview && (stats.matchCount !== matches.length || stats.lastUpdate > overview.currentStage)) {
            if (isMounted) {
              await fetchState(selectedCategory, true);
            }
          }
          if (isMounted) setLastUpdated(Date.now());
        }
      } catch {
        // Silent fail on background poll
      } finally {
        if (isMounted) setIsPolling(false);
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCategory, overview, matches.length, fetchState]);

  const refresh = async () => {
    await fetchState(selectedCategory);
  };

  return (
    <TournamentContext.Provider
      value={{
        selectedCategory,
        setSelectedCategory,
        categories,
        overview,
        stages,
        matches,
        teams,
        isLoading,
        isPolling,
        lastUpdated,
        refresh,
        selectedMatch,
        setSelectedMatch
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
