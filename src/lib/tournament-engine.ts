import { Team, WildcardProposal, ReEntryProposal, StageType, Match, MatchParticipant } from './types';

/**
 * Calculates optimal Wildcard group sizes for any number of participants.
 * Prioritizes 3-team battles for Wildcard:
 * - Divisible by 3: all 3-team battles [3, 3, 3...]
 *   e.g. 9 lost teams -> [3, 3, 3] (three 3-team battles)
 *   e.g. 6 lost teams -> [3, 3] (two 3-team battles)
 *   e.g. 3 lost teams -> [3] (one 3-team battle)
 * - Remainder 2: two-team battle at the end [3, 3, ..., 2]
 *   e.g. 8 lost teams -> [3, 3, 2] (two 3-team battles, one 2-team battle)
 *   e.g. 5 lost teams -> [3, 2] (one 3-team battle, one 2-team battle)
 *   e.g. 2 lost teams -> [2] (one 2-team battle)
 * - Remainder 1: rebalance the last 4 into two 2-team battles [3, ..., 2, 2] (NEVER 3 + 1)
 *   e.g. 7 lost teams -> [3, 2, 2] (one 3-team battle, two 2-team battles)
 *   e.g. 10 lost teams -> [3, 3, 2, 2] (two 3-team battles, two 2-team battles)
 *   e.g. 4 lost teams -> [2, 2] (two 2-team battles)
 * - Exactly 1: [1] (requires admin resolution or Wildcard BYE)
 */
export function calculateWildcardGroupSizes(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [2];
  if (count === 3) return [3];
  if (count === 4) return [2, 2];

  const remainder = count % 3;

  if (remainder === 0) {
    const numGroups = count / 3;
    return Array(numGroups).fill(3);
  }

  if (remainder === 2) {
    const numThrees = Math.floor(count / 3);
    return [...Array(numThrees).fill(3), 2];
  }

  // remainder === 1
  // We take 4 teams and make them two groups of 2.
  // The rest (count - 4) is divisible by 3.
  const numThrees = (count - 4) / 3;
  return [...Array(numThrees).fill(3), 2, 2];
}

/**
 * Generates proposed Wildcard groups from a list of teams.
 */
export function generateWildcardProposal(
  poolTeams: Team[],
  singleTeamRule: 'ELIMINATE' | 'AWARD_BYE' | 'MANUAL' = 'MANUAL'
): WildcardProposal {
  const warnings: string[] = [];
  const count = poolTeams.length;

  if (count === 0) {
    return { groups: [], unassignedTeams: [], warnings: ['No teams in Wildcard pool.'] };
  }

  if (count === 1) {
    if (singleTeamRule === 'MANUAL') {
      warnings.push('Only 1 team in Wildcard pool. Requires admin decision: eliminate or award Wildcard BYE.');
    } else if (singleTeamRule === 'ELIMINATE') {
      warnings.push('Only 1 team in Wildcard pool. Per tournament rule, team will not have an opponent.');
    } else {
      warnings.push('Only 1 team in Wildcard pool. Per tournament rule, team can be awarded a Wildcard BYE.');
    }
    return {
      groups: [],
      unassignedTeams: poolTeams,
      warnings
    };
  }

  const groupSizes = calculateWildcardGroupSizes(count);
  const groups: WildcardProposal['groups'] = [];
  let teamIndex = 0;

  groupSizes.forEach((size, idx) => {
    const teamsInGroup = poolTeams.slice(teamIndex, teamIndex + size);
    teamIndex += size;
    groups.push({
      matchNumber: idx + 1,
      teams: teamsInGroup,
      size: size as 2 | 3
    });
  });

  return {
    groups,
    unassignedTeams: poolTeams.slice(teamIndex),
    warnings
  };
}

/**
 * Calculates nearest power of 2 that is <= total teams.
 * e.g., 11 -> 8; 7 -> 4; 16 -> 16; 8 -> 8; 5 -> 4; 3 -> 2; 2 -> 2.
 */
