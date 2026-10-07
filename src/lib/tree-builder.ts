import { Match, StageType, Team, TournamentStage, TournamentOverview } from './types';

export interface TreeParticipant {
  id?: string;
  name: string;
  robotName?: string;
  score?: number | null;
  isWinner?: boolean;
  isBye?: boolean;
  lives?: number;
  seed?: number;
  matchId?: string;
  matchNumber?: number;
  status?: string;
}

export interface TreeMatchNode {
  id: string;
  matchNumber?: number;
  stageType: StageType;
  stageName: string;
  roundIndex: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'BYE' | 'PROJECTED';
  topParticipant: TreeParticipant;
  bottomParticipant?: TreeParticipant; // undefined if single team BYE
  winnerName?: string;
  winnerTeam?: Team | null;
  scoreText?: string;
  rawMatch?: Match;
}

export interface TreeRound {
  index: number;
  title: string;
  matches: TreeMatchNode[];
}

export interface TreeData {
  rounds: TreeRound[];
  champion: {
    name: string;
    robotName?: string;
    isConfirmed: boolean;
  } | null;
  asciiText: string;
  wildcardStages: {
    stageType: StageType;
    stageName: string;
    matches: Match[];
  }[];
}

/**
 * Builds the complete tournament tree model from matches and stages.
 * Separates wildcard matches from the main championship tree.
 */
