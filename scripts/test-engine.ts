import {
  calculateWildcardGroupSizes,
  generateWildcardProposal,
  calculateReEntryPlan,
  generateRound1Plan,
  getTournamentStageSequence,
  getTargetPowerOfTwo
} from '../src/lib/tournament-engine';
import { Team } from '../src/lib/types';

function createMockTeam(id: string, name: string): Team {
  return {
    id,
    categoryId: 'heavyweight-1',
    name,
    robotName: `Bot-${name}`,
    status: 'ACTIVE',
    isWithdrawn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

console.log('=== 1. TESTING WILDCARD GROUPING FOR ALL PARTICIPANT COUNTS ===');
const testCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20];

for (const count of testCounts) {
  const sizes = calculateWildcardGroupSizes(count);
  const sum = sizes.reduce((a, b) => a + b, 0);
  const remainder = count % 3;

  // Assert sum equals count
  if (sum !== count) {
    throw new Error(`Wildcard sum mismatch for ${count}: got ${sum}, expected ${count}`);
  }

  // Assert rule: NO group of 1 when count >= 2
  if (count >= 2 && sizes.includes(1)) {
    throw new Error(`Invalid group of 1 generated for count ${count}: ${JSON.stringify(sizes)}`);
  }

  // Check specific remainder rules:
  if (count >= 4 && remainder === 1) {
    // Must end with [2, 2]
    const lastTwo = sizes.slice(-2);
    if (lastTwo[0] !== 2 || lastTwo[1] !== 2) {
      throw new Error(`Remainder 1 failed rebalance for count ${count}: expected ending [2, 2], got ${JSON.stringify(sizes)}`);
    }
  }

  if (count >= 5 && remainder === 2) {
    // Must end with [2]
    const last = sizes[sizes.length - 1];
    if (last !== 2) {
      throw new Error(`Remainder 2 failed for count ${count}: expected ending with 2, got ${JSON.stringify(sizes)}`);
    }
  }

  console.log(`✓ Wildcard ${count} teams -> Groups: [${sizes.join(', ')}] (Sum: ${sum})`);
}

console.log('\n=== 2. TESTING ROUND 1 PAIRINGS & ODD NUMBER BYES ===');
const round1Counts = [2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 16, 17, 20];

for (const count of round1Counts) {
  const teams: Team[] = Array.from({ length: count }, (_, i) => 
    createMockTeam(`team-${i + 1}`, `Team ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`)
  );

  const plan = generateRound1Plan(teams, undefined, false);
  const totalAccounted = plan.matches.length * 2 + (plan.byeTeam ? 1 : 0);

  if (totalAccounted !== count) {
    throw new Error(`Round 1 count mismatch for ${count}: got ${totalAccounted}, expected ${count}`);
  }

  if (count % 2 !== 0 && !plan.byeTeam) {
    throw new Error(`Odd count ${count} did not receive a BYE!`);
  }
  if (count % 2 === 0 && plan.byeTeam) {
    throw new Error(`Even count ${count} unexpectedly received a BYE!`);
  }

  console.log(`✓ Round 1 ${count} teams -> ${plan.matches.length} Matches + ${plan.byeTeam ? `1 BYE (${plan.byeTeam.name})` : '0 BYEs'}`);
}

console.log('\n=== 3. TESTING RE-ENTRY / PLAY-IN POWER-OF-TWO NORMALIZATION ===');
// Test various combinations of (Main Winners + Wildcard Winners)
const reEntryTestCases = [
  { main: 8, wildcard: 3 }, // 11 -> target 8, 3 re-entry matches
  { main: 4, wildcard: 2 }, // 6 -> target 4, 2 re-entry matches
  { main: 8, wildcard: 0 }, // 8 -> target 8, 0 re-entry matches
  { main: 7, wildcard: 3 }, // 10 -> target 8, 2 re-entry matches
  { main: 9, wildcard: 4 }, // 13 -> target 8, 5 re-entry matches
  { main: 4, wildcard: 1 }, // 5 -> target 4, 1 re-entry match
  { main: 2, wildcard: 1 }, // 3 -> target 2, 1 re-entry match
  { main: 2, wildcard: 0 }, // 2 -> target 2, 0 re-entry match
];

for (const tc of reEntryTestCases) {
  const mainTeams = Array.from({ length: tc.main }, (_, i) => createMockTeam(`m-${i + 1}`, `MainWinner-${i + 1}`));
  const wcTeams = Array.from({ length: tc.wildcard }, (_, i) => createMockTeam(`w-${i + 1}`, `WildcardWinner-${i + 1}`));
  
  const plan = calculateReEntryPlan(mainTeams, wcTeams);
  const totalAfterReEntry = plan.reEntryMatchesCount + plan.directPassTeams.length;

  if (totalAfterReEntry !== plan.targetPowerOfTwo) {
    throw new Error(`Re-entry failure for ${tc.main}+${tc.wildcard}: resulting pool ${totalAfterReEntry} !== target ${plan.targetPowerOfTwo}`);
  }

  console.log(`✓ ${tc.main} Main + ${tc.wildcard} Wildcard (${tc.main + tc.wildcard} total) -> ${plan.reEntryMatchesCount} Re-Entry matches, ${plan.directPassTeams.length} Direct Passes -> Target: ${plan.targetPowerOfTwo} teams`);
}

console.log('\n=== 4. TESTING STAGE PIPELINE SEQUENCES ===');
for (const count of [2, 4, 7, 8, 11, 15, 16, 20]) {
  const stages = getTournamentStageSequence(count);
  console.log(`✓ Count ${count} stages: ${stages.join(' -> ')}`);
}

console.log('\nALL ALGORITHM TESTS PASSED SUCCESSFULLY! ✅');
