'use client';

import TournamentTreeGraph from './TournamentTreeGraph';
import { Match, TournamentOverview, TournamentStage } from '@/lib/types';

interface GraphicalBracketProps {
  stages: TournamentStage[];
  matches: Match[];
  overview: TournamentOverview | null;
  onSelectMatch: (match: Match) => void;
}

/** The public bracket intentionally exposes one visual representation: the flow map. */
export default function GraphicalBracket({
  stages,
  matches,
  overview,
  onSelectMatch,
}: GraphicalBracketProps) {
  return (
    <TournamentTreeGraph
      stages={stages}
      matches={matches}
      overview={overview}
      onSelectMatch={onSelectMatch}
    />
  );
}