export function buildTournamentTree(
  matches: Match[],
  stages: TournamentStage[],
  overview: TournamentOverview | null
): TreeData {
  // 1. Separate Wildcards from Main Matches
  const wildcardMatches: Match[] = [];
  const mainMatches: Match[] = [];

  for (const m of matches) {
    if (m.stageType.includes('WILDCARD')) {
      wildcardMatches.push(m);
    } else {
      mainMatches.push(m);
    }
  }

  // Group wildcard matches by stage
  const wildcardStageMap = new Map<StageType, Match[]>();
  for (const wm of wildcardMatches) {
    if (!wildcardStageMap.has(wm.stageType)) {
      wildcardStageMap.set(wm.stageType, []);
    }
    wildcardStageMap.get(wm.stageType)!.push(wm);
  }

  const wildcardStages = Array.from(wildcardStageMap.entries()).map(([stageType, ms]) => {
    let stageName = 'Wildcard Stage';
    if (stageType === 'WILDCARD') stageName = 'Round 1 Wildcard';
    else if (stageType === 'QUARTERFINAL_WILDCARD') stageName = 'Quarterfinals Wildcard';
    else if (stageType === 'SEMIFINAL_WILDCARD') stageName = 'Semifinals Wildcard';
    else if (stageType === 'WILDCARD_SEMIFINAL') stageName = 'Wildcard Semifinals';
    else if (stageType === 'WILDCARD_FINAL') stageName = 'Wildcard Final Decider';
    else if (stageType === 'ROUND_OF_16_WILDCARD') stageName = 'Round of 16 Wildcard';

    return {
      stageType,
      stageName,
      matches: ms.sort((a, b) => a.matchNumber - b.matchNumber)
    };
  });

  // 2. Build Main Bracket Rounds
  const r1Matches = mainMatches
    .filter(m => m.stageType === 'ROUND_1')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const qfMatches = mainMatches
    .filter(m => m.stageType === 'QUARTERFINAL')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const sfMatches = mainMatches
    .filter(m => m.stageType === 'SEMIFINAL')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const finalMatches = mainMatches
    .filter(m => m.stageType === 'FINAL')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  // If no matches at all
  if (r1Matches.length === 0) {
    return {
      rounds: [],
      champion: overview?.champion ? {
        name: overview.champion.name,
        robotName: overview.champion.robotName,
        isConfirmed: true
      } : null,
      asciiText: 'No bracket matches generated yet.',
      wildcardStages
    };
  }

  // Determine rounds sequence
  const rounds: TreeRound[] = [];

  // ROUND 1: Preliminary Round
  const r1Nodes: TreeMatchNode[] = r1Matches.map((m) => {
    const isBye = m.status === 'BYE';
    const p1 = m.participants[0];
    const p2 = m.participants[1];

    const topPart: TreeParticipant = {
      id: p1?.team?.id,
      name: p1?.team?.name || p1?.placeholderText || 'TBD',
      robotName: p1?.team?.robotName,
      score: p1?.score,
      isWinner: Boolean(p1?.isWinner),
      isBye: isBye,
      lives: p1?.team?.lives,
      seed: p1?.team?.seed,
      matchId: m.id,
      matchNumber: m.matchNumber,
      status: m.status
    };

    let bottomPart: TreeParticipant | undefined = undefined;
    if (!isBye && p2) {
      bottomPart = {
        id: p2?.team?.id,
        name: p2?.team?.name || p2?.placeholderText || 'TBD',
        robotName: p2?.team?.robotName,
        score: p2?.score,
        isWinner: Boolean(p2?.isWinner),
        isBye: false,
        lives: p2?.team?.lives,
        seed: p2?.team?.seed,
        matchId: m.id,
        matchNumber: m.matchNumber,
        status: m.status
      };
    }

    let winnerName = m.winnerTeam?.name;
    if (!winnerName && m.status === 'COMPLETED') {
      winnerName = 'Winner';
    } else if (!winnerName && isBye) {
      winnerName = topPart.name;
    }

    return {
      id: m.id,
      matchNumber: m.matchNumber,
      stageType: 'ROUND_1',
      stageName: 'Preliminary Round',
      roundIndex: 0,
      status: m.status,
      topParticipant: topPart,
      bottomParticipant: bottomPart,
      winnerName,
      winnerTeam: m.winnerTeam,
      scoreText: p1 && p2 && p1.score !== null && p2.score !== null ? `${p1.score} - ${p2.score}` : undefined,
      rawMatch: m
    };
  });

  rounds.push({
    index: 0,
    title: 'PRELIMINARY ROUND',
    matches: r1Nodes
  });

  // Calculate forward rounds count
  // E.g., if R1 has 8 matches -> QF has 4, SF has 2, Final has 1
  // If R1 has 6 matches -> QF has 4, SF has 2, Final has 1
  // If R1 has 4 matches -> SF has 2, Final has 1
  // If R1 has 2 matches -> Final has 1
  const r1MatchCount = r1Nodes.length;
  let hasQF = r1MatchCount > 4;
  let hasSF = r1MatchCount > 2;

  // ROUND 2: Quarterfinals (if > 4 matches in R1, or if qfMatches exists in DB)
  if (hasQF || qfMatches.length > 0) {
    const qfCount = Math.max(qfMatches.length, Math.ceil(r1MatchCount / 2));
    const qfNodes: TreeMatchNode[] = [];

    for (let i = 0; i < qfCount; i++) {
      const realMatch = qfMatches[i];
      const feeder1 = r1Nodes[i * 2];
      const feeder2 = r1Nodes[i * 2 + 1];

      let topPart: TreeParticipant;
      let bottomPart: TreeParticipant | undefined;

      if (realMatch && realMatch.participants[0]) {
        const p1 = realMatch.participants[0];
        topPart = {
          id: p1.team?.id,
          name: p1.team?.name || p1.placeholderText || 'TBD',
          robotName: p1.team?.robotName,
          score: p1.score,
          isWinner: Boolean(p1.isWinner),
          lives: p1.team?.lives,
          seed: p1.team?.seed,
          matchId: realMatch.id,
          matchNumber: realMatch.matchNumber,
          status: realMatch.status
        };
      } else {
        const topName = feeder1?.winnerName || (feeder1 ? (feeder1.status === 'BYE' ? feeder1.topParticipant.name : `Winner M${feeder1.matchNumber}`) : 'TBD');
        topPart = {
          name: topName,
          robotName: feeder1?.winnerTeam?.robotName,
          matchId: feeder1?.id,
          isWinner: feeder1?.status === 'COMPLETED'
        };
      }

      if (realMatch && realMatch.participants[1]) {
        const p2 = realMatch.participants[1];
        bottomPart = {
          id: p2.team?.id,
          name: p2.team?.name || p2.placeholderText || 'TBD',
          robotName: p2.team?.robotName,
          score: p2.score,
          isWinner: Boolean(p2.isWinner),
          lives: p2.team?.lives,
          seed: p2.team?.seed,
          matchId: realMatch.id,
          matchNumber: realMatch.matchNumber,
          status: realMatch.status
        };
      } else {
        const bottomName = feeder2?.winnerName || (feeder2 ? (feeder2.status === 'BYE' ? feeder2.topParticipant.name : `Winner M${feeder2.matchNumber}`) : 'TBD');
        bottomPart = {
          name: bottomName,
          robotName: feeder2?.winnerTeam?.robotName,
          matchId: feeder2?.id,
          isWinner: feeder2?.status === 'COMPLETED'
        };
      }

      const matchId = realMatch?.id || `proj-qf-${i + 1}`;
      const status = realMatch?.status || 'SCHEDULED';
      const winnerName = realMatch?.winnerTeam?.name || (status === 'COMPLETED' ? 'Winner' : undefined);

      qfNodes.push({
        id: matchId,
        matchNumber: i + 1,
        stageType: 'QUARTERFINAL',
        stageName: 'Quarterfinals',
        roundIndex: 1,
        status: realMatch ? status : 'PROJECTED',
        topParticipant: topPart,
        bottomParticipant: bottomPart,
        winnerName,
        winnerTeam: realMatch?.winnerTeam,
        scoreText: realMatch?.participants[0]?.score !== null && realMatch?.participants[1]?.score !== null
          ? `${realMatch?.participants[0]?.score} - ${realMatch?.participants[1]?.score}`
          : undefined,
        rawMatch: realMatch
      });
    }

    rounds.push({
      index: 1,
      title: 'QUARTERFINALS',
      matches: qfNodes
    });
  }

  // ROUND 3: Semifinals
  const prevRound = rounds[rounds.length - 1];
  const sfCount = Math.max(sfMatches.length, Math.ceil(prevRound.matches.length / 2), 2);
  const sfNodes: TreeMatchNode[] = [];

  for (let i = 0; i < sfCount; i++) {
    const realMatch = sfMatches[i];
    const feeder1 = prevRound.matches[i * 2];
    const feeder2 = prevRound.matches[i * 2 + 1];

    let topPart: TreeParticipant;
    let bottomPart: TreeParticipant | undefined;

    if (realMatch && realMatch.participants[0]) {
      const p1 = realMatch.participants[0];
      topPart = {
        id: p1.team?.id,
        name: p1.team?.name || p1.placeholderText || 'TBD',
        robotName: p1.team?.robotName,
        score: p1.score,
        isWinner: Boolean(p1.isWinner),
        lives: p1.team?.lives,
        seed: p1.team?.seed,
        matchId: realMatch.id,
        matchNumber: realMatch.matchNumber,
        status: realMatch.status
      };
    } else {
      const topName = feeder1?.winnerName || (feeder1 ? `Winner QF${feeder1.matchNumber || i * 2 + 1}` : 'TBD');
      topPart = {
        name: topName,
        robotName: feeder1?.winnerTeam?.robotName,
        matchId: feeder1?.id
      };
    }

    if (realMatch && realMatch.participants[1]) {
      const p2 = realMatch.participants[1];
      bottomPart = {
        id: p2.team?.id,
        name: p2.team?.name || p2.placeholderText || 'TBD',
        robotName: p2.team?.robotName,
        score: p2.score,
        isWinner: Boolean(p2.isWinner),
        lives: p2.team?.lives,
        seed: p2.team?.seed,
        matchId: realMatch.id,
        matchNumber: realMatch.matchNumber,
        status: realMatch.status
      };
    } else {
      const bottomName = feeder2?.winnerName || (feeder2 ? `Winner QF${feeder2.matchNumber || i * 2 + 2}` : 'TBD');
      bottomPart = {
        name: bottomName,
        robotName: feeder2?.winnerTeam?.robotName,
        matchId: feeder2?.id
      };
    }

    const matchId = realMatch?.id || `proj-sf-${i + 1}`;
    const status = realMatch?.status || 'SCHEDULED';
    const winnerName = realMatch?.winnerTeam?.name || (status === 'COMPLETED' ? 'Winner' : undefined);

    sfNodes.push({
      id: matchId,
      matchNumber: i + 1,
      stageType: 'SEMIFINAL',
      stageName: 'Semifinals',
      roundIndex: rounds.length,
      status: realMatch ? status : 'PROJECTED',
      topParticipant: topPart,
      bottomParticipant: bottomPart,
      winnerName,
      winnerTeam: realMatch?.winnerTeam,
      scoreText: realMatch?.participants[0]?.score !== null && realMatch?.participants[1]?.score !== null
        ? `${realMatch?.participants[0]?.score} - ${realMatch?.participants[1]?.score}`
        : undefined,
      rawMatch: realMatch
    });
  }

  rounds.push({
    index: rounds.length,
    title: 'SEMIFINALS',
    matches: sfNodes
  });

  // ROUND 3.5: Winners Final (Upper Championship)
  const wfMatches = mainMatches
    .filter(m => m.stageType === 'WINNERS_FINAL')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  let wfNode: TreeMatchNode | undefined = undefined;
  if (wfMatches.length > 0 || sfMatches.length > 1) {
    const realWf = wfMatches[0];
    const prevSf1 = sfNodes[0];
    const prevSf2 = sfNodes[1];

    let wfTop: TreeParticipant;
    let wfBottom: TreeParticipant | undefined;

    if (realWf && realWf.participants[0]) {
      const p1 = realWf.participants[0];
      wfTop = {
        id: p1.team?.id,
        name: p1.team?.name || p1.placeholderText || 'TBD',
        robotName: p1.team?.robotName,
        score: p1.score,
        isWinner: Boolean(p1.isWinner),
        lives: p1.team?.lives,
        matchId: realWf.id,
        matchNumber: realWf.matchNumber,
        status: realWf.status
      };
    } else {
      wfTop = {
        name: prevSf1?.winnerName || 'Winner Semifinal 1',
        robotName: prevSf1?.winnerTeam?.robotName,
        matchId: prevSf1?.id
      };
    }

    if (realWf && realWf.participants[1]) {
      const p2 = realWf.participants[1];
      wfBottom = {
        id: p2.team?.id,
        name: p2.team?.name || p2.placeholderText || 'TBD',
        robotName: p2.team?.robotName,
        score: p2.score,
        isWinner: Boolean(p2.isWinner),
        lives: p2.team?.lives,
        matchId: realWf.id,
        matchNumber: realWf.matchNumber,
        status: realWf.status
      };
    } else {
      wfBottom = {
        name: prevSf2?.winnerName || 'Winner Semifinal 2',
        robotName: prevSf2?.winnerTeam?.robotName,
        matchId: prevSf2?.id
      };
    }

    const wfStatus = realWf?.status || 'SCHEDULED';
    const wfWinner = realWf?.winnerTeam?.name || (wfStatus === 'COMPLETED' ? 'Winner' : undefined);

    wfNode = {
      id: realWf?.id || 'proj-wf-1',
      matchNumber: 1,
      stageType: 'WINNERS_FINAL',
      stageName: 'Winners Final',
      roundIndex: rounds.length,
      status: realWf ? wfStatus : 'PROJECTED',
      topParticipant: wfTop,
      bottomParticipant: wfBottom,
      winnerName: wfWinner,
      winnerTeam: realWf?.winnerTeam,
      scoreText: realWf?.participants[0]?.score !== null && realWf?.participants[1]?.score !== null
        ? `${realWf?.participants[0]?.score} - ${realWf?.participants[1]?.score}`
        : undefined,
      rawMatch: realWf
    };

    rounds.push({
      index: rounds.length,
      title: 'WINNERS FINAL',
      matches: [wfNode]
    });
  }

  // ROUND 4: Grand Finals
  const realFinal = finalMatches[0];
  const sf1 = sfNodes[0];
  const sf2 = sfNodes[1];

  let finalTop: TreeParticipant;
  let finalBottom: TreeParticipant | undefined;

  if (realFinal && realFinal.participants[0]) {
    const p1 = realFinal.participants[0];
    finalTop = {
      id: p1.team?.id,
      name: p1.team?.name || p1.placeholderText || 'TBD',
      robotName: p1.team?.robotName,
      score: p1.score,
      isWinner: Boolean(p1.isWinner),
      lives: p1.team?.lives,
      matchId: realFinal.id,
      matchNumber: realFinal.matchNumber,
      status: realFinal.status
    };
  } else {
    finalTop = {
      name: wfNode?.winnerName || sf1?.winnerName || 'Upper Bracket Winner',
      robotName: wfNode?.winnerTeam?.robotName || sf1?.winnerTeam?.robotName,
      matchId: wfNode?.id || sf1?.id
    };
  }

  if (realFinal && realFinal.participants[1]) {
    const p2 = realFinal.participants[1];
    finalBottom = {
      id: p2.team?.id,
      name: p2.team?.name || p2.placeholderText || 'TBD',
      robotName: p2.team?.robotName,
      score: p2.score,
      isWinner: Boolean(p2.isWinner),
      lives: p2.team?.lives,
      matchId: realFinal.id,
      matchNumber: realFinal.matchNumber,
      status: realFinal.status
    };
  } else {
    finalBottom = {
      name: 'Wildcard Bracket Winner',
      matchId: 'proj-wc-final'
    };
  }

  const finalStatus = realFinal?.status || 'SCHEDULED';
  const finalWinner = realFinal?.winnerTeam?.name || overview?.champion?.name || (finalStatus === 'COMPLETED' ? 'Winner' : undefined);

  const finalNode: TreeMatchNode = {
    id: realFinal?.id || 'proj-final-1',
    matchNumber: 1,
    stageType: 'FINAL',
    stageName: 'Grand Finals',
    roundIndex: rounds.length,
    status: realFinal ? finalStatus : 'PROJECTED',
    topParticipant: finalTop,
    bottomParticipant: finalBottom,
    winnerName: finalWinner,
    winnerTeam: realFinal?.winnerTeam || overview?.champion,
    scoreText: realFinal?.participants[0]?.score !== null && realFinal?.participants[1]?.score !== null
      ? `${realFinal?.participants[0]?.score} - ${realFinal?.participants[1]?.score}`
      : undefined,
    rawMatch: realFinal
  };

  rounds.push({
    index: rounds.length,
    title: 'GRAND FINALS',
    matches: [finalNode]
  });

  // CHAMPION
  const champion = overview?.champion
    ? {
        name: overview.champion.name,
        robotName: overview.champion.robotName,
        isConfirmed: Boolean(overview.isCompleted)
      }
    : finalWinner && finalStatus === 'COMPLETED'
    ? {
        name: finalWinner,
        robotName: finalNode.winnerTeam?.robotName,
        isConfirmed: true
      }
    : null;

  // 3. Generate Monospace ASCII Tree Text (exact match to screenshot)
  const asciiText = generateMonospaceAscii(rounds, champion);

  return {
    rounds,
    champion,
    asciiText,
    wildcardStages
  };
}

