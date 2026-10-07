import db from './db';
import {
  Category,
  Team,
  TournamentStage,
  Match,
  MatchParticipant,
  StageType,
  TournamentCategory,
  TournamentOverview,
  TournamentSettings,
  DownstreamImpact,
  TeamStatus,
  RaceScheduleSlot,
  RaceSlotStatus
} from './types';
import {
  generateRound1Plan,
  generateWildcardProposal,
  calculateWildcardGroupSizes,
  calculateReEntryPlan,
  getStageDisplayName,
  getTargetPowerOfTwo
} from './tournament-engine';
import crypto from 'crypto';

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
export function getCategories(): Category[] {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    createdAt: r.created_at,
  }));
}

export function getCategoryByName(name: TournamentCategory): Category | null {
  const r = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as any;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    createdAt: r.created_at,
  };
}

export function getCategoryById(id: string): Category | null {
  const r = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    createdAt: r.created_at,
  };
}

// -------------------------------------------------------------
// TEAMS & 2-LIVES ENGINE
// -------------------------------------------------------------

/**
 * Calculates current lives remaining for a team based on the 2-lives rule.
 * Every team starts with 2 lives. Each completed match loss subtracts 1 life.
 */
export function calculateTeamLives(teamId: string): number {
  const lossRow = db.prepare(`
    SELECT COUNT(*) as loss_count
    FROM match_participants mp
    JOIN matches m ON mp.match_id = m.id
    WHERE mp.team_id = ? 
      AND m.status = 'COMPLETED' 
      AND mp.is_winner = 0
  `).get(teamId) as { loss_count: number };

  const losses = lossRow?.loss_count || 0;
  return Math.max(0, 2 - losses);
}

/**
 * Dynamically computes and synchronizes lives and status for a team:
 * - 2 lives: ACTIVE
 * - 1 life: WILDCARD (if their last completed match was a loss, eligible for second-chance wildcard) or ACTIVE (if they won their wildcard match)
 * - 0 lives: ELIMINATED (or FINALIST if lost in Grand Final)
 */