export function getTargetPowerOfTwo(totalTeams: number): number {
  if (totalTeams <= 2) return 2;
  let p = 2;
  while (p * 2 <= totalTeams) {
    p *= 2;
  }
  return p;
}

/**
 * Computes Re-Entry / Play-in requirements to normalize to a clean power-of-two bracket.
 *
 * Example:
 * 8 Main winners + 3 Wildcard winners = 11 teams.
 * Target power of two = 8.
 * Excess teams = 11 - 8 = 3.
 * Number of play-in matches = 3.
 * Teams in play-in = 6 (3 Wildcard winners vs 3 Main winners).
 * Remaining 5 Main winners get direct pass to Quarterfinals.
 * Total advancing = 3 play-in winners + 5 direct pass = 8 teams!
 */
export function calculateReEntryPlan(
  mainWinners: Team[],
  wildcardWinners: Team[]
): ReEntryProposal {
  const m = mainWinners.length;
  const w = wildcardWinners.length;
  const total = m + w;

  const targetPowerOfTwo = getTargetPowerOfTwo(total);
  const excess = total - targetPowerOfTwo;

  if (excess === 0) {
    return {
      targetPowerOfTwo,
      reEntryMatchesCount: 0,
      matches: [],
      directPassTeams: [...mainWinners, ...wildcardWinners],
      notes: `Clean power-of-two (${targetPowerOfTwo} teams). Direct advancement with no re-entry needed.`
    };
  }

  const matches: ReEntryProposal['matches'] = [];
  const reEntryMatchesCount = excess;

  // We pair Wildcard winners into re-entry matches first.
  let wildcardIndex = 0;
  let mainIndex = 0;

  for (let i = 0; i < reEntryMatchesCount; i++) {
    let p1: Team | { placeholder: string; source: string };
    let p2: Team | { placeholder: string; source: string };

    if (wildcardIndex < w) {
      p1 = wildcardWinners[wildcardIndex++];
    } else {
      p1 = mainWinners[mainIndex++];
    }

    if (wildcardIndex < w && i >= (reEntryMatchesCount - (w - wildcardIndex))) {
      // If there are more wildcard winners than remaining matches, pair wildcard vs wildcard
      p2 = wildcardWinners[wildcardIndex++];
    } else if (mainIndex < m) {
      p2 = mainWinners[mainIndex++];
    } else if (wildcardIndex < w) {
      p2 = wildcardWinners[wildcardIndex++];
    } else {
      p2 = { placeholder: `TBD Participant`, source: 'RE_ENTRY_TBD' };
    }

    matches.push({
      matchNumber: i + 1,
      participant1: p1,
      participant2: p2
    });
  }

  // The remaining teams get direct passes to the next round
  const directPassTeams: (Team | { placeholder: string; source: string })[] = [
    ...mainWinners.slice(mainIndex),
    ...wildcardWinners.slice(wildcardIndex)
  ];

  return {
    targetPowerOfTwo,
    reEntryMatchesCount,
    matches,
    directPassTeams,
    notes: `${reEntryMatchesCount} Re-entry play-in matches required to normalize from ${total} to ${targetPowerOfTwo} teams.`
  };
}

/**
 * Plans Round 1 pairings:
 * Handles odd numbers by allocating 1 BYE.
 * If manualByeTeamId is provided, that team is assigned the BYE.
 */
export function generateRound1Plan(
  teams: Team[],
  manualByeTeamId?: string,
  shuffle: boolean = true
): {
  matches: { matchNumber: number; team1: Team; team2: Team }[];
  byeTeam: Team | null;
} {
  const eligibleTeams = [...teams].filter(t => !t.isWithdrawn);
  let workingTeams = shuffle ? shuffleArray([...eligibleTeams]) : [...eligibleTeams];

  let byeTeam: Team | null = null;

  if (workingTeams.length % 2 !== 0) {
    if (manualByeTeamId) {
      const idx = workingTeams.findIndex(t => t.id === manualByeTeamId);
      if (idx !== -1) {
        byeTeam = workingTeams[idx];
        workingTeams.splice(idx, 1);
      } else {
        byeTeam = workingTeams.pop() || null;
      }
    } else {
      // Random BYE
      byeTeam = workingTeams.pop() || null;
    }
  }

  const matches: { matchNumber: number; team1: Team; team2: Team }[] = [];
  for (let i = 0; i < workingTeams.length; i += 2) {
    matches.push({
      matchNumber: Math.floor(i / 2) + 1,
      team1: workingTeams[i],
      team2: workingTeams[i + 1]
    });
  }

  return { matches, byeTeam };
}