/**
 * Formats the exact box-drawing character tree shown in the user's diagram.
 * Supports arbitrary matches and BYEs.
 */
function generateMonospaceAscii(
  rounds: TreeRound[],
  champion: { name: string; robotName?: string } | null
): string {
  if (rounds.length === 0) return 'No bracket matches generated yet.';

  const r1 = rounds[0];
  const qf = rounds.find(r => r.title === 'QUARTERFINALS');
  const sf = rounds.find(r => r.title === 'SEMIFINALS');
  const fn = rounds.find(r => r.title === 'GRAND FINALS')?.matches[0];

  const lines: string[] = [];
  lines.push('PRELIMINARY ROUND');

  // We pair R1 matches by 2 to feed into next round
  for (let i = 0; i < r1.matches.length; i += 2) {
    const m1 = r1.matches[i];
    const m2 = r1.matches[i + 1];

    const qfIndex = Math.floor(i / 2);
    const qfMatch = qf?.matches[qfIndex];
    const qfWinner = qfMatch?.winnerName || (qfMatch ? 'Winner' : 'Winner');

    // M1
    const t1Name = truncate(m1.topParticipant.name, 16);
    if (m1.status === 'BYE') {
      lines.push(`${t1Name.padEnd(16)} ──────── BYE ──────┐`);
    } else {
      const t2Name = truncate(m1.bottomParticipant?.name || 'TBD', 16);
      const m1Win = truncate(m1.winnerName || 'Winner', 12);
      lines.push(`${t1Name.padEnd(16)} ──┐`);
      lines.push(`${''.padEnd(17)}├── ${m1Win.padEnd(12)} ──────┐`);
      lines.push(`${t2Name.padEnd(16)} ──┘${''.padEnd(20)}│`);
    }

    // M2 (if exists)
    if (m2) {
      const t3Name = truncate(m2.topParticipant.name, 16);
      if (m2.status === 'BYE') {
        const isLastInBracket = i + 2 >= r1.matches.length;
        const champStr = isLastInBracket ? ` ──┐\n${''.padEnd(52)}│\n${''.padEnd(52)}├── ${champion?.name ? champion.name.toUpperCase() : 'CHAMPION'}` : '';
        lines.push(`${''.padEnd(38)}├── ${qfWinner.padEnd(10)}${champStr}`);
        lines.push(`${t3Name.padEnd(16)} ──────── BYE ──────┘`);
      } else {
        const t4Name = truncate(m2.bottomParticipant?.name || 'TBD', 16);
        const m2Win = truncate(m2.winnerName || 'Winner', 12);

        // Middle connector from M1 and M2
        const isSemiTop = qfIndex % 2 === 0;
        const semiWin = sf ? 'Winner' : 'Winner';
        const isLastInBracket = i + 2 >= r1.matches.length;

        lines.push(`${''.padEnd(38)}├── ${qfWinner.padEnd(10)} ──┐`);
        lines.push(`${t3Name.padEnd(16)} ──┐${''.padEnd(20)}│${''.padEnd(13)}│`);
        
        let centerLine = `${''.padEnd(17)}├── ${m2Win.padEnd(12)} ──────┘${''.padEnd(13)}`;
        if (qfIndex === 0) {
          centerLine += `├── ${semiWin} ──┐`;
        } else if (isLastInBracket) {
          centerLine += `├── ${champion?.name ? champion.name.toUpperCase() : 'CHAMPION'}`;
        }
        lines.push(centerLine);

        lines.push(`${t4Name.padEnd(16)} ──┘${''.padEnd(34)}│`);
      }
    }
  }

  // End banner
  if (champion) {
    lines.push('');
    lines.push(`🏆 CHAMPION: ${champion.name.toUpperCase()}${champion.robotName ? ` (Bot: ${champion.robotName})` : ''}`);
  }

  return lines.join('\n');
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}
