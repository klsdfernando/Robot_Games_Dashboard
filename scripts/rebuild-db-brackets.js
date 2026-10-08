const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'data', 'robot_games.db');
const db = new Database(dbPath);

function calculateWildcardGroupSizes(count) {
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
  const numThrees = (count - 4) / 3;
  return [...Array(numThrees).fill(3), 2, 2];
}

function resetCategory(categoryId) {
  db.transaction(() => {
    db.prepare('DELETE FROM advancement_links WHERE source_match_id IN (SELECT id FROM matches WHERE category_id = ?)').run(categoryId);
    db.prepare('DELETE FROM match_participants WHERE match_id IN (SELECT id FROM matches WHERE category_id = ?)').run(categoryId);
    db.prepare('DELETE FROM matches WHERE category_id = ?').run(categoryId);
    db.prepare('DELETE FROM stages WHERE category_id = ?').run(categoryId);
    db.prepare("UPDATE teams SET status = 'ACTIVE', lives = 2 WHERE category_id = ?").run(categoryId);
  })();
}

function buildBracket(categoryId) {
  const teams = db.prepare("SELECT * FROM teams WHERE category_id = ? AND is_withdrawn = 0").all(categoryId);
  if (teams.length < 2) {
    console.log(`Category ${categoryId} has fewer than 2 teams`);
    return;
  }

  // Sort by seed if available
  const orderedTeams = [...teams].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  const N = orderedTeams.length;
  const now = new Date().toISOString();

  resetCategory(categoryId);

  db.transaction(() => {
    const createStage = (stageType, stageOrder, displayName, status = 'PENDING') => {
      const stageId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(stageId, categoryId, stageType, stageOrder, displayName, status, status === 'ACTIVE' ? now : null);
      return stageId;
    };

    const createMatch = (data) => {
      const matchId = data.id || crypto.randomUUID();
      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, winner_team_id, completed_at, next_match_id, wildcard_match_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        matchId,
        categoryId,
        data.stageId,
        data.stageType,
        data.matchNumber,
        data.roundOrder,
        data.status || 'SCHEDULED',
        data.winnerTeamId || null,
        data.status === 'BYE' ? now : null,
        data.nextMatchId || null,
        data.wildcardMatchId || null,
        now,
        now
      );
      return matchId;
    };

    const addParticipant = (data) => {
      const pId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, placeholder_text, participant_order, is_winner, score, source_match_id, advancement_source)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        pId,
        data.matchId,
        data.teamId || null,
        data.placeholderText || null,
        data.order,
        data.isWinner ? 1 : 0,
        data.sourceMatchId || null,
        data.advancementSource || (data.teamId ? 'SEED' : null)
      );
      return pId;
    };

    if (N > 8) {
      const sR1 = createStage('ROUND_1', 1, 'Round 1', 'ACTIVE');
      const sWC = createStage('WILDCARD', 2, 'Round 1 Wildcard', 'PENDING');
      const sQF = createStage('QUARTERFINAL', 3, 'Quarterfinals', 'PENDING');
      const sQFWC = createStage('QUARTERFINAL_WILDCARD', 4, 'Quarterfinals Wildcard', 'PENDING');
      const sSF = createStage('SEMIFINAL', 5, 'Semifinals', 'PENDING');
      const sSWC = createStage('SEMIFINAL_WILDCARD', 6, 'Wildcard Semifinals', 'PENDING');
      const sWF = createStage('WINNERS_FINAL', 7, 'Winners Final', 'PENDING');
      const sWCF = createStage('WILDCARD_FINAL', 8, 'Wildcard Final', 'PENDING');
      const sFinal = createStage('FINAL', 9, 'Grand Finals', 'PENDING');

      const finalId = crypto.randomUUID();
      const wcfId = crypto.randomUUID();
      const wfId = crypto.randomUUID();
      const sf1Id = crypto.randomUUID();
      const sf2Id = crypto.randomUUID();
      const numByes = N % 2;
      const numR1Matches = Math.floor(N / 2);
      const r1AdvancerCount = numR1Matches + numByes;
      const qfMatchCount = Math.ceil(r1AdvancerCount / 2);
      const qfContestedCount = Math.floor(r1AdvancerCount / 2);
      const qfIds = Array.from({ length: qfMatchCount }, () => crypto.randomUUID());
      const r1MatchIds = [];
      const byeMatchIds = [];

      const byeTeams = numByes ? orderedTeams.slice(0, 1) : [];
      const r1Teams = orderedTeams.slice(numByes);

      // Round 1 Matches
      for (let i = 0; i < numR1Matches; i++) {
        const r1Id = crypto.randomUUID();
        r1MatchIds.push(r1Id);

        createMatch({
          id: r1Id,
          stageId: sR1,
          stageType: 'ROUND_1',
          matchNumber: i + 1,
          roundOrder: 1,
          status: 'SCHEDULED',
          nextMatchId: qfIds[Math.floor((numByes + i) / 2)]
        });

        addParticipant({ matchId: r1Id, order: 1, teamId: r1Teams[i * 2].id });
        addParticipant({ matchId: r1Id, order: 2, teamId: r1Teams[i * 2 + 1].id });
      }

      // Top seed BYE if roster is odd
      for (let i = 0; i < byeTeams.length; i++) {
        const byeId = crypto.randomUUID();
        const team = byeTeams[i];
        byeMatchIds.push(byeId);

        createMatch({
          id: byeId,
          stageId: sR1,
          stageType: 'ROUND_1',
          matchNumber: numR1Matches + i + 1,
          roundOrder: 1,
          status: 'BYE',
          winnerTeamId: team.id,
          nextMatchId: qfIds[Math.floor(i / 2)]
        });
        addParticipant({
          matchId: byeId,
          order: 1,
          teamId: team.id,
          isWinner: true,
          advancementSource: 'ROUND_1_BYE'
        });
      }

      // 1. Round 1 Wildcard (prioritize 3-team battles)
      const r1WcMatchIds = [];
      const r1LoserCount = numR1Matches;
      const r1WcGroupSizes = calculateWildcardGroupSizes(r1LoserCount);

      let r1LoserIndex = 0;
      for (let g = 0; g < r1WcGroupSizes.length; g++) {
        const size = r1WcGroupSizes[g];
        const wcMatchId = crypto.randomUUID();
        r1WcMatchIds.push(wcMatchId);

        createMatch({
          id: wcMatchId,
          stageId: sWC,
          stageType: 'WILDCARD',
          matchNumber: g + 1,
          roundOrder: 2,
          status: 'SCHEDULED'
        });

        for (let p = 0; p < size; p++) {
          const srcId = r1MatchIds[r1LoserIndex++];
          if (srcId) {
            addParticipant({
              matchId: wcMatchId,
              order: p + 1,
              sourceMatchId: srcId,
              advancementSource: 'WILDCARD_DROP'
            });
            db.prepare("UPDATE matches SET wildcard_match_id = ? WHERE id = ?").run(wcMatchId, srcId);
          }
        }
      }

      // 2. Quarterfinals (Main 1v1)
      for (let q = 0; q < qfIds.length; q++) {
        const targetSF = q < 2 ? sf1Id : sf2Id;
        const isRoundBye = q === qfIds.length - 1 && r1AdvancerCount % 2 === 1;
        createMatch({
          id: qfIds[q],
          stageId: sQF,
          stageType: 'QUARTERFINAL',
          matchNumber: q + 1,
          roundOrder: 3,
          status: isRoundBye ? 'BYE' : 'SCHEDULED',
          nextMatchId: targetSF
        });
      }

      const qfSlots = Array.from({ length: r1AdvancerCount }, (_, index) => ({
        matchId: qfIds[Math.floor(index / 2)],
        order: (index % 2) + 1
      }));

      for (let s = 0; s < qfSlots.length; s++) {
        const cfg = qfSlots[s];
        if (s < numByes) {
          const team = byeTeams[s];
          addParticipant({
            matchId: cfg.matchId,
            order: cfg.order,
            teamId: team.id,
            sourceMatchId: byeMatchIds[s],
            advancementSource: 'WINNER'
          });
        } else {
          const srcId = r1MatchIds[s - numByes];
          addParticipant({
            matchId: cfg.matchId,
            order: cfg.order,
            sourceMatchId: srcId,
            advancementSource: 'WINNER'
          });
        }
      }

      // 3. Quarterfinals Wildcard (prioritizing 3-way battles)
      const qfWcWinners = r1WcMatchIds.map(id => ({ sourceId: id, source: 'WINNER' }));
      const qfLosers = qfIds.slice(0, qfContestedCount).map(id => ({ sourceId: id, source: 'WILDCARD_DROP' }));
      const qfWcPool = [];

      let qwIdx = 0, qlIdx = 0;
      while (qwIdx < qfWcWinners.length || qlIdx < qfLosers.length) {
        if (qwIdx < qfWcWinners.length) qfWcPool.push(qfWcWinners[qwIdx++]);
        if (qlIdx < qfLosers.length) qfWcPool.push(qfLosers[qlIdx++]);
      }

      const qfWcGroupSizes = calculateWildcardGroupSizes(qfWcPool.length);
      const qfWcMatchIds = [];
      let qfPoolIdx = 0;

      for (let g = 0; g < qfWcGroupSizes.length; g++) {
        const size = qfWcGroupSizes[g];
        const matchId = crypto.randomUUID();
        qfWcMatchIds.push(matchId);

        createMatch({
          id: matchId,
          stageId: sQFWC,
          stageType: 'QUARTERFINAL_WILDCARD',
          matchNumber: g + 1,
          roundOrder: 4,
          status: 'SCHEDULED'
        });

        for (let p = 0; p < size; p++) {
          const item = qfWcPool[qfPoolIdx++];
          if (item) {
            addParticipant({
              matchId,
              order: p + 1,
              sourceMatchId: item.sourceId,
              advancementSource: item.source
            });
            if (item.source === 'WINNER') {
              db.prepare("UPDATE matches SET next_match_id = ? WHERE id = ?").run(matchId, item.sourceId);
            } else {
              db.prepare("UPDATE matches SET wildcard_match_id = ? WHERE id = ?").run(matchId, item.sourceId);
            }
          }
        }
      }

      // 4. Semifinals (Main 1v1)
      createMatch({ id: sf1Id, stageId: sSF, stageType: 'SEMIFINAL', matchNumber: 1, roundOrder: 5, status: 'SCHEDULED', nextMatchId: wfId });
      addParticipant({ matchId: sf1Id, order: 1, sourceMatchId: qfIds[0], advancementSource: 'WINNER' });
      addParticipant({ matchId: sf1Id, order: 2, sourceMatchId: qfIds[1], advancementSource: 'WINNER' });

      const sf2IsBye = qfIds.length === 3;
      createMatch({ id: sf2Id, stageId: sSF, stageType: 'SEMIFINAL', matchNumber: 2, roundOrder: 5, status: sf2IsBye ? 'BYE' : 'SCHEDULED', nextMatchId: wfId });
      addParticipant({ matchId: sf2Id, order: 1, sourceMatchId: qfIds[2], advancementSource: 'WINNER' });
      if (qfIds[3]) {
        addParticipant({ matchId: sf2Id, order: 2, sourceMatchId: qfIds[3], advancementSource: 'WINNER' });
      }

      // 5. Semifinals Wildcard (prioritizing 3-way battles)
      const swcWinners = qfWcMatchIds.map(id => ({ sourceId: id, source: 'WINNER' }));
      const swcLosers = [
        { sourceId: sf1Id, source: 'WILDCARD_DROP' },
        ...(!sf2IsBye && qfIds[3] ? [{ sourceId: sf2Id, source: 'WILDCARD_DROP' }] : [])
      ];
      const swcPool = [];

      let swIdx = 0, slIdx = 0;
      while (swIdx < swcWinners.length || slIdx < swcLosers.length) {
        if (swIdx < swcWinners.length) swcPool.push(swcWinners[swIdx++]);
        if (slIdx < swcLosers.length) swcPool.push(swcLosers[slIdx++]);
      }

      const swcGroupSizes = calculateWildcardGroupSizes(swcPool.length);
      const swcMatchIds = [];
      let swcPoolIdx = 0;

      for (let g = 0; g < swcGroupSizes.length; g++) {
        const size = swcGroupSizes[g];
        const matchId = crypto.randomUUID();
        swcMatchIds.push(matchId);

        createMatch({
          id: matchId,
          stageId: sSWC,
          stageType: 'SEMIFINAL_WILDCARD',
          matchNumber: g + 1,
          roundOrder: 6,
          status: 'SCHEDULED',
          nextMatchId: wcfId
        });

        for (let p = 0; p < size; p++) {
          const item = swcPool[swcPoolIdx++];
          if (item) {
            addParticipant({
              matchId,
              order: p + 1,
              sourceMatchId: item.sourceId,
              advancementSource: item.source
            });
            if (item.source === 'WINNER') {
              db.prepare("UPDATE matches SET next_match_id = ? WHERE id = ?").run(matchId, item.sourceId);
            } else {
              db.prepare("UPDATE matches SET wildcard_match_id = ? WHERE id = ?").run(matchId, item.sourceId);
            }
          }
        }
      }

      // 6. Winners Final
      createMatch({ id: wfId, stageId: sWF, stageType: 'WINNERS_FINAL', matchNumber: 1, roundOrder: 7, status: 'SCHEDULED', nextMatchId: finalId, wildcardMatchId: wcfId });
      addParticipant({ matchId: wfId, order: 1, sourceMatchId: sf1Id, advancementSource: 'WINNER' });
      addParticipant({ matchId: wfId, order: 2, sourceMatchId: sf2Id, advancementSource: 'WINNER' });

      // 7. Wildcard Final
      const wcfContenders = [
        ...swcMatchIds.map(id => ({ sourceId: id, source: 'WINNER' })),
        { sourceId: wfId, source: 'WILDCARD_DROP' }
      ];

      createMatch({
        id: wcfId,
        stageId: sWCF,
        stageType: 'WILDCARD_FINAL',
        matchNumber: 1,
        roundOrder: 8,
        status: 'SCHEDULED',
        nextMatchId: finalId
      });

      wcfContenders.forEach((item, idx) => {
        addParticipant({
          matchId: wcfId,
          order: idx + 1,
          sourceMatchId: item.sourceId,
          advancementSource: item.source
        });
        if (item.source === 'WINNER') {
          db.prepare("UPDATE matches SET next_match_id = ? WHERE id = ?").run(wcfId, item.sourceId);
        } else {
          db.prepare("UPDATE matches SET wildcard_match_id = ? WHERE id = ?").run(wcfId, item.sourceId);
        }
      });

      // 8. Grand Finals
      createMatch({ id: finalId, stageId: sFinal, stageType: 'FINAL', matchNumber: 1, roundOrder: 9, status: 'SCHEDULED' });
      addParticipant({ matchId: finalId, order: 1, sourceMatchId: wfId, advancementSource: 'WINNER' });
      addParticipant({ matchId: finalId, order: 2, sourceMatchId: wcfId, advancementSource: 'WINNER' });
    }
  })();

  console.log(`✅ Category ${categoryId} rebuilt with ${N} teams.`);
}

buildBracket('cat-heavyweight');
buildBracket('cat-lightweight');
