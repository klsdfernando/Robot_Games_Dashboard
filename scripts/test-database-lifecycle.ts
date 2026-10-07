import {
  getCategories,
  seedRealisticDemoTeams,
  getTeams,
  startRound1,
  getMatches,
  getStages,
  setMatchWinner,
  generateWildcardStage,
  generateNextStage,
  getDownstreamImpact,
  correctMatchWinner,
  getTournamentOverview,
  resetCategoryTournament,
  deleteTeam
} from '../src/lib/repository';

console.log('=== TEST 1: Categories Initialization ===');
const categories = getCategories();
console.log('Categories:', categories.map(c => `${c.name} (${c.id})`));
if (categories.length < 2) throw new Error('Failed to find 2 default categories');

const hwCat = categories.find(c => c.name === 'HEAVYWEIGHT')!;
console.log('Using Heavyweight Category:', hwCat.id);

console.log('\n=== TEST 2: Seeding Demo Teams ===');
const seedResult = seedRealisticDemoTeams(hwCat.id);
console.log(`Seeded ${seedResult.count} demo teams.`);
const teams = getTeams(hwCat.id);
console.log(`Total teams: ${teams.length} (Expected: 15)`);
if (teams.length !== 15) throw new Error(`Expected 15 teams, got ${teams.length}`);

console.log('\n=== TEST 3: Starting Round 1 (15 Teams -> 7 Matches + 1 BYE) ===');
const r1Result = startRound1(hwCat.id);
if (!r1Result.success) throw new Error(`Round 1 failed: ${r1Result.error}`);

const r1Matches = getMatches(hwCat.id);
console.log(`Round 1 Total Matches Created: ${r1Matches.length}`);
const byeMatch = r1Matches.find(m => m.status === 'BYE');
const normalMatches = r1Matches.filter(m => m.status === 'SCHEDULED');
console.log(`Normal Matches: ${normalMatches.length}, BYE Matches: ${byeMatch ? 1 : 0}`);

if (normalMatches.length !== 7 || !byeMatch) {
  throw new Error('Round 1 pairing failure: expected 7 normal matches and 1 BYE');
}
console.log(`✓ BYE awarded to: ${byeMatch.participants[0].team?.name || 'Unknown'}`);

console.log('\n=== TEST 4: Playing Round 1 Matches ===');
for (const match of normalMatches) {
  // Pick participant 1 as winner
  const winner = match.participants[0].teamId!;
  const res = setMatchWinner(match.id, winner);
  if (!res.success) throw new Error(`Failed to set winner for match ${match.matchNumber}: ${res.error}`);
}
console.log('✓ All 7 normal Round 1 matches completed.');

console.log('\n=== TEST 5: Wildcard Stage Generation ===');
const wcResult = generateWildcardStage(hwCat.id);
if (!wcResult.success) throw new Error(`Wildcard generation failed: ${wcResult.error}`);

const allMatches = getMatches(hwCat.id);
const wcMatches = allMatches.filter(m => m.stageType === 'WILDCARD');
console.log(`Wildcard Matches Created: ${wcMatches.length}`);
wcMatches.forEach(m => {
  console.log(`Wildcard Match ${m.matchNumber}: ${m.participants.length} participants (${m.participants.map(p => p.team?.name).join(' vs ')})`);
});

// Losers from 7 matches = 7 teams. 7 teams should be grouped as [3, 2, 2] -> 3 matches!
if (wcMatches.length !== 3) {
  throw new Error(`Expected 3 wildcard matches for 7 losers, got ${wcMatches.length}`);
}

console.log('\n=== TEST 6: Playing Wildcard Matches ===');
for (const match of wcMatches) {
  const winner = match.participants[0].teamId!;
  const res = setMatchWinner(match.id, winner);
  if (!res.success) throw new Error(`Failed to set wildcard winner: ${res.error}`);
}
console.log('✓ All Wildcard matches completed (3 winners).');

console.log('\n=== TEST 7: Re-Entry Stage Generation ===');
// 7 R1 winners + 1 BYE = 8 Main winners. Plus 3 Wildcard winners = 11 teams.
// Target power of 2 = 8. Re-entry should create 3 matches.
const nextStageRes = generateNextStage(hwCat.id);
console.log('Next Stage Result:', nextStageRes);
if (!nextStageRes.success) throw new Error(`Next stage generation failed: ${nextStageRes.error}`);

const reEntryMatches = getMatches(hwCat.id).filter(m => m.stageType === 'RE_ENTRY');
console.log(`Re-Entry Matches Created: ${reEntryMatches.length}`);
if (reEntryMatches.length !== 3) {
  throw new Error(`Expected 3 re-entry matches, got ${reEntryMatches.length}`);
}

console.log('\n=== TEST 8: Winner Correction Downstream Impact ===');
const firstR1Match = normalMatches[0];
const impact = getDownstreamImpact(firstR1Match.id);
console.log('Downstream Impact for Round 1 Match:', impact.message);

console.log('\n=== TEST 9: Resetting Tournament & Verifying Clean Slate ===');
const resetRes = resetCategoryTournament(hwCat.id);
if (!resetRes.success) throw new Error(`Reset failed: ${resetRes.error}`);
const matchesAfterReset = getMatches(hwCat.id);
console.log(`Matches after reset: ${matchesAfterReset.length} (Expected: 0)`);
if (matchesAfterReset.length !== 0) throw new Error('Reset failed to clear matches');

console.log('\nLIFECYCLE TESTS COMPLETED SUCCESSFULLY! ✅');