/**
 * Determines stage progression pipeline based on participant count.
 * DUAL-TRACK FORMAT:
 * - Upper Track: Main / Winners Bracket (2v2 matches). Winners advance to next Winner round; losers drop to Wildcard.
 * - Lower Track: Wildcard Bracket (3-Way and 2-Way matches). 1 Winner advances to next Wildcard round; losers are eliminated.
 * - Apex: Grand Finals (Winners Bracket Champion vs Wildcard Bracket Champion).
 */
export function getTournamentStageSequence(totalTeams: number): StageType[] {
  const stages: StageType[] = ['REGISTRATION', 'ROUND_1', 'WILDCARD'];

  if (totalTeams <= 2) {
    stages.push('FINAL', 'COMPLETED');
    return stages;
  }

  if (totalTeams <= 4) {
    stages.push('WINNERS_FINAL', 'WILDCARD_FINAL', 'FINAL', 'COMPLETED');
    return stages;
  }

  if (totalTeams <= 8) {
    stages.push('SEMIFINAL', 'SEMIFINAL_WILDCARD', 'WINNERS_FINAL', 'WILDCARD_FINAL', 'FINAL', 'COMPLETED');
    return stages;
  }

  if (totalTeams <= 16) {
    stages.push(
      'QUARTERFINAL',
      'QUARTERFINAL_WILDCARD',
      'SEMIFINAL',
      'SEMIFINAL_WILDCARD',
      'WINNERS_FINAL',
      'WILDCARD_FINAL',
      'FINAL',
      'COMPLETED'
    );
    return stages;
  }

  // 17 to 32+ teams: includes Round of 16
  stages.push(
    'ROUND_OF_16',
    'ROUND_OF_16_WILDCARD',
    'QUARTERFINAL',
    'QUARTERFINAL_WILDCARD',
    'SEMIFINAL',
    'SEMIFINAL_WILDCARD',
    'WINNERS_FINAL',
    'WILDCARD_FINAL',
    'FINAL',
    'COMPLETED'
  );

  return stages;
}

/**
 * Helper to display human-readable stage name.
 */
export function getStageDisplayName(stageType: StageType): string {
  switch (stageType) {
    case 'REGISTRATION': return 'Registration';
    case 'ROUND_1': return 'Round 1 (Main 2v2)';
    case 'WILDCARD': return 'Round 1 Wildcard (3-Way / 2-Way)';
    case 'RE_ENTRY': return 'Re-Entry Play-In';
    case 'ROUND_OF_16': return 'Round of 16 (Main 2v2)';
    case 'ROUND_OF_16_WILDCARD': return 'Round of 16 Wildcard';
    case 'QUARTERFINAL': return 'Quarterfinals (Main 2v2)';
    case 'QUARTERFINAL_WILDCARD': return 'Quarterfinals Wildcard (3-Way / 2-Way)';
    case 'SEMIFINAL': return 'Semifinals (Main 2v2)';
    case 'SEMIFINAL_WILDCARD': return 'Semifinals Wildcard (3-Way / 2-Way)';
    case 'WINNERS_FINAL': return 'Winners Final (Upper Championship 2v2)';
    case 'WILDCARD_SEMIFINAL': return 'Wildcard Semifinals (3-Way / 2-Way)';
    case 'WILDCARD_FINAL': return 'Wildcard Final (Lower Championship Decider)';
    case 'FINAL': return 'Grand Finals (Upper Champion vs Wildcard Champion)';
    case 'COMPLETED': return 'Completed';
  }
}

/**
 * Fisher-Yates shuffle helper
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