export function syncTeamLivesAndStatus(teamId: string): { lives: number; status: TeamStatus } {
  const lives = calculateTeamLives(teamId);
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
  if (!team) return { lives: 2, status: 'ACTIVE' };

  let status: TeamStatus = 'ACTIVE';

  // Check if team won final
  const wonFinal = db.prepare(`
    SELECT COUNT(*) as count
    FROM match_participants mp
    JOIN matches m ON mp.match_id = m.id
    WHERE mp.team_id = ? AND m.stage_type = 'FINAL' AND m.status = 'COMPLETED' AND mp.is_winner = 1
  `).get(teamId) as { count: number };

  if (wonFinal && wonFinal.count > 0) {
    status = 'CHAMPION';
  } else if (lives === 0) {
    // 2 losses suffered -> Eliminated from the tournament!
    const lostFinal = db.prepare(`
      SELECT COUNT(*) as count
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      WHERE mp.team_id = ? AND m.stage_type = 'FINAL' AND m.status = 'COMPLETED' AND mp.is_winner = 0
    `).get(teamId) as { count: number };
    status = (lostFinal && lostFinal.count > 0) ? 'FINALIST' : 'ELIMINATED';
  } else if (lives === 1) {
    // 1 life remaining. If their most recent completed match was a loss, they are in the Wildcard pool!
    const lastMatch = db.prepare(`
      SELECT mp.is_winner, m.stage_type
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      WHERE mp.team_id = ? AND m.status = 'COMPLETED'
      ORDER BY m.round_order DESC, m.completed_at DESC
      LIMIT 1
    `).get(teamId) as { is_winner: number; stage_type: string } | undefined;

    if (lastMatch && lastMatch.is_winner === 0) {
      status = 'WILDCARD';
    } else {
      status = 'ACTIVE';
    }
  } else {
    // 2 lives (0 losses)
    status = 'ACTIVE';
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE teams SET lives = ?, status = ?, updated_at = ? WHERE id = ?')
    .run(lives, status, now, teamId);

  return { lives, status };
}

export function getTeams(categoryId?: string): Team[] {
  let rows: any[];
  if (categoryId) {
    rows = db.prepare('SELECT * FROM teams WHERE category_id = ? ORDER BY seed ASC, name ASC').all(categoryId);
  } else {
    rows = db.prepare('SELECT * FROM teams ORDER BY name ASC').all();
  }

  return rows.map(r => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    robotName: r.robot_name,
    organization: r.organization,
    seed: r.seed,
    status: r.status,
    lives: r.lives !== undefined && r.lives !== null ? r.lives : calculateTeamLives(r.id),
    isWithdrawn: Boolean(r.is_withdrawn),
    logoUrl: r.logo_url || undefined,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getTeamById(id: string): Team | null {
  const r = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    robotName: r.robot_name,
    organization: r.organization,
    seed: r.seed,
    status: r.status,
    lives: r.lives !== undefined && r.lives !== null ? r.lives : calculateTeamLives(r.id),
    isWithdrawn: Boolean(r.is_withdrawn),
    logoUrl: r.logo_url || undefined,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createTeam(data: {
  categoryId: string;
  name: string;
  robotName?: string;
  organization?: string;
  seed?: number;
  logoUrl?: string;
  notes?: string;
}): Team {
  const id = `team-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO teams (id, category_id, name, robot_name, organization, seed, status, is_withdrawn, logo_url, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, ?)
  `).run(
    id,
    data.categoryId,
    data.name.trim(),
    data.robotName?.trim() || null,
    data.organization?.trim() || null,
    data.seed || null,
    data.logoUrl?.trim() || null,
    data.notes?.trim() || null,
    now,
    now
  );

  return getTeamById(id)!;
}

export function updateTeam(id: string, updates: Partial<Team>): Team | null {
  const current = getTeamById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE teams
    SET name = ?, robot_name = ?, organization = ?, seed = ?, status = ?, is_withdrawn = ?, logo_url = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updates.name !== undefined ? updates.name.trim() : current.name,
    updates.robotName !== undefined ? updates.robotName?.trim() || null : current.robotName,
    updates.organization !== undefined ? updates.organization?.trim() || null : current.organization,
    updates.seed !== undefined ? updates.seed : current.seed,
    updates.status !== undefined ? updates.status : current.status,
    updates.isWithdrawn !== undefined ? (updates.isWithdrawn ? 1 : 0) : (current.isWithdrawn ? 1 : 0),
    updates.logoUrl !== undefined ? updates.logoUrl?.trim() || null : current.logoUrl || null,
    updates.notes !== undefined ? updates.notes?.trim() || null : current.notes,
    now,
    id
  );

  return getTeamById(id);
}

export function deleteTeam(id: string): { success: boolean; error?: string } {
  // Check if team is used in match participants
  const used = db.prepare('SELECT COUNT(*) as count FROM match_participants WHERE team_id = ?').get(id) as { count: number };
  if (used.count > 0) {
    return {
      success: false,
      error: 'Cannot delete team because it is already part of tournament matches. You can mark it as withdrawn instead.'
    };
  }

  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return { success: true };
}

// -------------------------------------------------------------
// STAGES
// -------------------------------------------------------------
export function getStages(categoryId: string): TournamentStage[] {
  const rows = db.prepare('SELECT * FROM stages WHERE category_id = ? ORDER BY stage_order ASC').all(categoryId) as any[];
  return rows.map(r => ({
    id: r.id,
    categoryId: r.category_id,
    stageType: r.stage_type,
    stageOrder: r.stage_order,
    displayName: r.display_name,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }));
}

export function getActiveStage(categoryId: string): TournamentStage | null {
  const r = db.prepare("SELECT * FROM stages WHERE category_id = ? AND status = 'ACTIVE' ORDER BY stage_order ASC LIMIT 1").get(categoryId) as any;
  if (!r) return null;
  return {
    id: r.id,
    categoryId: r.category_id,
    stageType: r.stage_type,
    stageOrder: r.stage_order,
    displayName: r.display_name,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}

// -------------------------------------------------------------
// MATCHES & PARTICIPANTS
// -------------------------------------------------------------
export function getMatches(categoryId: string, stageId?: string): Match[] {
  let matchRows: any[];
  if (stageId) {
    matchRows = db.prepare('SELECT * FROM matches WHERE category_id = ? AND stage_id = ? ORDER BY match_number ASC').all(categoryId, stageId);
  } else {
    matchRows = db.prepare('SELECT * FROM matches WHERE category_id = ? ORDER BY round_order ASC, match_number ASC').all(categoryId);
  }

  if (matchRows.length === 0) return [];

  const matchIds = matchRows.map(m => m.id);
  const placeholders = matchIds.map(() => '?').join(',');

  const participantRows = db.prepare(`
    SELECT mp.*, t.name as team_name, t.robot_name, t.organization, t.status as team_status, t.lives as team_lives
    FROM match_participants mp
    LEFT JOIN teams t ON mp.team_id = t.id
    WHERE mp.match_id IN (${placeholders})
    ORDER BY mp.participant_order ASC
  `).all(...matchIds) as any[];

  const stageRows = db.prepare('SELECT id, display_name FROM stages WHERE category_id = ?').all(categoryId) as any[];
  const stageMap = new Map(stageRows.map(s => [s.id, s.display_name]));

  const participantsByMatch = new Map<string, MatchParticipant[]>();
  for (const p of participantRows) {
    if (!participantsByMatch.has(p.match_id)) {
      participantsByMatch.set(p.match_id, []);
    }
    participantsByMatch.get(p.match_id)!.push({
      id: p.id,
      matchId: p.match_id,
      teamId: p.team_id,
      placeholderText: p.placeholder_text,
      participantOrder: p.participant_order,
      isWinner: Boolean(p.is_winner),
      score: p.score,
      advancementSource: p.advancement_source,
      sourceMatchId: p.source_match_id,
      team: p.team_id ? {
        id: p.team_id,
        categoryId,
        name: p.team_name,
        robotName: p.robot_name,
        organization: p.organization,
        status: p.team_status,
        lives: p.team_lives !== undefined && p.team_lives !== null ? p.team_lives : calculateTeamLives(p.team_id),
        isWithdrawn: false,
        createdAt: '',
        updatedAt: '',
      } : null,
    });
  }

  // Preload winner teams
  const winnerTeamIds = matchRows.map(m => m.winner_team_id).filter(Boolean);
  const winnerMap = new Map<string, Team>();
  if (winnerTeamIds.length > 0) {
    const wPlaceholders = winnerTeamIds.map(() => '?').join(',');
    const wRows = db.prepare(`SELECT * FROM teams WHERE id IN (${wPlaceholders})`).all(...winnerTeamIds) as any[];
    for (const w of wRows) {
      winnerMap.set(w.id, {
        id: w.id,
        categoryId: w.category_id,
        name: w.name,
        robotName: w.robot_name,
        organization: w.organization,
        seed: w.seed,
        status: w.status,
        lives: w.lives !== undefined && w.lives !== null ? w.lives : calculateTeamLives(w.id),
        isWithdrawn: Boolean(w.is_withdrawn),
        notes: w.notes,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      });
    }
  }

  return matchRows.map(m => ({
    id: m.id,
    categoryId: m.category_id,
    stageId: m.stage_id,
    stageType: m.stage_type,
    stageName: stageMap.get(m.stage_id) || m.stage_type,
    matchNumber: m.match_number,
    roundOrder: m.round_order,
    status: m.status,
    winnerTeamId: m.winner_team_id,
    scheduledTime: m.scheduled_time,
    completedAt: m.completed_at,
    notes: m.notes,
    nextMatchId: m.next_match_id,
    wildcardMatchId: m.wildcard_match_id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    participants: participantsByMatch.get(m.id) || [],
    winnerTeam: m.winner_team_id ? winnerMap.get(m.winner_team_id) || null : null,
  }));
}

export function getMatchById(matchId: string): Match | null {
  const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
  if (!m) return null;

  const matches = getMatches(m.category_id, m.stage_id);
  return matches.find(item => item.id === matchId) || null;
}

// -------------------------------------------------------------
// SET MATCH WINNER & DOWNSTREAM CASCADES
// -------------------------------------------------------------
export function setMatchWinner(
  matchId: string,
  winnerTeamId: string,
  scores?: { [participantId: string]: number }
): { success: boolean; error?: string } {
  const match = getMatchById(matchId);
  if (!match) return { success: false, error: 'Match not found' };

  // Ensure winnerTeamId is actually in participants
  const winnerPart = match.participants.find(p => p.teamId === winnerTeamId);
  if (!winnerPart) {
    return { success: false, error: 'Winner team is not a participant in this match' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    // 1. Update match status
    db.prepare(`
      UPDATE matches
      SET status = 'COMPLETED', winner_team_id = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(winnerTeamId, now, now, matchId);

    // 2. Update participants and sync 2-lives status
    for (const p of match.participants) {
      const isWinner = p.teamId === winnerTeamId ? 1 : 0;
      const score = scores && scores[p.id] !== undefined ? scores[p.id] : (p.score || 0);
      db.prepare(`
        UPDATE match_participants
        SET is_winner = ?, score = ?
        WHERE id = ?
      `).run(isWinner, score, p.id);

      if (p.teamId) {
        syncTeamLivesAndStatus(p.teamId);
      }
    }

    // 3. Propagate winner to next match if linked
    if (match.nextMatchId) {
      // Find open slot in next match
      const nextMatch = getMatchById(match.nextMatchId);
      if (nextMatch) {
        // Check if this source match already has a participant slot assigned
        const existingSlot = nextMatch.participants.find(p => p.sourceMatchId === matchId);
        if (existingSlot) {
          db.prepare(`
            UPDATE match_participants
            SET team_id = ?, placeholder_text = NULL
            WHERE id = ?
          `).run(winnerTeamId, existingSlot.id);
        } else {
          // Fill first empty slot or placeholder
          const emptySlot = nextMatch.participants.find(p => !p.teamId);
          if (emptySlot) {
            db.prepare(`
              UPDATE match_participants
              SET team_id = ?, placeholder_text = NULL, source_match_id = ?
              WHERE id = ?
            `).run(winnerTeamId, matchId, emptySlot.id);
          }
        }
      }
    }

    // 4. Check if all matches in stage are completed to mark stage COMPLETED
    const remainingInStage = db.prepare(`
      SELECT COUNT(*) as count FROM matches
      WHERE stage_id = ? AND status != 'COMPLETED' AND status != 'BYE'
    `).get(match.stageId) as { count: number };

    if (remainingInStage.count === 0) {
      db.prepare(`
        UPDATE stages
        SET status = 'COMPLETED', completed_at = ?
        WHERE id = ?
      `).run(now, match.stageId);
    }
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// DOWNSTREAM IMPACT DETECTION & WINNER CORRECTION
// -------------------------------------------------------------
export function getDownstreamImpact(matchId: string): DownstreamImpact {
  const match = getMatchById(matchId);
  if (!match) {
    return { affectedMatches: [], hasCompletedMatches: false, message: 'Match not found' };
  }

  const affected: DownstreamImpact['affectedMatches'] = [];
  let hasCompleted = false;

  // Find all matches that have participants originating from this match
  const downstreamMatches = db.prepare(`
    SELECT DISTINCT m.*, mp.id as participant_id, mp.team_id, mp.placeholder_text
    FROM matches m
    JOIN match_participants mp ON m.id = mp.match_id
    WHERE mp.source_match_id = ? OR m.id = ?
  `).all(matchId, match.nextMatchId || '') as any[];

  for (const dm of downstreamMatches) {
    if (dm.id === matchId) continue;
    if (dm.status === 'COMPLETED') {
      hasCompleted = true;
    }
    affected.push({
      matchId: dm.id,
      matchNumber: dm.match_number,
      stageType: dm.stage_type,
      currentParticipants: [],
      affectedTeam: match.winnerTeam?.name || 'Current Winner',
      action: dm.status === 'COMPLETED' ? 'RESET_WINNER' : 'REPLACE_PARTICIPANT'
    });
  }

  const message = affected.length === 0
    ? 'No downstream matches have been generated or played yet. Changing the winner is completely safe.'
    : `Warning: This match feeds into ${affected.length} downstream match(es). ${
        hasCompleted
          ? 'Some downstream matches are ALREADY COMPLETED and will have their results cleared and participants updated!'
          : 'Downstream match participants will be updated safely.'
      }`;

  return {
    affectedMatches: affected,
    hasCompletedMatches: hasCompleted,
    message
  };
}

export function correctMatchWinner(
  matchId: string,
  newWinnerTeamId: string
): { success: boolean; error?: string } {
  const match = getMatchById(matchId);
  if (!match) return { success: false, error: 'Match not found' };

  const oldWinnerId = match.winnerTeamId;
  if (oldWinnerId === newWinnerTeamId) {
    return { success: true }; // No change
  }

  const transaction = db.transaction(() => {
    // 1. If downstream matches exist that used oldWinnerId, reset their winner and replace teamId
    const dependentParticipants = db.prepare(`
      SELECT mp.*, m.id as match_id, m.status as match_status
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      WHERE (mp.source_match_id = ? OR mp.team_id = ?) AND m.id != ?
    `).all(matchId, oldWinnerId, matchId) as any[];

    for (const dp of dependentParticipants) {
      // If downstream match was COMPLETED, revert it to SCHEDULED
      if (dp.match_status === 'COMPLETED') {
        db.prepare(`
          UPDATE matches
          SET status = 'SCHEDULED', winner_team_id = NULL, completed_at = NULL
          WHERE id = ?
        `).run(dp.match_id);

        db.prepare(`
          UPDATE match_participants
          SET is_winner = 0
          WHERE match_id = ?
        `).run(dp.match_id);
      }

      // Replace old winner with new winner
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?
        WHERE id = ?
      `).run(newWinnerTeamId, dp.id);
    }

    // 2. Set new winner on this match
    setMatchWinner(matchId, newWinnerTeamId);

    // 3. Re-sync both old and new winner statuses and lives
    if (oldWinnerId) {
      syncTeamLivesAndStatus(oldWinnerId);
    }
    syncTeamLivesAndStatus(newWinnerTeamId);
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// TOURNAMENT STAGE GENERATION
// -------------------------------------------------------------

/**
 * PHASE 2: Round 1 Generator
 */
export function startRound1(
  categoryId: string,
  manualByeTeamId?: string,
  customPairings?: { team1Id: string; team2Id: string }[]
): { success: boolean; stageId?: string; error?: string } {
  const teams = getTeams(categoryId).filter(t => !t.isWithdrawn);
  if (teams.length < 2) {
    return { success: false, error: 'At least 2 active teams are required to start the tournament.' };
  }

  // Check if Round 1 stage already exists
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'ROUND_1'").get(categoryId) as any;
  if (existing) {
    return { success: false, error: 'Round 1 has already been generated. Reset tournament if you wish to start over.' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-r1-${crypto.randomUUID()}`;

    // 1. Create Stage
    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'ROUND_1', 1, 'Round 1', 'ACTIVE', ?)
    `).run(stageId, categoryId, now);

    // Ensure all teams in category begin with 2 lives and ACTIVE status
    db.prepare("UPDATE teams SET lives = 2, status = 'ACTIVE' WHERE category_id = ?").run(categoryId);

    let matchesToCreate: { matchNumber: number; team1: Team; team2?: Team; isBye?: boolean }[] = [];

    if (customPairings && customPairings.length > 0) {
      // Manual pairings provided by admin
      const teamMap = new Map(teams.map(t => [t.id, t]));
      customPairings.forEach((p, idx) => {
        matchesToCreate.push({
          matchNumber: idx + 1,
          team1: teamMap.get(p.team1Id)!,
          team2: teamMap.get(p.team2Id)!,
        });
      });
      if (manualByeTeamId) {
        const byeTeam = teamMap.get(manualByeTeamId);
        if (byeTeam) {
          matchesToCreate.push({
            matchNumber: matchesToCreate.length + 1,
            team1: byeTeam,
            isBye: true
          });
        }
      }
    } else {
      // Generated pairing
      const plan = generateRound1Plan(teams, manualByeTeamId, true);
      plan.matches.forEach(m => {
        matchesToCreate.push({
          matchNumber: m.matchNumber,
          team1: m.team1,
          team2: m.team2
        });
      });
      if (plan.byeTeam) {
        matchesToCreate.push({
          matchNumber: matchesToCreate.length + 1,
          team1: plan.byeTeam,
          isBye: true
        });
      }
    }

    // 2. Insert matches and participants
    for (const m of matchesToCreate) {
      const matchId = `match-${crypto.randomUUID()}`;
      const isBye = Boolean(m.isBye);

      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, winner_team_id, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, 'ROUND_1', ?, 1, ?, ?, ?, ?, ?)
      `).run(
        matchId,
        categoryId,
        stageId,
        m.matchNumber,
        isBye ? 'BYE' : 'SCHEDULED',
        isBye ? m.team1.id : null,
        isBye ? now : null,
        now,
        now
      );

      // Participant 1
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(`mp-${crypto.randomUUID()}`, matchId, m.team1.id, isBye ? 1 : 0, isBye ? 'ROUND_1_BYE' : 'SEED');

      // Participant 2 (if not BYE)
      if (m.team2) {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, 2, 0, 'SEED')
        `).run(`mp-${crypto.randomUUID()}`, matchId, m.team2.id);
      }
    }

    // Update teams status to ACTIVE
    db.prepare("UPDATE teams SET status = 'ACTIVE' WHERE category_id = ?").run(categoryId);
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * PHASE 3: Wildcard Stage Generator
 * Supports any stage: ROUND_1, QUARTERFINAL, SEMIFINAL
 * Follows the 2-lives rule: only teams with exactly 1 life remaining enter the Wildcard pool!
 */
export function generateWildcardStage(
  categoryId: string,
  sourceStageType: StageType = 'ROUND_1',
  manualGroups?: string[][]
): { success: boolean; stageId?: string; stageType?: StageType; error?: string } {
  let targetStageType: StageType = 'WILDCARD';
  let displayName = 'Round 1 Wildcard';
  let stageOrder = 2;

  if (sourceStageType === 'QUARTERFINAL') {
    targetStageType = 'QUARTERFINAL_WILDCARD';
    displayName = 'Quarterfinals Wildcard';
    stageOrder = 4;
  } else if (sourceStageType === 'SEMIFINAL') {
    targetStageType = 'SEMIFINAL_WILDCARD';
    displayName = 'Wildcard Final';
    stageOrder = 6;
  }

  // Check if Wildcard for this stage already exists
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = ?").get(categoryId, targetStageType) as any;
  if (existing) {
    return { success: false, error: `${displayName} has already been generated.` };
  }

  let eligibleTeamIds: string[] = [];

  if (targetStageType === 'WILDCARD') {
    // Round 1 Wildcard: Losers of Round 1
    const r1Matches = db.prepare(`
      SELECT m.id, m.winner_team_id, mp.team_id
      FROM matches m
      JOIN match_participants mp ON m.id = mp.match_id
      WHERE m.category_id = ? AND m.stage_type = 'ROUND_1' AND m.status = 'COMPLETED'
    `).all(categoryId) as any[];

    for (const r of r1Matches) {
      if (r.team_id && r.team_id !== r.winner_team_id && !eligibleTeamIds.includes(r.team_id)) {
        eligibleTeamIds.push(r.team_id);
      }
    }
  } else if (targetStageType === 'QUARTERFINAL_WILDCARD') {
    // QF Wildcard: Winners of Round 1 Wildcard + Losers of Quarterfinals
    const wc1Matches = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'WILDCARD' AND status = 'COMPLETED'
    `).all(categoryId) as { winner_team_id: string }[];
    const wc1Winners = wc1Matches.map(m => m.winner_team_id).filter(Boolean);

    const qfMatches = db.prepare(`
      SELECT m.id, m.winner_team_id, mp.team_id
      FROM matches m
      JOIN match_participants mp ON m.id = mp.match_id
      WHERE m.category_id = ? AND m.stage_type = 'QUARTERFINAL' AND m.status = 'COMPLETED'
    `).all(categoryId) as any[];
    const qfLosers: string[] = [];
    for (const r of qfMatches) {
      if (r.team_id && r.team_id !== r.winner_team_id && !qfLosers.includes(r.team_id)) {
        qfLosers.push(r.team_id);
      }
    }

    eligibleTeamIds = Array.from(new Set([...wc1Winners, ...qfLosers]));
  } else if (targetStageType === 'SEMIFINAL_WILDCARD') {
    // SF Wildcard / Wildcard Final: Winners of QF Wildcard + Losers of Semifinals
    const qfwcMatches = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND (stage_type = 'QUARTERFINAL_WILDCARD' OR stage_type = 'WILDCARD') AND status = 'COMPLETED'
    `).all(categoryId) as { winner_team_id: string }[];
    const prevWcWinners = qfwcMatches.map(m => m.winner_team_id).filter(Boolean);

    const sfMatches = db.prepare(`
      SELECT m.id, m.winner_team_id, mp.team_id
      FROM matches m
      JOIN match_participants mp ON m.id = mp.match_id
      WHERE m.category_id = ? AND m.stage_type = 'SEMIFINAL' AND m.status = 'COMPLETED'
    `).all(categoryId) as any[];
    const sfLosers: string[] = [];
    for (const r of sfMatches) {
      if (r.team_id && r.team_id !== r.winner_team_id && !sfLosers.includes(r.team_id)) {
        sfLosers.push(r.team_id);
      }
    }

    eligibleTeamIds = Array.from(new Set([...prevWcWinners, ...sfLosers]));
  }

  if (eligibleTeamIds.length === 0) {
    return { success: false, error: `No eligible teams found for ${displayName}.` };
  }

  const poolTeams = getTeams(categoryId).filter(t => eligibleTeamIds.includes(t.id));

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-wc-${crypto.randomUUID()}`;

    // Create Wildcard stage
    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(stageId, categoryId, targetStageType, stageOrder, displayName, now);

    let groupsToCreate: { matchNumber: number; teamIds: string[] }[] = [];

    if (manualGroups && manualGroups.length > 0) {
      manualGroups.forEach((g, idx) => {
        groupsToCreate.push({ matchNumber: idx + 1, teamIds: g });
      });
    } else {
      const proposal = generateWildcardProposal(poolTeams);
      proposal.groups.forEach(g => {
        groupsToCreate.push({
          matchNumber: g.matchNumber,
          teamIds: g.teams.map(t => t.id)
        });
      });
      // Fallback
      if (groupsToCreate.length === 0 && poolTeams.length >= 1) {
        groupsToCreate.push({
          matchNumber: 1,
          teamIds: poolTeams.map(t => t.id)
        });
      }
    }

    // Insert Wildcard matches (preferring 3-way, falling back to 2-way)
    for (const g of groupsToCreate) {
      const matchId = `match-${crypto.randomUUID()}`;

      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
      `).run(matchId, categoryId, stageId, targetStageType, g.matchNumber, stageOrder, now, now);

      g.teamIds.forEach((tId, idx) => {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(`mp-${crypto.randomUUID()}`, matchId, tId, idx + 1, `${targetStageType}_CONTENDER`);
      });
    }
  });

  try {
    transaction();
    return { success: true, stageType: targetStageType };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates Quarterfinals for Round 1 Winners (Main Bracket 2v2).
 */
export function generateQuarterfinals(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'QUARTERFINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Quarterfinals stage already exists.' };
  }

  // Round 1 winners advance in the Main Bracket (2v2)
  const r1Matches = db.prepare(`
    SELECT winner_team_id FROM matches WHERE category_id = ? AND stage_type = 'ROUND_1' AND (status = 'COMPLETED' OR status = 'BYE')
  `).all(categoryId) as { winner_team_id: string }[];
  const r1WinnerIds = r1Matches.map(m => m.winner_team_id).filter(Boolean);
  const qfTeams = getTeams(categoryId).filter(t => r1WinnerIds.includes(t.id));

  if (qfTeams.length < 2) {
    return { success: false, error: 'Not enough Round 1 winners to generate Quarterfinals.' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-qf-${crypto.randomUUID()}`;
    const stageOrder = 3;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'QUARTERFINAL', ?, 'Quarterfinals', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    const numMatches = Math.floor(qfTeams.length / 2);
    for (let i = 0; i < numMatches; i++) {
      const matchId = `match-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
        VALUES (?, ?, ?, 'QUARTERFINAL', ?, ?, 'SCHEDULED', ?, ?)
      `).run(matchId, categoryId, stageId, i + 1, stageOrder, now, now);

      if (qfTeams[i * 2]) {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, 1, 0, 'R1_WINNER')
        `).run(`mp-${crypto.randomUUID()}`, matchId, qfTeams[i * 2].id);
      }
      if (qfTeams[i * 2 + 1]) {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, 2, 0, 'R1_WINNER')
        `).run(`mp-${crypto.randomUUID()}`, matchId, qfTeams[i * 2 + 1].id);
      }
    }
  });

  try {
    transaction();
    return { success: true, nextStage: 'QUARTERFINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates Semifinal stage (Main Bracket 2v2).
 */
export function generateSemifinals(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'SEMIFINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Semifinals stage already exists.' };
  }

  // Quarterfinal winners (or Round 1 winners if small tournament)
  const qfMatches = db.prepare(`
    SELECT winner_team_id FROM matches WHERE category_id = ? AND stage_type = 'QUARTERFINAL' AND status = 'COMPLETED'
  `).all(categoryId) as { winner_team_id: string }[];
  let qualifiedIds = qfMatches.map(m => m.winner_team_id).filter(Boolean);

  if (qualifiedIds.length === 0) {
    const r1Matches = db.prepare(`
      SELECT winner_team_id FROM matches WHERE category_id = ? AND stage_type = 'ROUND_1' AND (status = 'COMPLETED' OR status = 'BYE')
    `).all(categoryId) as { winner_team_id: string }[];
    qualifiedIds = r1Matches.map(m => m.winner_team_id).filter(Boolean);
  }

  const semiTeams = getTeams(categoryId).filter(t => qualifiedIds.includes(t.id));
  if (semiTeams.length < 2) {
    return { success: false, error: 'Not enough qualified teams to generate Semifinals.' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-semi-${crypto.randomUUID()}`;
    const stageOrder = 5;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'SEMIFINAL', ?, 'Semifinals', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    const numMatches = Math.floor(semiTeams.length / 2);
    for (let i = 0; i < numMatches; i++) {
      const matchId = `match-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
        VALUES (?, ?, ?, 'SEMIFINAL', ?, ?, 'SCHEDULED', ?, ?)
      `).run(matchId, categoryId, stageId, i + 1, stageOrder, now, now);

      if (semiTeams[i * 2]) {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, 1, 0, 'MAIN_ADVANCEMENT')
        `).run(`mp-${crypto.randomUUID()}`, matchId, semiTeams[i * 2].id);
      }
      if (semiTeams[i * 2 + 1]) {
        db.prepare(`
          INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
          VALUES (?, ?, ?, 2, 0, 'MAIN_ADVANCEMENT')
        `).run(`mp-${crypto.randomUUID()}`, matchId, semiTeams[i * 2 + 1].id);
      }
    }
  });

  try {
    transaction();
    return { success: true, nextStage: 'SEMIFINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates WINNERS_FINAL stage:
 * The 2 winners from Semifinals battle head-to-head (2 by 2)
 * to decide the ONE Winner of the Upper Bracket!
 * The winner advances to Grand Finals, loser drops to Wildcard Final.
 */
export function generateWinnersFinal(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'WINNERS_FINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Winners Final stage already exists.' };
  }

  // Fetch winners from Semifinals
  const sfMatches = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'SEMIFINAL' AND (status = 'COMPLETED' OR status = 'BYE')
    ORDER BY match_number ASC
  `).all(categoryId) as { winner_team_id: string }[];
  let winnerIds = Array.from(new Set(sfMatches.map(m => m.winner_team_id).filter(Boolean)));

  // Fallback if no Semifinals (e.g. smaller bracket)
  if (winnerIds.length < 2) {
    const qfMatches = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'QUARTERFINAL' AND (status = 'COMPLETED' OR status = 'BYE')
      ORDER BY match_number ASC
    `).all(categoryId) as { winner_team_id: string }[];
    winnerIds = Array.from(new Set(qfMatches.map(m => m.winner_team_id).filter(Boolean)));
  }

  const teams = getTeams(categoryId).filter(t => winnerIds.includes(t.id));
  if (teams.length < 2) {
    return { success: false, error: 'At least 2 winners from previous round are required for Winners Final.' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-wf-${crypto.randomUUID()}`;
    const stageOrder = 7;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'WINNERS_FINAL', ?, 'Winners Final', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    const matchId = `match-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
      VALUES (?, ?, ?, 'WINNERS_FINAL', 1, ?, 'SCHEDULED', ?, ?)
    `).run(matchId, categoryId, stageId, stageOrder, now, now);

    db.prepare(`
      INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
      VALUES (?, ?, ?, 1, 0, 'MAIN_ADVANCEMENT')
    `).run(`mp-${crypto.randomUUID()}`, matchId, teams[0].id);

    db.prepare(`
      INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
      VALUES (?, ?, ?, 2, 0, 'MAIN_ADVANCEMENT')
    `).run(`mp-${crypto.randomUUID()}`, matchId, teams[1].id);
  });

  try {
    transaction();
    return { success: true, nextStage: 'WINNERS_FINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates WILDCARD_SEMIFINAL stage:
 * Takes surviving winners from Semifinals Wildcard + loser from Winners Final.
 * If > 3 teams, creates Wildcard Semifinals (e.g. 2 matches of 2v2).
 * If <= 3 teams, goes directly to Wildcard Final.
 */
export function generateWildcardSemifinal(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'WILDCARD_SEMIFINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Wildcard Semifinal stage already exists.' };
  }

  // 1. Get surviving winners from SEMIFINAL_WILDCARD
  const sfwcMatches = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'SEMIFINAL_WILDCARD' AND status = 'COMPLETED'
    ORDER BY match_number ASC
  `).all(categoryId) as { winner_team_id: string }[];
  let eligibleTeamIds = Array.from(new Set(sfwcMatches.map(m => m.winner_team_id).filter(Boolean)));

  // 2. Plus the loser of WINNERS_FINAL (if WINNERS_FINAL has been completed)
  const wfMatch = db.prepare(`
    SELECT m.id, m.winner_team_id, mp.team_id
    FROM matches m
    JOIN match_participants mp ON m.id = mp.match_id
    WHERE m.category_id = ? AND m.stage_type = 'WINNERS_FINAL' AND m.status = 'COMPLETED'
  `).all(categoryId) as any[];
  for (const r of wfMatch) {
    if (r.team_id && r.team_id !== r.winner_team_id && !eligibleTeamIds.includes(r.team_id)) {
      eligibleTeamIds.push(r.team_id);
    }
  }

  // If SEMIFINAL_WILDCARD didn't exist, fallback to QUARTERFINAL_WILDCARD
  if (eligibleTeamIds.length === 0) {
    const qfwcMatches = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'QUARTERFINAL_WILDCARD' AND status = 'COMPLETED'
    `).all(categoryId) as { winner_team_id: string }[];
    eligibleTeamIds = Array.from(new Set(qfwcMatches.map(m => m.winner_team_id).filter(Boolean)));
  }

  const poolTeams = getTeams(categoryId).filter(t => eligibleTeamIds.includes(t.id));
  if (poolTeams.length === 0) {
    return { success: false, error: 'No eligible teams found for Wildcard Semifinals.' };
  }

  // If 3 or fewer teams, jump directly to Wildcard Final (single match)
  if (poolTeams.length <= 3) {
    return generateWildcardFinal(categoryId);
  }

  // Group pool teams using 3-by-3 / 2-by-2 rules (e.g. [2, 2])
  const groupSizes = calculateWildcardGroupSizes(poolTeams.length);

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-wcs-${crypto.randomUUID()}`;
    const stageOrder = 8;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'WILDCARD_SEMIFINAL', ?, 'Wildcard Semifinals', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    let teamIdx = 0;
    for (let matchIdx = 0; matchIdx < groupSizes.length; matchIdx++) {
      const size = groupSizes[matchIdx];
      const matchId = `match-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
        VALUES (?, ?, ?, 'WILDCARD_SEMIFINAL', ?, ?, 'SCHEDULED', ?, ?)
      `).run(matchId, categoryId, stageId, matchIdx + 1, stageOrder, now, now);

      for (let p = 0; p < size; p++) {
        const team = poolTeams[teamIdx++];
        if (team) {
          db.prepare(`
            INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
            VALUES (?, ?, ?, ?, 0, 'WILDCARD_POOL')
          `).run(`mp-${crypto.randomUUID()}`, matchId, team.id, p + 1);
        }
      }
    }
  });

  try {
    transaction();
    return { success: true, nextStage: 'WILDCARD_SEMIFINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates WILDCARD_FINAL stage:
 * Battles surviving winners from Wildcard Semifinal (or previous Wildcard round)
 * down to EXACTLY ONE Wildcard Champion in a single title-decider match!
 */
export function generateWildcardFinal(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'WILDCARD_FINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Wildcard Final stage already exists.' };
  }

  // 1. Get surviving winners from WILDCARD_SEMIFINAL
  const wcsMatches = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'WILDCARD_SEMIFINAL' AND status = 'COMPLETED'
    ORDER BY match_number ASC
  `).all(categoryId) as { winner_team_id: string }[];
  let eligibleTeamIds = Array.from(new Set(wcsMatches.map(m => m.winner_team_id).filter(Boolean)));

  // If WILDCARD_SEMIFINAL wasn't used or had 0, check SEMIFINAL_WILDCARD + WINNERS_FINAL loser
  if (eligibleTeamIds.length === 0) {
    const sfwcMatches = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'SEMIFINAL_WILDCARD' AND status = 'COMPLETED'
      ORDER BY match_number ASC
    `).all(categoryId) as { winner_team_id: string }[];
    eligibleTeamIds = Array.from(new Set(sfwcMatches.map(m => m.winner_team_id).filter(Boolean)));

    const wfMatch = db.prepare(`
      SELECT m.id, m.winner_team_id, mp.team_id
      FROM matches m
      JOIN match_participants mp ON m.id = mp.match_id
      WHERE m.category_id = ? AND m.stage_type = 'WINNERS_FINAL' AND m.status = 'COMPLETED'
    `).all(categoryId) as any[];
    for (const r of wfMatch) {
      if (r.team_id && r.team_id !== r.winner_team_id && !eligibleTeamIds.includes(r.team_id)) {
        eligibleTeamIds.push(r.team_id);
      }
    }
  }

  const poolTeams = getTeams(categoryId).filter(t => eligibleTeamIds.includes(t.id));
  if (poolTeams.length === 0) {
    return { success: false, error: 'No eligible teams found for Wildcard Final.' };
  }

  if (poolTeams.length === 1) {
    return generateFinals(categoryId);
  }

  // WILDCARD_FINAL creates EXACTLY ONE MATCH to crown the single Wildcard Champion!
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-wcf-${crypto.randomUUID()}`;
    const stageOrder = 9;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'WILDCARD_FINAL', ?, 'Wildcard Final Decider', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    const matchId = `match-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
      VALUES (?, ?, ?, 'WILDCARD_FINAL', 1, ?, 'SCHEDULED', ?, ?)
    `).run(matchId, categoryId, stageId, stageOrder, now, now);

    for (let p = 0; p < poolTeams.length; p++) {
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
        VALUES (?, ?, ?, ?, 0, 'WILDCARD_POOL')
      `).run(`mp-${crypto.randomUUID()}`, matchId, poolTeams[p].id, p + 1);
    }
  });

  try {
    transaction();
    return { success: true, nextStage: 'WILDCARD_FINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates Grand Finals stage:
 * Battles the Winners Bracket Champion (winner of Upper winning matches)
 * VS the Wildcard Bracket Champion (winner of Lower wildcard/loser matches)!
 */
export function generateFinals(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const existing = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'FINAL'").get(categoryId);
  if (existing) {
    return { success: false, error: 'Finals stage already exists.' };
  }

  // 1. Find the WINNERS BRACKET CHAMPION
  // Check WINNERS_FINAL first
  const wfWinnerRow = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'WINNERS_FINAL' AND status = 'COMPLETED'
    LIMIT 1
  `).get(categoryId) as { winner_team_id: string } | undefined;

  let winnersChampionId = wfWinnerRow?.winner_team_id;

  // Fallbacks if WINNERS_FINAL was not present
  if (!winnersChampionId) {
    const sfWinnerRow = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'SEMIFINAL' AND status = 'COMPLETED'
      ORDER BY round_order DESC, match_number ASC
      LIMIT 1
    `).get(categoryId) as { winner_team_id: string } | undefined;
    winnersChampionId = sfWinnerRow?.winner_team_id;
  }
  if (!winnersChampionId) {
    const qfWinnerRow = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = 'QUARTERFINAL' AND status = 'COMPLETED'
      LIMIT 1
    `).get(categoryId) as { winner_team_id: string } | undefined;
    winnersChampionId = qfWinnerRow?.winner_team_id;
  }

  // 2. Find the WILDCARD BRACKET CHAMPION
  const wcStages = ['WILDCARD_FINAL', 'SEMIFINAL_WILDCARD', 'QUARTERFINAL_WILDCARD', 'WILDCARD'];
  let wildcardChampionId: string | undefined = undefined;

  for (const st of wcStages) {
    const wcWinnerRow = db.prepare(`
      SELECT winner_team_id FROM matches
      WHERE category_id = ? AND stage_type = ? AND status = 'COMPLETED'
      AND winner_team_id != ?
      ORDER BY match_number DESC
      LIMIT 1
    `).get(categoryId, st, winnersChampionId || '') as { winner_team_id: string } | undefined;

    if (wcWinnerRow?.winner_team_id) {
      wildcardChampionId = wcWinnerRow.winner_team_id;
      break;
    }
  }

  if (!winnersChampionId || !wildcardChampionId) {
    return { success: false, error: 'Could not determine both Winners Bracket Champion and Wildcard Champion for Grand Finals.' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const stageId = `stage-final-${crypto.randomUUID()}`;
    const stageOrder = 10;

    db.prepare(`
      INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
      VALUES (?, ?, 'FINAL', ?, 'Grand Finals', 'ACTIVE', ?)
    `).run(stageId, categoryId, stageOrder, now);

    const matchId = `match-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO matches (id, category_id, stage_id, stage_type, match_number, round_order, status, created_at, updated_at)
      VALUES (?, ?, ?, 'FINAL', 1, ?, 'SCHEDULED', ?, ?)
    `).run(matchId, categoryId, stageId, stageOrder, now, now);

    // Participant 1: Winners Bracket Champion
    db.prepare(`
      INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
      VALUES (?, ?, ?, 1, 0, 'WINNERS_BRACKET_CHAMPION')
    `).run(`mp-${crypto.randomUUID()}`, matchId, winnersChampionId);

    // Participant 2: Wildcard Bracket Champion
    db.prepare(`
      INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, advancement_source)
      VALUES (?, ?, ?, 2, 0, 'WILDCARD_BRACKET_CHAMPION')
    `).run(`mp-${crypto.randomUUID()}`, matchId, wildcardChampionId);
  });

  try {
    transaction();
    return { success: true, nextStage: 'FINAL' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate Next Knockout Stage following the dual-bracket system:
 * ROUND_1 -> WILDCARD -> QUARTERFINAL -> QUARTERFINAL_WILDCARD -> SEMIFINAL -> SEMIFINAL_WILDCARD -> WINNERS_FINAL -> WILDCARD_SEMIFINAL -> WILDCARD_FINAL -> FINAL -> COMPLETED
 */
export function generateNextStage(categoryId: string): { success: boolean; nextStage?: StageType; error?: string } {
  const activeStage = getActiveStage(categoryId);

  if (activeStage) {
    // Check if active stage is fully completed
    const pendingMatches = db.prepare(`
      SELECT COUNT(*) as count FROM matches
      WHERE stage_id = ? AND status != 'COMPLETED' AND status != 'BYE'
    `).get(activeStage.id) as { count: number };

    if (pendingMatches.count > 0) {
      return { success: false, error: `Current stage (${activeStage.displayName}) has unfinished matches.` };
    }

    // Mark current stage completed
    db.prepare("UPDATE stages SET status = 'COMPLETED', completed_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      activeStage.id
    );
  }

  // Determine what stage comes next
  const completedStages = db.prepare(`
    SELECT stage_type FROM stages WHERE category_id = ? AND status = 'COMPLETED' ORDER BY stage_order ASC
  `).all(categoryId) as { stage_type: StageType }[];

  const lastCompleted = completedStages[completedStages.length - 1]?.stage_type;

  if (!lastCompleted) {
    return { success: false, error: 'No completed stages found to advance from.' };
  }

  if (lastCompleted === 'ROUND_1') {
    return generateWildcardStage(categoryId, 'ROUND_1');
  }

  if (lastCompleted === 'WILDCARD') {
    // Check how many R1 winners exist
    const r1Winners = db.prepare(`
      SELECT COUNT(DISTINCT winner_team_id) as count FROM matches
      WHERE category_id = ? AND stage_type = 'ROUND_1' AND (status = 'COMPLETED' OR status = 'BYE')
    `).get(categoryId) as { count: number };

    if (r1Winners.count > 4) {
      return generateQuarterfinals(categoryId);
    } else {
      return generateSemifinals(categoryId);
    }
  }

  if (lastCompleted === 'QUARTERFINAL') {
    return generateWildcardStage(categoryId, 'QUARTERFINAL');
  }

  if (lastCompleted === 'QUARTERFINAL_WILDCARD') {
    return generateSemifinals(categoryId);
  }

  if (lastCompleted === 'SEMIFINAL') {
    return generateWildcardStage(categoryId, 'SEMIFINAL');
  }

  if (lastCompleted === 'SEMIFINAL_WILDCARD') {
    return generateWinnersFinal(categoryId);
  }

  if (lastCompleted === 'WINNERS_FINAL') {
    return generateWildcardSemifinal(categoryId);
  }

  if (lastCompleted === 'WILDCARD_SEMIFINAL') {
    return generateWildcardFinal(categoryId);
  }

  if (lastCompleted === 'WILDCARD_FINAL') {
    return generateFinals(categoryId);
  }

  if (lastCompleted === 'FINAL') {
    // Final completed: set Champion
    const finalMatch = db.prepare(`
      SELECT winner_team_id FROM matches WHERE category_id = ? AND stage_type = 'FINAL' AND status = 'COMPLETED'
    `).get(categoryId) as { winner_team_id?: string } | undefined;

    if (finalMatch?.winner_team_id) {
      db.prepare("UPDATE teams SET status = 'CHAMPION' WHERE id = ?").run(finalMatch.winner_team_id);
    }

    return { success: true, nextStage: 'COMPLETED' };
  }

  return { success: false, error: `No subsequent stage rule defined for ${lastCompleted}.` };
}

// Backward compatibility alias
export const generateReEntryOrKnockoutStage = generateNextStage;

// -------------------------------------------------------------
// RESET TOURNAMENT
// -------------------------------------------------------------
export function resetCategoryTournament(categoryId: string): { success: boolean; error?: string } {
  const transaction = db.transaction(() => {
    // Delete advancement links
    db.prepare(`
      DELETE FROM advancement_links WHERE source_match_id IN (SELECT id FROM matches WHERE category_id = ?)
    `).run(categoryId);

    // Delete match participants
    db.prepare(`
      DELETE FROM match_participants WHERE match_id IN (SELECT id FROM matches WHERE category_id = ?)
    `).run(categoryId);

    // Delete matches
    db.prepare('DELETE FROM matches WHERE category_id = ?').run(categoryId);

    // Delete stages
    db.prepare('DELETE FROM stages WHERE category_id = ?').run(categoryId);

    // Reset teams to ACTIVE with 2 lives
    db.prepare("UPDATE teams SET status = 'ACTIVE', lives = 2 WHERE category_id = ?").run(categoryId);
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// TOURNAMENT OVERVIEW / PUBLIC DASHBOARD STATE
// -------------------------------------------------------------
export function getTournamentOverview(categoryId: string): TournamentOverview | null {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;

  const stages = getStages(categoryId);
  const activeStage = getActiveStage(categoryId);
  const matches = getMatches(categoryId);
  const teams = getTeams(categoryId);

  const completedMatches = matches.filter(m => m.status === 'COMPLETED' || m.status === 'BYE');
  const liveMatch = matches.find(m => m.status === 'LIVE') || null;
  const upNextMatch = matches.find(m => m.status === 'SCHEDULED' && (!liveMatch || m.id !== liveMatch.id)) || null;

  let champion: Team | null = null;
  let runnerUp: Team | null = null;
  let secondRunnerUp: Team | null = null;

  const finalMatch = matches.find(m => m.stageType === 'FINAL' && m.status === 'COMPLETED');
  if (finalMatch && finalMatch.winnerTeamId) {
    champion = teams.find(t => t.id === finalMatch.winnerTeamId) || null;
    // 1st Runner-Up is the final match loser
    const loserPart = finalMatch.participants.find(p => p.teamId && p.teamId !== finalMatch.winnerTeamId);
    if (loserPart?.teamId) {
      runnerUp = teams.find(t => t.id === loserPart.teamId) || null;
    }
  }

  // 2nd Runner-Up is the final wildcard round loser (the last eliminated contender before the Grand Final)
  const wildcardFinalMatch = matches.find(m => m.stageType === 'WILDCARD_FINAL' && (m.status === 'COMPLETED' || m.status === 'BYE'));
  if (wildcardFinalMatch && wildcardFinalMatch.winnerTeamId) {
    const wfLoser = wildcardFinalMatch.participants.find(p => p.teamId && p.teamId !== wildcardFinalMatch.winnerTeamId);
    if (wfLoser?.teamId && wfLoser.teamId !== runnerUp?.id && wfLoser.teamId !== champion?.id) {
      secondRunnerUp = teams.find(t => t.id === wfLoser.teamId) || null;
    }
  }

  // Fallback: Check other wildcard stages in descending order if WILDCARD_FINAL is not present
  if (!secondRunnerUp) {
    const fallbackWcStages = ['WILDCARD_SEMIFINAL', 'SEMIFINAL_WILDCARD', 'QUARTERFINAL_WILDCARD', 'WILDCARD'];
    for (const st of fallbackWcStages) {
      const stageMatches = matches.filter(m => m.stageType === st && (m.status === 'COMPLETED' || m.status === 'BYE'));
      if (stageMatches.length > 0) {
        for (const sm of stageMatches) {
          const loser = sm.participants.find(p => p.teamId && p.teamId !== sm.winnerTeamId);
          if (loser?.teamId && loser.teamId !== runnerUp?.id && loser.teamId !== champion?.id) {
            secondRunnerUp = teams.find(t => t.id === loser.teamId) || null;
            if (secondRunnerUp) break;
          }
        }
        if (secondRunnerUp) break;
      }
    }
  }

  // Secondary Fallback: Winners Final or Semifinal loser
  if (!secondRunnerUp) {
    const winnersFinalMatch = matches.find(m => m.stageType === 'WINNERS_FINAL' && m.status === 'COMPLETED');
    if (winnersFinalMatch && winnersFinalMatch.winnerTeamId) {
      const wfLoser = winnersFinalMatch.participants.find(p => p.teamId && p.teamId !== winnersFinalMatch.winnerTeamId);
      if (wfLoser?.teamId && wfLoser.teamId !== runnerUp?.id && wfLoser.teamId !== champion?.id) {
        secondRunnerUp = teams.find(t => t.id === wfLoser.teamId) || null;
      }
    }
  }

  const isCompleted = stages.some(s => s.stageType === 'FINAL' && s.status === 'COMPLETED');

  return {
    category: cat.name,
    categoryId: cat.id,
    currentStage: activeStage?.stageType || (isCompleted ? 'COMPLETED' : stages.length > 0 ? stages[stages.length - 1].stageType : 'REGISTRATION'),
    currentStageDisplayName: activeStage?.displayName || (isCompleted ? 'Champion Declared' : stages.length > 0 ? stages[stages.length - 1].displayName : 'Registration / Upcoming'),
    isCompleted,
    totalTeams: teams.length,
    activeTeams: teams.filter(t => !t.isWithdrawn && t.status !== 'ELIMINATED').length,
    liveMatch,
    upNextMatch,
    completedMatchesCount: completedMatches.length,
    totalMatchesCount: matches.length,
    champion,
    runnerUp,
    secondRunnerUp,
    stages
  };
}

// -------------------------------------------------------------
// SEED REALISTIC DEMO TEAMS
// -------------------------------------------------------------
export function seedRealisticDemoTeams(categoryId: string): { success: boolean; count: number } {
  const cat = getCategoryById(categoryId);
  if (!cat) return { success: false, count: 0 };

  const isHeavy = cat.name === 'HEAVYWEIGHT';

  const demoTeams = isHeavy ? [
    { name: 'Apex Predator', robotName: 'Titan Crusher', org: 'Faculty of Engineering', seed: 1 },
    { name: 'Chronos Dynamics', robotName: 'Doomsday 9000', org: 'Robotics Guild', seed: 2 },
    { name: 'Valkyrie Mech', robotName: 'Death Spinner', org: 'Mechatronics Lab', seed: 3 },
    { name: 'Iron Forge', robotName: 'Mjolnir MK4', org: 'Mechanical Society', seed: 4 },
    { name: 'Phantom Blitz', robotName: 'Shadow Cleaver', org: 'Computing Dept', seed: 5 },
    { name: 'Hyperion Labs', robotName: 'Plasma Cutter', org: 'Electrical Division', seed: 6 },
    { name: 'Vortex Syndicate', robotName: 'Cyclone Ripper', org: 'Automotive Club', seed: 7 },
    { name: 'Cyber Titan', robotName: 'Goliath X', org: 'AI Research Unit', seed: 8 },
    { name: 'Obsidian Armor', robotName: 'Bunker Buster', org: 'Material Science', seed: 9 },
    { name: 'Havoc Core', robotName: 'Razor Edge', org: 'Mechatronics Lab', seed: 10 },
    { name: 'Quantum Overkill', robotName: 'Singularity', org: 'Physics Society', seed: 11 },
    { name: 'Rampage Bots', robotName: 'Anvil Smasher', org: 'Robotics Guild', seed: 12 },
    { name: 'Thunderstrike', robotName: 'Voltic Blade', org: 'Power Systems Lab', seed: 13 },
    { name: 'Inferno Squad', robotName: 'Flame Brand', org: 'Thermal Tech Lab', seed: 14 },
    { name: 'Sentinel Omega', robotName: 'Aegis Destroyer', org: 'Engineering Council', seed: 15 },
  ] : [
    { name: 'Wasp Stinger', robotName: 'Hornet V2', org: 'Micro-Robotics Club', seed: 1 },
    { name: 'Bullet Swift', robotName: 'Kinetic Dart', org: 'Aero Society', seed: 2 },
    { name: 'Velociraptor', robotName: 'Talon Ripper', org: 'Bio-Mech Lab', seed: 3 },
    { name: 'Neon Samurai', robotName: 'Katana Slash', org: 'Software Society', seed: 4 },
    { name: 'Specter Drift', robotName: 'Ghost Blade', org: 'Electronics Club', seed: 5 },
    { name: 'Pulse Dynamo', robotName: 'Shockwave', org: 'Physics Dept', seed: 6 },
    { name: 'Sonic Disruptor', robotName: 'Buzz Saw MK2', org: 'Design Club', seed: 7 },
    { name: 'Zero Friction', robotName: 'Slick Wedge', org: 'Fluid Dynamics Lab', seed: 8 },
    { name: 'Nano Byte', robotName: 'Micro Chopper', org: 'Computer Engineering', seed: 9 },
    { name: 'Viper Strike', robotName: 'Venom Fang', org: 'Embedded Systems', seed: 10 },
    { name: 'Tempest Micro', robotName: 'Whirlwind', org: 'Robotics Guild', seed: 11 },
  ];

  // Reset tournament state first so foreign key constraints on matches/participants don't block
  resetCategoryTournament(categoryId);
  db.prepare('DELETE FROM teams WHERE category_id = ?').run(categoryId);

  for (const t of demoTeams) {
    createTeam({
      categoryId,
      name: t.name,
      robotName: t.robotName,
      organization: t.org,
      seed: t.seed,
    });
  }

  return { success: true, count: demoTeams.length };
}

// -------------------------------------------------------------
// ROBOT RACE SCHEDULE MANAGEMENT
// -------------------------------------------------------------

function mapRaceSlotRow(r: any): RaceScheduleSlot {
  return {
    id: r.id,
    teamId: r.team_id,
    teamName: r.team_name,
    robotName: r.robot_name,
    organization: r.organization,
    logoUrl: r.logo_url,
    categoryDivision: (r.category_division === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL'),
    slotNumber: r.slot_number,
    scheduledTime: r.scheduled_time,
    status: r.status,
    track: r.track,
    timeRecorded: r.time_recorded,
    score: r.score !== undefined && r.score !== null ? Number(r.score) : null,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numbersPart = clean.replace(/[^\d:]/g, '');
  const [hStr, mStr] = numbersPart.split(':');
  let hours = parseInt(hStr || '9', 10);
  let minutes = parseInt(mStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return { hours, minutes };
}

function formatTimeSlot(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const hStr = displayHours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

export function getRaceSchedule(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): RaceScheduleSlot[] {
  let rows: any[];
  if (division && division !== 'ALL') {
    rows = db.prepare('SELECT * FROM race_schedule WHERE category_division = ? ORDER BY slot_number ASC').all(division);
  } else {
    rows = db.prepare('SELECT * FROM race_schedule ORDER BY slot_number ASC').all();
  }
  return rows.map(mapRaceSlotRow);
}

export function getRaceScheduleById(id: string): RaceScheduleSlot | null {
  const row = db.prepare('SELECT * FROM race_schedule WHERE id = ?').get(id);
  return row ? mapRaceSlotRow(row) : null;
}

export function createRaceScheduleSlot(data: {
  teamId?: string | null;
  teamName: string;
  robotName?: string | null;
  organization?: string | null;
  logoUrl?: string | null;
  categoryDivision?: 'SCHOOL' | 'UNIVERSITY';
  slotNumber?: number;
  scheduledTime: string;
  status?: RaceSlotStatus;
  track?: string | null;
  timeRecorded?: string | null;
  score?: number | null;
  notes?: string | null;
}): RaceScheduleSlot {
  const id = `slot-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  let slotNum = data.slotNumber;
  if (!slotNum) {
    const max = db.prepare('SELECT MAX(slot_number) as maxNum FROM race_schedule').get() as { maxNum: number | null };
    slotNum = (max?.maxNum || 0) + 1;
  }

  const division = data.categoryDivision || 'SCHOOL';

  db.prepare(`
    INSERT INTO race_schedule (
      id, team_id, team_name, robot_name, organization, logo_url, category_division,
      slot_number, scheduled_time, status, track, time_recorded, score, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.teamId || null,
    data.teamName,
    data.robotName || null,
    data.organization || null,
    data.logoUrl || null,
    division,
    slotNum,
    data.scheduledTime,
    data.status || 'SCHEDULED',
    data.track || 'Track 1',
    data.timeRecorded || null,
    data.score !== undefined ? data.score : null,
    data.notes || null,
    now,
    now
  );

  return getRaceScheduleById(id)!;
}

export function updateRaceScheduleSlot(id: string, updates: Partial<RaceScheduleSlot>): RaceScheduleSlot | null {
  const existing = getRaceScheduleById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE race_schedule
    SET team_name = ?,
        robot_name = ?,
        organization = ?,
        logo_url = ?,
        category_division = ?,
        slot_number = ?,
        scheduled_time = ?,
        status = ?,
        track = ?,
        time_recorded = ?,
        score = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    updates.teamName !== undefined ? updates.teamName : existing.teamName,
    updates.robotName !== undefined ? updates.robotName : existing.robotName,
    updates.organization !== undefined ? updates.organization : existing.organization,
    updates.logoUrl !== undefined ? updates.logoUrl : existing.logoUrl,
    updates.categoryDivision !== undefined ? updates.categoryDivision : (existing.categoryDivision || 'SCHOOL'),
    updates.slotNumber !== undefined ? updates.slotNumber : existing.slotNumber,
    updates.scheduledTime !== undefined ? updates.scheduledTime : existing.scheduledTime,
    updates.status !== undefined ? updates.status : existing.status,
    updates.track !== undefined ? updates.track : existing.track,
    updates.timeRecorded !== undefined ? updates.timeRecorded : existing.timeRecorded,
    updates.score !== undefined ? updates.score : existing.score,
    updates.notes !== undefined ? updates.notes : existing.notes,
    now,
    id
  );

  return getRaceScheduleById(id);
}

export function deleteRaceScheduleSlot(id: string): boolean {
  const res = db.prepare('DELETE FROM race_schedule WHERE id = ?').run(id);
  return res.changes > 0;
}

export function clearRaceSchedule(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): boolean {
  if (division && division !== 'ALL') {
    db.prepare('DELETE FROM race_schedule WHERE category_division = ?').run(division);
  } else {
    db.prepare('DELETE FROM race_schedule').run();
  }
  return true;
}

// -------------------------------------------------------------
// ROBOT RACE TEAMS (SCHOOL & UNIVERSITY DIVISIONS)
// -------------------------------------------------------------

export function getRaceTeams(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): Team[] {
  let rows: any[];
  if (division === 'SCHOOL') {
    rows = db.prepare(`
      SELECT * FROM teams 
      WHERE category_id = 'cat-race-school' 
         OR (category_id = 'cat-race' AND (race_category = 'SCHOOL' OR race_category IS NULL))
      ORDER BY name ASC
    `).all();
  } else if (division === 'UNIVERSITY') {
    rows = db.prepare(`
      SELECT * FROM teams 
      WHERE category_id = 'cat-race-university' 
         OR (category_id = 'cat-race' AND race_category = 'UNIVERSITY')
      ORDER BY name ASC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT * FROM teams 
      WHERE category_id IN ('cat-race', 'cat-race-school', 'cat-race-university')
      ORDER BY name ASC
    `).all();
  }

  return rows.map(r => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    robotName: r.robot_name,
    organization: r.organization,
    seed: r.seed,
    status: r.status,
    lives: r.lives !== undefined && r.lives !== null ? r.lives : 2,
    isWithdrawn: Boolean(r.is_withdrawn),
    logoUrl: r.logo_url || undefined,
    raceCategory: (r.race_category === 'UNIVERSITY' || r.category_id === 'cat-race-university') ? 'UNIVERSITY' : 'SCHOOL',
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function createRaceTeam(data: {
  name: string;
  categoryDivision: 'SCHOOL' | 'UNIVERSITY';
  robotName?: string;
  organization?: string;
  logoUrl?: string;
  notes?: string;
}): Team {
  const categoryId = data.categoryDivision === 'UNIVERSITY' ? 'cat-race-university' : 'cat-race-school';
  const id = `team-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO teams (id, category_id, name, robot_name, organization, seed, status, is_withdrawn, logo_url, race_category, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, ?, ?)
  `).run(
    id,
    categoryId,
    data.name.trim(),
    data.robotName?.trim() || null,
    data.organization?.trim() || null,
    null,
    data.logoUrl?.trim() || null,
    data.categoryDivision,
    data.notes?.trim() || null,
    now,
    now
  );
  return getTeamById(id)!;
}

export function deleteRaceTeam(id: string): boolean {
  const team = getTeamById(id);
  // Also remove slots matching this team by id or name
  if (team?.name) {
    db.prepare('DELETE FROM race_schedule WHERE team_id = ? OR team_name = ?').run(id, team.name);
  } else {
    db.prepare('DELETE FROM race_schedule WHERE team_id = ?').run(id);
  }
  const res = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return res.changes > 0;
}

export function clearAllRaceTeams(division: 'ALL' | 'SCHOOL' | 'UNIVERSITY' = 'ALL'): { count: number } {
  const teamsToDelete = getRaceTeams(division);
  for (const t of teamsToDelete) {
    db.prepare('DELETE FROM race_schedule WHERE team_id = ? OR team_name = ?').run(t.id, t.name);
    db.prepare('DELETE FROM teams WHERE id = ?').run(t.id);
  }
  return { count: teamsToDelete.length };
}

export function generateRaceSchedule(params: {
  startTime?: string;
  intervalMinutes?: number;
  track?: string;
  randomize?: boolean;
  categoryDivision?: 'ALL' | 'SCHOOL' | 'UNIVERSITY';
}): RaceScheduleSlot[] {
  const startStr = params.startTime || '09:30 AM';
  const interval = params.intervalMinutes && params.intervalMinutes > 0 ? params.intervalMinutes : 10;
  const track = params.track || 'Track 1';
  const randomize = Boolean(params.randomize);
  const targetDivision = params.categoryDivision || 'ALL';

  // Check race teams (NO hardcoded fake teams)
  let raceTeams = getRaceTeams(targetDivision);
  if (raceTeams.length === 0) {
    return [];
  }

  // Filter out withdrawn teams
  let activeTeams = raceTeams.filter(t => !t.isWithdrawn);
  if (randomize) {
    activeTeams = [...activeTeams].sort(() => Math.random() - 0.5);
  }

  // Clear existing schedule for this division (or all)
  clearRaceSchedule(targetDivision);

  const { hours: startH, minutes: startM } = parseTimeString(startStr);
  let currentTotalMinutes = startH * 60 + startM;

  const insertStmt = db.prepare(`
    INSERT INTO race_schedule (
      id, team_id, team_name, robot_name, organization, logo_url, category_division,
      slot_number, scheduled_time, status, track, time_recorded, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const slots: RaceScheduleSlot[] = [];

  db.transaction(() => {
    for (let i = 0; i < activeTeams.length; i++) {
      const team = activeTeams[i];
      const slotNum = i + 1;
      const slotHours = Math.floor(currentTotalMinutes / 60) % 24;
      const slotMinutes = currentTotalMinutes % 60;
      const timeStr = formatTimeSlot(slotHours, slotMinutes);
      const slotId = `slot-${crypto.randomUUID()}`;
      const div = team.raceCategory || 'SCHOOL';

      insertStmt.run(
        slotId,
        team.id,
        team.name,
        team.robotName || null,
        team.organization || null,
        team.logoUrl || null,
        div,
        slotNum,
        timeStr,
        'SCHEDULED',
        track,
        null,
        null,
        now,
        now
      );

      slots.push({
        id: slotId,
        teamId: team.id,
        teamName: team.name,
        robotName: team.robotName,
        organization: team.organization,
        logoUrl: team.logoUrl,
        categoryDivision: div,
        slotNumber: slotNum,
        scheduledTime: timeStr,
        status: 'SCHEDULED',
        track,
        timeRecorded: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      });

      currentTotalMinutes += interval;
    }
  })();

  return slots;
}
