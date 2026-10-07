export type TournamentCategory = 'HEAVYWEIGHT' | 'LIGHTWEIGHT' | 'ROBOT_RACE';

export type TeamStatus = 'ACTIVE' | 'WILDCARD' | 'ELIMINATED' | 'FINALIST' | 'CHAMPION';

export type RaceSlotStatus = 'SCHEDULED' | 'RACING' | 'COMPLETED' | 'DNS' | 'DELAYED';

export type RaceCategoryDivision = 'SCHOOL' | 'UNIVERSITY';

export interface RaceScheduleSlot {
  id: string;
  teamId?: string | null;
  teamName: string;
  robotName?: string | null;
  organization?: string | null;
  logoUrl?: string | null;
  categoryDivision?: RaceCategoryDivision | 'SCHOOL' | 'UNIVERSITY';
  slotNumber: number;
  scheduledTime: string; // e.g. "09:30 AM"
  status: RaceSlotStatus;
  track?: string | null;
  timeRecorded?: string | null; // e.g. "01:14.28"
  score?: number | null; // points or numeric score
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StageType = 
  | 'REGISTRATION'
  | 'ROUND_1'
  | 'WILDCARD'
  | 'RE_ENTRY'
  | 'ROUND_OF_16'
  | 'ROUND_OF_16_WILDCARD'
  | 'QUARTERFINAL'
  | 'QUARTERFINAL_WILDCARD'
  | 'SEMIFINAL'
  | 'SEMIFINAL_WILDCARD'
  | 'WINNERS_FINAL'
  | 'WILDCARD_SEMIFINAL'
  | 'WILDCARD_FINAL'
  | 'FINAL'
  | 'COMPLETED';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'BYE';

export interface Category {
  id: string;
  name: TournamentCategory;
  displayName: string;
  description: string;
  createdAt: string;
}

export interface Team {
  id: string;
  categoryId: string;
  name: string;
  robotName?: string;
  organization?: string;
  seed?: number;
  status: TeamStatus;
  lives?: number; // 2 lives system: 2 = full, 1 = in wildcard second chance, 0 = eliminated
  isWithdrawn: boolean;
  logoUrl?: string;
  raceCategory?: RaceCategoryDivision | 'SCHOOL' | 'UNIVERSITY';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentStage {
  id: string;
  categoryId: string;
  stageType: StageType;
  stageOrder: number;
  displayName: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  startedAt?: string;
  completedAt?: string;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  teamId?: string | null;
  placeholderText?: string | null;
  participantOrder: number;
  isWinner: boolean;
  score?: number | null;
  advancementSource?: string | null; // e.g. "ROUND_1_WINNER", "ROUND_1_LOSER", "BYE", "WILDCARD_WINNER", "MANUAL"
  sourceMatchId?: string | null;
  team?: Team | null;
}

export interface Match {
  id: string;
  categoryId: string;
  stageId: string;
  stageType: StageType;
  stageName?: string;
  matchNumber: number;
  roundOrder: number;
  status: MatchStatus;
  winnerTeamId?: string | null;
  scheduledTime?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  participants: MatchParticipant[];
  winnerTeam?: Team | null;
  nextMatchId?: string | null;
  wildcardMatchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSettings {
  id: string;
  categoryId: string;
  wildcardSingleTeamRule: 'ELIMINATE' | 'AWARD_BYE' | 'MANUAL';
  autoProgressStages: boolean;
  allowManualPairings: boolean;
  updatedAt: string;
}

export interface TournamentOverview {
  category: TournamentCategory;
  categoryId: string;
  currentStage: StageType;
  currentStageDisplayName: string;
  isCompleted: boolean;
  totalTeams: number;
  activeTeams: number;
  liveMatch: Match | null;
  upNextMatch: Match | null;
  completedMatchesCount: number;
  totalMatchesCount: number;
  champion: Team | null;
  runnerUp: Team | null;
  secondRunnerUp?: Team | null;
  stages: TournamentStage[];
}

export interface WildcardProposal {
  groups: {
    matchNumber: number;
    teams: Team[];
    size: 2 | 3;
  }[];
  unassignedTeams: Team[];
  warnings: string[];
}

export interface ReEntryProposal {
  targetPowerOfTwo: number;
  reEntryMatchesCount: number;
  matches: {
    matchNumber: number;
    participant1: Team | { placeholder: string; source: string };
    participant2: Team | { placeholder: string; source: string };
  }[];
  directPassTeams: (Team | { placeholder: string; source: string })[];
  notes: string;
}

export interface DownstreamImpact {
  affectedMatches: {
    matchId: string;
    matchNumber: number;
    stageType: StageType;
    currentParticipants: string[];
    affectedTeam: string;
    action: 'RESET_WINNER' | 'CLEAR_PARTICIPANT' | 'REPLACE_PARTICIPANT';
  }[];
  hasCompletedMatches: boolean;
  message: string;
}
