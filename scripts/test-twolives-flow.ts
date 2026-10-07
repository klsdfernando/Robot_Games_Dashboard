import {
  getCategories,
  seedRealisticDemoTeams,
  getTeams,
  startRound1,
  getMatches,
  setMatchWinner,
  generateNextStage,
  calculateTeamLives
} from '../src/lib/repository';

const hwCat = getCategories().find(c => c.name === 'HEAVYWEIGHT')!;
seedRealisticDemoTeams(hwCat.id);
startRound1(hwCat.id);

console.log('--- 1. ROUND 1 ---');
const r1Matches = getMatches(hwCat.id).filter(m => m.stageType === 'ROUND_1' && m.status === 'SCHEDULED');
for (const m of r1Matches) setMatchWinner(m.id, m.participants[0].teamId!);

// 2. Wildcard Round 1
console.log('--- 2. R1 WILDCARD ---');
generateNextStage(hwCat.id);
const wcMatches = getMatches(hwCat.id).filter(m => m.stageType === 'WILDCARD');
for (const m of wcMatches) setMatchWinner(m.id, m.participants[0].teamId!);

// 3. Re-entry
console.log('--- 3. RE-ENTRY ---');
generateNextStage(hwCat.id);
const reMatches = getMatches(hwCat.id).filter(m => m.stageType === 'RE_ENTRY');
for (const m of reMatches) setMatchWinner(m.id, m.participants[0].teamId!);

// 4. Quarterfinals
console.log('--- 4. QUARTERFINALS ---');
generateNextStage(hwCat.id);
const qfMatches = getMatches(hwCat.id).filter(m => m.stageType === 'QUARTERFINAL');

// Complete QF matches and verify 2-lives rules dynamically:
for (let i = 0; i < qfMatches.length; i++) {
  const m = qfMatches[i];
  const p1 = m.participants[0];
  const p2 = m.participants[1];
  const p1TeamBefore = getTeams(hwCat.id).find(t => t.id === p1.teamId)!;
  const p2TeamBefore = getTeams(hwCat.id).find(t => t.id === p2.teamId)!;
  
  // Let p1 win, so p2 loses
  setMatchWinner(m.id, p1.teamId!);
  const p2TeamAfter = getTeams(hwCat.id).find(t => t.id === p2.teamId)!;
  console.log(`QF Match ${i+1}: ${p1TeamBefore.name} (${p1TeamBefore.lives}L) beat ${p2TeamBefore.name} (${p2TeamBefore.lives}L) -> Loser now: ${p2TeamAfter.status} (${p2TeamAfter.lives} lives)`);

  if (p2TeamBefore.lives === 1) {
    if (p2TeamAfter.status !== 'ELIMINATED' || p2TeamAfter.lives !== 0) {
      throw new Error(`Expected team with 1 life to be ELIMINATED with 0 lives, got ${p2TeamAfter.status} (${p2TeamAfter.lives})`);
    }
  } else if (p2TeamBefore.lives === 2) {
    if (p2TeamAfter.status !== 'WILDCARD' || p2TeamAfter.lives !== 1) {
      throw new Error(`Expected team with 2 lives to be WILDCARD with 1 life, got ${p2TeamAfter.status} (${p2TeamAfter.lives})`);
    }
  }
}

// 5. Generate Quarterfinals Wildcard!
console.log('--- 5. QUARTERFINAL WILDCARD ---');
const qfwcRes = generateNextStage(hwCat.id);
console.log('Progress to Quarterfinal Wildcard Result:', qfwcRes);
if (qfwcRes.nextStage !== 'QUARTERFINAL_WILDCARD') {
  throw new Error('Failed to progress to QUARTERFINAL_WILDCARD');
}

const qfwcMatches = getMatches(hwCat.id).filter(m => m.stageType === 'QUARTERFINAL_WILDCARD');
console.log('Quarterfinal Wildcard Matches Created:', qfwcMatches.length);
qfwcMatches.forEach(m => {
  console.log('QF Wildcard Match:', m.participants.map(p => p.team?.name + ' (' + p.team?.lives + 'L)').join(' vs '));
});

// Complete QF Wildcard matches
for (const m of qfwcMatches) setMatchWinner(m.id, m.participants[0].teamId!);

// 6. Generate Semifinals
console.log('--- 6. SEMIFINALS ---');
const semiRes = generateNextStage(hwCat.id);
console.log('Progress to Semifinals Result:', semiRes);
const semiMatches = getMatches(hwCat.id).filter(m => m.stageType === 'SEMIFINAL');
console.log('Semifinals Matches Created:', semiMatches.length);
semiMatches.forEach(m => {
  console.log('Semi Match:', m.participants.map(p => p.team?.name + ' (' + p.team?.lives + 'L)').join(' vs '));
});

// Complete Semifinals
for (const m of semiMatches) setMatchWinner(m.id, m.participants[0].teamId!);

// 7. Check if Semifinal Wildcard was generated (Bronze / 3rd place for semifinal losers)
const semiWcMatches = getMatches(hwCat.id).filter(m => m.stageType === 'SEMIFINAL_WILDCARD');
if (semiWcMatches.length > 0) {
  console.log('--- 7. SEMIFINAL WILDCARD (3rd Place / Bronze) ---');
  console.log('Semifinal Wildcard Matches:', semiWcMatches.length);
  for (const m of semiWcMatches) {
    console.log('Semi Wildcard Match:', m.participants.map(p => p.team?.name + ' (' + p.team?.lives + 'L)').join(' vs '));
    setMatchWinner(m.id, m.participants[0].teamId!);
  }
}

// 8. Generate Grand Finals
console.log('--- 8. GRAND FINALS ---');
const finalRes = generateNextStage(hwCat.id);
console.log('Progress to Finals Result:', finalRes);
const finalMatches = getMatches(hwCat.id).filter(m => m.stageType === 'FINAL');
console.log('Finals Match Created:', finalMatches.length);
if (finalMatches.length > 0) {
  setMatchWinner(finalMatches[0].id, finalMatches[0].participants[0].teamId!);
  const champ = getTeams(hwCat.id).find(t => t.status === 'CHAMPION');
  console.log('🏆 Tournament Champion:', champ?.name, 'with lives:', champ?.lives);
}

console.log('TEST SUITE PASSED COMPLETELY! 🌟');
