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
  getTargetPowerOfTwo,
  shuffleArray
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
    matchRows = db.prepare(`
      SELECT m.* FROM matches m
      LEFT JOIN stages s ON m.stage_id = s.id
      WHERE m.category_id = ?
      ORDER BY COALESCE(s.stage_order, 99) ASC, m.round_order ASC, m.match_number ASC
    `).all(categoryId);
  }

  if (matchRows.length === 0) return [];

  const matchIds = matchRows.map(m => m.id);
  const placeholders = matchIds.map(() => '?').join(',');

  const participantRows = db.prepare(`
    SELECT mp.*, t.name as team_name, t.robot_name, t.organization, t.status as team_status, t.lives as team_lives, t.logo_url, t.seed
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
        seed: p.seed !== undefined && p.seed !== null ? p.seed : undefined,
        status: p.team_status,
        lives: p.team_lives !== undefined && p.team_lives !== null ? p.team_lives : calculateTeamLives(p.team_id),
        isWithdrawn: false,
        logoUrl: p.logo_url || undefined,
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
        logoUrl: w.logo_url || undefined,
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

    // 3. Propagate the winner. If the target round contains a single-team BYE,
    // resolve it immediately and keep advancing until a contested match is met.
    let sourceMatchId = matchId;
    const visited = new Set<string>();
    while (!visited.has(sourceMatchId)) {
      visited.add(sourceMatchId);
      const sourceRow = db.prepare('SELECT next_match_id FROM matches WHERE id = ?').get(sourceMatchId) as
        | { next_match_id: string | null }
        | undefined;
      let winnerSlot = db.prepare(`
        SELECT id, match_id FROM match_participants
        WHERE source_match_id = ? AND (advancement_source = 'WINNER' OR advancement_source IS NULL) AND team_id IS NULL
        ORDER BY participant_order ASC
        LIMIT 1
      `).get(sourceMatchId) as { id: string; match_id: string } | undefined;

      if (!winnerSlot && sourceRow?.next_match_id) {
        winnerSlot = db.prepare(`
          SELECT id, match_id FROM match_participants
          WHERE match_id = ? AND team_id IS NULL
          ORDER BY participant_order ASC
          LIMIT 1
        `).get(sourceRow.next_match_id) as { id: string; match_id: string } | undefined;
      }

      if (!winnerSlot) break;
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?, placeholder_text = NULL, advancement_source = 'WINNER'
        WHERE id = ?
      `).run(winnerTeamId, winnerSlot.id);

      const targetSlots = db.prepare('SELECT id, team_id FROM match_participants WHERE match_id = ? ORDER BY participant_order').all(winnerSlot.match_id) as { id: string; team_id: string | null }[];
      if (targetSlots.length === 1 && targetSlots[0].team_id) {
        db.prepare('UPDATE match_participants SET is_winner = 1 WHERE id = ?').run(targetSlots[0].id);
        db.prepare(`
          UPDATE matches
          SET status = 'BYE', winner_team_id = ?, completed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(winnerTeamId, now, now, winnerSlot.match_id);
        sourceMatchId = winnerSlot.match_id;
        continue;
      }

      if (targetSlots.length >= 2 && targetSlots.every(s => s.team_id !== null)) {
        db.prepare("UPDATE matches SET status = 'SCHEDULED', updated_at = ? WHERE id = ?").run(now, winnerSlot.match_id);
      }
      break;
    }

    // 4. Propagate Losers (Wildcard second chance for teams with lives >= 1)
    for (const p of match.participants) {
      if (p.teamId && p.teamId !== winnerTeamId) {
        const loserLives = calculateTeamLives(p.teamId);
        if (loserLives >= 1) {
          // Find wildcard participant slot waiting for the loser of this match
          let wcSlot = db.prepare(`
            SELECT id, match_id FROM match_participants
            WHERE source_match_id = ? AND advancement_source = 'WILDCARD_DROP' AND team_id IS NULL
            ORDER BY participant_order ASC
            LIMIT 1
          `).get(matchId) as { id: string; match_id: string } | undefined;

          // Fallback: check match.wildcardMatchId
          if (!wcSlot && match.wildcardMatchId) {
            wcSlot = db.prepare(`
              SELECT id, match_id FROM match_participants
              WHERE match_id = ? AND team_id IS NULL
              ORDER BY participant_order ASC
              LIMIT 1
            `).get(match.wildcardMatchId) as { id: string; match_id: string } | undefined;
          }

          if (wcSlot) {
            db.prepare(`
              UPDATE match_participants
              SET team_id = ?, placeholder_text = NULL, advancement_source = 'WILDCARD_DROP'
              WHERE id = ?
            `).run(p.teamId, wcSlot.id);

            db.prepare("UPDATE teams SET status = 'WILDCARD' WHERE id = ?").run(p.teamId);

            const wcSlots = db.prepare('SELECT id, team_id FROM match_participants WHERE match_id = ? ORDER BY participant_order').all(wcSlot.match_id) as { id: string; team_id: string | null }[];
            if (wcSlots.length === 1 && wcSlots[0].team_id !== null) {
              const byeTeamId = wcSlots[0].team_id;
              db.prepare('UPDATE match_participants SET is_winner = 1 WHERE id = ?').run(wcSlots[0].id);
              db.prepare(`
                UPDATE matches
                SET status = 'BYE', winner_team_id = ?, completed_at = ?, updated_at = ?
                WHERE id = ?
              `).run(byeTeamId, now, now, wcSlot.match_id);

              let byeSourceMatchId = wcSlot.match_id;
              const byeVisited = new Set<string>();
              while (!byeVisited.has(byeSourceMatchId)) {
                byeVisited.add(byeSourceMatchId);
                const nextRow = db.prepare('SELECT next_match_id FROM matches WHERE id = ?').get(byeSourceMatchId) as { next_match_id: string | null } | undefined;
                let nextSlot = db.prepare(`
                  SELECT id, match_id FROM match_participants
                  WHERE source_match_id = ? AND (advancement_source = 'WINNER' OR advancement_source IS NULL) AND team_id IS NULL
                  ORDER BY participant_order ASC
                  LIMIT 1
                `).get(byeSourceMatchId) as { id: string; match_id: string } | undefined;

                if (!nextSlot && nextRow?.next_match_id) {
                  nextSlot = db.prepare(`
                    SELECT id, match_id FROM match_participants
                    WHERE match_id = ? AND team_id IS NULL
                    ORDER BY participant_order ASC
                    LIMIT 1
                  `).get(nextRow.next_match_id) as { id: string; match_id: string } | undefined;
                }

                if (!nextSlot) break;
                db.prepare(`
                  UPDATE match_participants
                  SET team_id = ?, placeholder_text = NULL, advancement_source = 'WINNER'
                  WHERE id = ?
                `).run(byeTeamId, nextSlot.id);

                const nextTargetSlots = db.prepare('SELECT id, team_id FROM match_participants WHERE match_id = ? ORDER BY participant_order').all(nextSlot.match_id) as { id: string; team_id: string | null }[];
                if (nextTargetSlots.length === 1 && nextTargetSlots[0].team_id) {
                  db.prepare('UPDATE match_participants SET is_winner = 1 WHERE id = ?').run(nextTargetSlots[0].id);
                  db.prepare(`
                    UPDATE matches
                    SET status = 'BYE', winner_team_id = ?, completed_at = ?, updated_at = ?
                    WHERE id = ?
                  `).run(byeTeamId, now, now, nextSlot.match_id);
                  byeSourceMatchId = nextSlot.match_id;
                  continue;
                }

                if (nextTargetSlots.length >= 2 && nextTargetSlots.every(s => s.team_id !== null)) {
                  db.prepare("UPDATE matches SET status = 'SCHEDULED', updated_at = ? WHERE id = ?").run(now, nextSlot.match_id);
                }
                break;
              }
            } else if (wcSlots.length >= 2 && wcSlots.every(s => s.team_id !== null)) {
              db.prepare("UPDATE matches SET status = 'SCHEDULED', updated_at = ? WHERE id = ?").run(now, wcSlot.match_id);
            }
          }
        } else {
          db.prepare("UPDATE teams SET status = 'ELIMINATED' WHERE id = ?").run(p.teamId);
        }
      }
    }

    // 5. Grand Finals Championship Check
    if (match.stageType === 'FINAL') {
      db.prepare("UPDATE teams SET status = 'CHAMPION' WHERE id = ?").run(winnerTeamId);
      for (const p of match.participants) {
        if (p.teamId && p.teamId !== winnerTeamId) {
          db.prepare("UPDATE teams SET status = 'FINALIST' WHERE id = ?").run(p.teamId);
        }
      }
      db.prepare("UPDATE stages SET status = 'COMPLETED', completed_at = ? WHERE id = ?").run(now, match.stageId);
    } else {
      // 6. Check if all matches in stage are completed to mark stage COMPLETED
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

        // Find next stage with ready matches and make it ACTIVE
        const nextPending = db.prepare(`
          SELECT s.id FROM stages s
          JOIN matches m ON s.id = m.stage_id
          WHERE s.category_id = ? AND s.status = 'PENDING'
          GROUP BY s.id
          ORDER BY s.stage_order ASC
          LIMIT 1
        `).get(match.categoryId) as { id: string } | undefined;

        if (nextPending) {
          db.prepare(`
            UPDATE stages SET status = 'ACTIVE', started_at = ? WHERE id = ?
          `).run(now, nextPending.id);
        }
      }
    }
  });

  try {
    transaction();

    // Sync to Supabase in background
    import('@/lib/supabase').then(({ syncTournamentStateToSupabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(match.categoryId).catch(() => {});
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// MANUALLY ASSIGN / UPDATE TEAMS FOR A BATTLE
// -------------------------------------------------------------
export function updateMatchTeams(
  matchId: string,
  team1Id?: string | null,
  team2Id?: string | null
): { success: boolean; error?: string } {
  const match = getMatchById(matchId);
  if (!match) return { success: false, error: 'Match not found' };

  if (match.status === 'COMPLETED') {
    return { success: false, error: 'Cannot modify teams of a completed match. Use Winner Correction instead.' };
  }

  const t1 = team1Id && team1Id.trim() !== '' ? team1Id.trim() : null;
  const t2 = team2Id && team2Id.trim() !== '' ? team2Id.trim() : null;

  if (t1 && t2 && t1 === t2) {
    return { success: false, error: 'A team cannot battle against itself in the same match' };
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    const existingParts = db.prepare(`
      SELECT * FROM match_participants WHERE match_id = ? ORDER BY participant_order ASC
    `).all(matchId) as any[];

    // Slot 1
    if (existingParts.length > 0) {
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?, advancement_source = CASE WHEN ? IS NOT NULL THEN 'MANUAL' ELSE advancement_source END
        WHERE id = ?
      `).run(t1, t1, existingParts[0].id);
    } else {
      const p1Id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, score, advancement_source)
        VALUES (?, ?, ?, 1, 0, 0, 'MANUAL')
      `).run(p1Id, matchId, t1);
    }

    // Slot 2
    if (existingParts.length > 1) {
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?, advancement_source = CASE WHEN ? IS NOT NULL THEN 'MANUAL' ELSE advancement_source END
        WHERE id = ?
      `).run(t2, t2, existingParts[1].id);
    } else {
      const p2Id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, score, advancement_source)
        VALUES (?, ?, ?, 2, 0, 0, 'MANUAL')
      `).run(p2Id, matchId, t2);
    }

    db.prepare('UPDATE matches SET updated_at = ? WHERE id = ?').run(now, matchId);
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// SWAP PARTICIPANTS BETWEEN TWO MATCH SLOTS
// -------------------------------------------------------------
export function swapMatchParticipants(
  sourceMatchId: string,
  sourceSlotOrder: number,
  targetMatchId: string,
  targetSlotOrder: number
): { success: boolean; error?: string; sourceTeamName?: string; targetTeamName?: string; categoryId?: string } {
  const sourceMatch = getMatchById(sourceMatchId);
  const targetMatch = getMatchById(targetMatchId);

  if (!sourceMatch || !targetMatch) {
    return { success: false, error: 'One or both matches not found' };
  }

  if (sourceMatch.status !== 'SCHEDULED' || targetMatch.status !== 'SCHEDULED') {
    return { success: false, error: 'Only scheduled matches can have combatants swapped' };
  }

  if (
    sourceMatch.stageType.toLowerCase().includes('wildcard') ||
    targetMatch.stageType.toLowerCase().includes('wildcard')
  ) {
    return { success: false, error: 'Wildcard matches cannot be manually swapped' };
  }

  const sourcePart = sourceMatch.participants.find(p => p.participantOrder === sourceSlotOrder);
  const targetPart = targetMatch.participants.find(p => p.participantOrder === targetSlotOrder);

  const sourceTeamId = sourcePart?.teamId || null;
  const targetTeamId = targetPart?.teamId || null;

  if (!sourceTeamId && !targetTeamId) {
    return { success: false, error: 'Neither slot has a team assigned' };
  }

  const sourceTeamName = sourcePart?.team?.name || 'Empty Slot';
  const targetTeamName = targetPart?.team?.name || 'Empty Slot';

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    // Update or insert source slot
    if (sourcePart) {
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?, advancement_source = CASE WHEN ? IS NOT NULL THEN 'MANUAL' ELSE advancement_source END
        WHERE id = ?
      `).run(targetTeamId, targetTeamId, sourcePart.id);
    } else {
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, score, advancement_source)
        VALUES (?, ?, ?, ?, 0, 0, 'MANUAL')
      `).run(crypto.randomUUID(), sourceMatchId, targetTeamId, sourceSlotOrder);
    }

    // Update or insert target slot
    if (targetPart) {
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?, advancement_source = CASE WHEN ? IS NOT NULL THEN 'MANUAL' ELSE advancement_source END
        WHERE id = ?
      `).run(sourceTeamId, sourceTeamId, targetPart.id);
    } else {
      db.prepare(`
        INSERT INTO match_participants (id, match_id, team_id, participant_order, is_winner, score, advancement_source)
        VALUES (?, ?, ?, ?, 0, 0, 'MANUAL')
      `).run(crypto.randomUUID(), targetMatchId, sourceTeamId, targetSlotOrder);
    }

    db.prepare('UPDATE matches SET updated_at = ? WHERE id = ?').run(now, sourceMatchId);
    if (sourceMatchId !== targetMatchId) {
      db.prepare('UPDATE matches SET updated_at = ? WHERE id = ?').run(now, targetMatchId);
    }
  });

  try {
    transaction();
    return {
      success: true,
      sourceTeamName,
      targetTeamName,
      categoryId: sourceMatch.categoryId
    };
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

      // Replace with appropriate team (winner gets new winner, wildcard drop gets new loser)
      const replacementTeamId = dp.advancement_source === 'WILDCARD_DROP' ? (oldWinnerId || null) : newWinnerTeamId;
      db.prepare(`
        UPDATE match_participants
        SET team_id = ?
        WHERE id = ?
      `).run(replacementTeamId, dp.id);
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
 * CONFIRM & LOCK TEAMS:
 * Locks confirmed teams into the tournament and generates the complete bracket architecture.
 * Real teams are assigned to Round 1; downstream matches are pre-created with linked placeholder
 * slots so winners and losers advance live as matches complete!
 */
export function confirmTeamsAndGenerateFullBracket(
  categoryId: string,
  randomize: boolean = false,
  customPairings?: { team1Id: string; team2Id: string }[]
): { success: boolean; error?: string; message?: string } {
  const teams = getTeams(categoryId).filter(t => !t.isWithdrawn);
  if (teams.length < 2) {
    return {
      success: false,
      error: 'At least 2 active teams are required to build a tournament bracket.'
    };
  }

  // Check if stages already exist for this category
  const existingStages = db.prepare("SELECT COUNT(*) as count FROM stages WHERE category_id = ?").get(categoryId) as { count: number };
  if (existingStages.count > 0) {
    return {
      success: false,
      error: 'Tournament bracket has already been generated. Reset tournament first if you wish to re-generate.'
    };
  }

  let orderedTeams = [...teams];
  if (randomize) {
    orderedTeams = shuffleArray(orderedTeams);
  } else {
    // Sort by seed if available, otherwise preserve order
    orderedTeams.sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return 0;
    });
  }

  const N = orderedTeams.length;
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 1. Reset all teams to ACTIVE with 2 lives
    db.prepare("UPDATE teams SET lives = 2, status = 'ACTIVE' WHERE category_id = ?").run(categoryId);

    // Helpers
    const createStage = (stageType: StageType, stageOrder: number, displayName: string, status: 'ACTIVE' | 'PENDING' = 'PENDING') => {
      const stageId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO stages (id, category_id, stage_type, stage_order, display_name, status, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(stageId, categoryId, stageType, stageOrder, displayName, status, status === 'ACTIVE' ? now : null);
      return stageId;
    };

    const createMatch = (data: {
      id?: string;
      stageId: string;
      stageType: StageType;
      matchNumber: number;
      roundOrder: number;
      status?: 'SCHEDULED' | 'BYE' | 'LIVE' | 'COMPLETED';
      winnerTeamId?: string | null;
      nextMatchId?: string | null;
      wildcardMatchId?: string | null;
    }) => {
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

    const addParticipant = (data: {
      matchId: string;
      order: number;
      teamId?: string | null;
      placeholderText?: string | null;
      isWinner?: boolean;
      sourceMatchId?: string | null;
      advancementSource?: string | null;
    }) => {
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

    // -------------------------------------------------------------
    // BUILD BRACKET SLOTS BASED ON PARTICIPANT COUNT
    // -------------------------------------------------------------
    if (N === 2) {
      const stageFinal = createStage('FINAL', 1, 'Grand Finals', 'ACTIVE');
      const m1 = createMatch({ stageId: stageFinal, stageType: 'FINAL', matchNumber: 1, roundOrder: 1, status: 'SCHEDULED' });
      addParticipant({ matchId: m1, order: 1, teamId: orderedTeams[0].id });
      addParticipant({ matchId: m1, order: 2, teamId: orderedTeams[1].id });
    } else {
      // Dynamic Multi-Tier Double-Elimination / Wildcard Tournament Architecture
      // Automatically handles any team count (odd team BYEs, 3v3 and 2v2 wildcards, drop-downs, championship)
      interface RoundPlan {
        roundIndex: number;
        stageType: StageType;
        stageDisplayName: string;
        teamsIn: number;
        hasBye: boolean;
        contestedMatches: number;
        losersCount: number;
        advancersCount: number;
      }

      const mainPlans: RoundPlan[] = [];
      let currTeams = N;
      let rIdx = 0;

      while (currTeams > 2) {
        const hasBye = currTeams % 2 === 1;
        const contestedMatches = Math.floor(currTeams / 2);
        const losersCount = contestedMatches;
        const advancersCount = contestedMatches + (hasBye ? 1 : 0);

        mainPlans.push({
          roundIndex: rIdx++,
          stageType: '' as StageType,
          stageDisplayName: '',
          teamsIn: currTeams,
          hasBye,
          contestedMatches,
          losersCount,
          advancersCount
        });

        currTeams = advancersCount;
      }

      mainPlans.push({
        roundIndex: rIdx++,
        stageType: 'WINNERS_FINAL',
        stageDisplayName: 'Winners Final',
        teamsIn: 2,
        hasBye: false,
        contestedMatches: 1,
        losersCount: 1,
        advancersCount: 1
      });

      const totalMainRounds = mainPlans.length;

      mainPlans.forEach((p, idx) => {
        if (idx === 0) {
          p.stageType = 'ROUND_1';
          p.stageDisplayName = 'Round 1';
        } else if (idx === totalMainRounds - 1) {
          p.stageType = 'WINNERS_FINAL';
          p.stageDisplayName = 'Winners Final';
        } else {
          const distFromEnd = totalMainRounds - 1 - idx;
          if (distFromEnd === 1) {
            p.stageType = 'SEMIFINAL';
            p.stageDisplayName = 'Semifinals';
          } else if (distFromEnd === 2) {
            p.stageType = 'QUARTERFINAL';
            p.stageDisplayName = 'Quarterfinals';
          } else if (distFromEnd === 3) {
            p.stageType = 'ROUND_OF_16';
            p.stageDisplayName = 'Round of 16';
          } else {
            p.stageType = `ROUND_${idx + 1}` as StageType;
            p.stageDisplayName = `Round ${idx + 1}`;
          }
        }
      });

      const wcStageTypes: { stageType: StageType; displayName: string }[] = [];
      for (let idx = 0; idx < totalMainRounds - 1; idx++) {
        const mainSt = mainPlans[idx].stageType;
        if (mainSt === 'ROUND_1') {
          wcStageTypes.push({ stageType: 'WILDCARD', displayName: 'Round 1 Wildcard' });
        } else if (mainSt === 'ROUND_OF_16') {
          wcStageTypes.push({ stageType: 'ROUND_OF_16_WILDCARD', displayName: 'Round of 16 Wildcard' });
        } else if (mainSt === 'QUARTERFINAL') {
          wcStageTypes.push({ stageType: 'QUARTERFINAL_WILDCARD', displayName: 'Quarterfinals Wildcard' });
        } else if (mainSt === 'SEMIFINAL') {
          wcStageTypes.push({ stageType: 'SEMIFINAL_WILDCARD', displayName: 'Wildcard Semifinals' });
        } else {
          wcStageTypes.push({ stageType: `${mainSt}_WILDCARD` as StageType, displayName: `${mainPlans[idx].stageDisplayName} Wildcard` });
        }
      }

      let stageOrder = 1;
      const stageMap = new Map<StageType, string>();

      for (let i = 0; i < totalMainRounds; i++) {
        const mPlan = mainPlans[i];
        const mStageId = createStage(mPlan.stageType, stageOrder++, mPlan.stageDisplayName, i === 0 ? 'ACTIVE' : 'PENDING');
        stageMap.set(mPlan.stageType, mStageId);

        if (i < totalMainRounds - 1) {
          const wcInfo = wcStageTypes[i];
          const wcStageId = createStage(wcInfo.stageType, stageOrder++, wcInfo.displayName, 'PENDING');
          stageMap.set(wcInfo.stageType, wcStageId);
        }
      }

      const wcfStageId = createStage('WILDCARD_FINAL', stageOrder++, 'Wildcard Final', 'PENDING');
      stageMap.set('WILDCARD_FINAL', wcfStageId);

      const finalStageId = createStage('FINAL', stageOrder++, 'Grand Finals', 'PENDING');
      stageMap.set('FINAL', finalStageId);

      const mainRoundMatches: { matchId: string; isBye: boolean }[][] = [];
      const wcRoundMatches: string[][] = [];

      // Determine Round 1 BYE team if roster is odd
      let r1ByeTeam: Team | null = null;
      let r1ContestedTeams: Team[] = [];

      if (mainPlans[0].hasBye) {
        if (customPairings && customPairings.length > 0) {
          const pairedIds = new Set<string>();
          customPairings.forEach(p => {
            pairedIds.add(p.team1Id);
            pairedIds.add(p.team2Id);
          });
          r1ByeTeam = orderedTeams.find(t => !pairedIds.has(t.id)) || orderedTeams[0];
          r1ContestedTeams = orderedTeams.filter(t => t.id !== r1ByeTeam!.id);
        } else {
          r1ByeTeam = orderedTeams[0];
          r1ContestedTeams = orderedTeams.slice(1);
        }
      } else {
        r1ContestedTeams = [...orderedTeams];
      }

      for (let r = 0; r < totalMainRounds; r++) {
        const plan = mainPlans[r];
        const sId = stageMap.get(plan.stageType)!;
        const rMatches: { matchId: string; isBye: boolean }[] = [];

        for (let m = 0; m < plan.contestedMatches; m++) {
          const matchId = crypto.randomUUID();
          createMatch({
            id: matchId,
            stageId: sId,
            stageType: plan.stageType,
            matchNumber: m + 1,
            roundOrder: r + 1,
            status: 'SCHEDULED'
          });
          rMatches.push({ matchId, isBye: false });

          if (r === 0) {
            let t1Id: string | undefined;
            let t2Id: string | undefined;

            if (customPairings && customPairings[m]) {
              t1Id = customPairings[m].team1Id;
              t2Id = customPairings[m].team2Id;
            } else {
              t1Id = r1ContestedTeams[m * 2]?.id;
              t2Id = r1ContestedTeams[m * 2 + 1]?.id;
            }

            if (t1Id) addParticipant({ matchId, order: 1, teamId: t1Id });
            if (t2Id) addParticipant({ matchId, order: 2, teamId: t2Id });
          }
        }

        if (plan.hasBye) {
          const byeMatchId = crypto.randomUUID();
          const isR1 = r === 0;
          const byeTeam = isR1 ? r1ByeTeam : null;

          createMatch({
            id: byeMatchId,
            stageId: sId,
            stageType: plan.stageType,
            matchNumber: plan.contestedMatches + 1,
            roundOrder: r + 1,
            status: 'BYE',
            winnerTeamId: byeTeam?.id || null
          });
          rMatches.push({ matchId: byeMatchId, isBye: true });

          if (isR1 && byeTeam) {
            addParticipant({
              matchId: byeMatchId,
              order: 1,
              teamId: byeTeam.id,
              isWinner: true,
              advancementSource: 'ROUND_1_BYE'
            });
          }
        }

        mainRoundMatches.push(rMatches);
      }

      // Wire Main rounds forward (Round r -> Round r + 1) in natural stream order (top to bottom)
      for (let r = 0; r < totalMainRounds - 1; r++) {
        const currMatches = mainRoundMatches[r];
        const nextMatches = mainRoundMatches[r + 1];

        // currMatches is already in top-to-bottom visual order: [contested 1..C, bye if any]
        const advancersFromCurr = [...currMatches];

        const nextContested = nextMatches.filter(m => !m.isBye);
        const nextBye = nextMatches.find(m => m.isBye);

        let advIdx = 0;

        // 1. Contested matches in next round take adjacent feeder pairs from top to bottom
        nextContested.forEach(m => {
          for (let order = 1; order <= 2; order++) {
            if (advIdx < advancersFromCurr.length) {
              const src = advancersFromCurr[advIdx++];
              const isR1ByeSource = r === 0 && r1ByeTeam && src.isBye;
              addParticipant({
                matchId: m.matchId,
                order,
                sourceMatchId: src.matchId,
                teamId: (isR1ByeSource && r1ByeTeam) ? r1ByeTeam.id : null,
                advancementSource: isR1ByeSource ? 'ROUND_1_BYE' : 'WINNER'
              });
              db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(m.matchId, src.matchId);
            }
          }
        });

        // 2. BYE match in next round (at the bottom) takes the bottom feeder straight across
        if (nextBye && advIdx < advancersFromCurr.length) {
          const src = advancersFromCurr[advIdx++];
          const isR1ByeSource = r === 0 && r1ByeTeam && src.isBye;
          addParticipant({
            matchId: nextBye.matchId,
            order: 1,
            sourceMatchId: src.matchId,
            teamId: (isR1ByeSource && r1ByeTeam) ? r1ByeTeam.id : null,
            advancementSource: isR1ByeSource ? 'ROUND_1_BYE' : 'WINNER'
          });
          db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(nextBye.matchId, src.matchId);
        }
      }

      // Wire Wildcard rounds (prioritize 3-player battles, e.g. [3, 2] for 5, [2, 2] for 4)
      let prevWcMatchIds: string[] = [];

      for (let r = 0; r < totalMainRounds - 1; r++) {
        const mainContestedMatches = mainRoundMatches[r].filter(m => !m.isBye).map(m => m.matchId);
        const wcStageType = wcStageTypes[r].stageType;
        const sId = stageMap.get(wcStageType)!;

        const wcPool: { sourceId: string; source: 'WINNER' | 'WILDCARD_DROP' }[] = [
          ...prevWcMatchIds.map(id => ({ sourceId: id, source: 'WINNER' as const })),
          ...mainContestedMatches.map(id => ({ sourceId: id, source: 'WILDCARD_DROP' as const }))
        ];

        const groupSizes = calculateWildcardGroupSizes(wcPool.length);
        const currentWcMatchIds: string[] = [];
        let poolIdx = 0;

        for (let g = 0; g < groupSizes.length; g++) {
          const size = groupSizes[g];
          const wcMatchId = crypto.randomUUID();
          currentWcMatchIds.push(wcMatchId);

          createMatch({
            id: wcMatchId,
            stageId: sId,
            stageType: wcStageType,
            matchNumber: g + 1,
            roundOrder: r + 1,
            status: size === 1 ? 'BYE' : 'SCHEDULED'
          });

          for (let order = 1; order <= size; order++) {
            const item = wcPool[poolIdx++];
            if (item) {
              addParticipant({
                matchId: wcMatchId,
                order,
                sourceMatchId: item.sourceId,
                advancementSource: item.source
              });
              if (item.source === 'WINNER') {
                db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(wcMatchId, item.sourceId);
              } else {
                db.prepare('UPDATE matches SET wildcard_match_id = ? WHERE id = ?').run(wcMatchId, item.sourceId);
              }
            }
          }
        }

        wcRoundMatches.push(currentWcMatchIds);
        prevWcMatchIds = currentWcMatchIds;
      }

      // Wire Wildcard Final (Survivors of penultimate Wildcard round vs Loser of Winners Final)
      const winnersFinalMatchId = mainRoundMatches[totalMainRounds - 1][0].matchId;
      const wcFinalContenders: { sourceId: string; source: 'WINNER' | 'WILDCARD_DROP' }[] = [
        ...prevWcMatchIds.map(id => ({ sourceId: id, source: 'WINNER' as const })),
        { sourceId: winnersFinalMatchId, source: 'WILDCARD_DROP' as const }
      ];

      const wcFinalMatchId = crypto.randomUUID();
      const wcFinalStageId = stageMap.get('WILDCARD_FINAL')!;

      createMatch({
        id: wcFinalMatchId,
        stageId: wcFinalStageId,
        stageType: 'WILDCARD_FINAL',
        matchNumber: 1,
        roundOrder: totalMainRounds,
        status: wcFinalContenders.length === 1 ? 'BYE' : 'SCHEDULED'
      });

      wcFinalContenders.forEach((item, idx) => {
        addParticipant({
          matchId: wcFinalMatchId,
          order: idx + 1,
          sourceMatchId: item.sourceId,
          advancementSource: item.source
        });
        if (item.source === 'WINNER') {
          db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(wcFinalMatchId, item.sourceId);
        } else {
          db.prepare('UPDATE matches SET wildcard_match_id = ? WHERE id = ?').run(wcFinalMatchId, item.sourceId);
        }
      });

      // Wire Grand Finals (Winner of Winners Final vs Winner of Wildcard Final)
      const grandFinalMatchId = crypto.randomUUID();
      const targetFinalStageId = stageMap.get('FINAL')!;

      createMatch({
        id: grandFinalMatchId,
        stageId: targetFinalStageId,
        stageType: 'FINAL',
        matchNumber: 1,
        roundOrder: totalMainRounds + 1,
        status: 'SCHEDULED'
      });

      addParticipant({
        matchId: grandFinalMatchId,
        order: 1,
        sourceMatchId: winnersFinalMatchId,
        advancementSource: 'WINNER'
      });
      db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(grandFinalMatchId, winnersFinalMatchId);

      addParticipant({
        matchId: grandFinalMatchId,
        order: 2,
        sourceMatchId: wcFinalMatchId,
        advancementSource: 'WINNER'
      });
      db.prepare('UPDATE matches SET next_match_id = ? WHERE id = ?').run(grandFinalMatchId, wcFinalMatchId);
    }
  });

  try {
    transaction();

    // Sync to Supabase in background
    import('@/lib/supabase').then(({ syncTournamentStateToSupabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(categoryId).catch(() => {});
      }
    });

    return {
      success: true,
      message: `Tournament confirmed! ${N} teams locked and full bracket slots generated.`
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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

    // Clear from Supabase in background
    import('@/lib/supabase').then(({ clearTournamentFromSupabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured()) {
        clearTournamentFromSupabase(categoryId).catch(() => {});
      }
    });

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

  // Find UP NEXT match:
  // 1. Must be SCHEDULED and not currently live
  // 2. Must belong to the ACTIVE stage first if the active stage still has scheduled matches
  // 3. Must have all required participants assigned (not waiting for previous matches to bill slots)
  const isMatchReady = (m: Match) => {
    return m.participants.length >= 2 && m.participants.every(p => Boolean(p.teamId));
  };

  let upNextMatch: Match | null = null;
  if (activeStage) {
    const activeStageMatches = matches.filter(m => m.stageId === activeStage.id && m.status === 'SCHEDULED' && (!liveMatch || m.id !== liveMatch.id));
    // Prioritize ready match in active stage
    upNextMatch = activeStageMatches.find(isMatchReady) || activeStageMatches[0] || null;
  }

  // If no scheduled match in active stage, find the first ready scheduled match in the tournament
  if (!upNextMatch) {
    const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED' && (!liveMatch || m.id !== liveMatch.id));
    upNextMatch = scheduledMatches.find(isMatchReady) || scheduledMatches[0] || null;
  }

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

export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const { hours, minutes } = parseTimeString(timeStr);
  const totalMinutes = (hours * 60 + minutes + minutesToAdd + 24 * 60 * 10) % (24 * 60);
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return formatTimeSlot(newHours, newMinutes);
}

export function reorderRaceScheduleSlots(
  orderedSlots: { id: string; slotNumber: number; scheduledTime?: string }[]
): RaceScheduleSlot[] {
  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE race_schedule
    SET slot_number = ?,
        scheduled_time = COALESCE(?, scheduled_time),
        updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction((slots: { id: string; slotNumber: number; scheduledTime?: string }[]) => {
    for (const slot of slots) {
      updateStmt.run(slot.slotNumber, slot.scheduledTime || null, now, slot.id);
    }
  });

  tx(orderedSlots);
  return getRaceSchedule();
}

export function shiftRaceScheduleTimes(
  offsetMinutes: number,
  fromSlotNumber?: number,
  division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'
): RaceScheduleSlot[] {
  const slots = getRaceSchedule(division);
  const targetSlots = fromSlotNumber
    ? slots.filter(s => s.slotNumber >= fromSlotNumber)
    : slots;

  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE race_schedule
    SET scheduled_time = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const slot of targetSlots) {
      const newTime = addMinutesToTimeString(slot.scheduledTime, offsetMinutes);
      updateStmt.run(newTime, now, slot.id);
    }
  });

  tx();
  return getRaceSchedule(division);
}

export function swapRaceScheduleSlots(
  id1: string,
  id2: string,
  keepTimes: boolean = true
): { slot1: RaceScheduleSlot; slot2: RaceScheduleSlot } | null {
  const s1 = getRaceScheduleById(id1);
  const s2 = getRaceScheduleById(id2);
  if (!s1 || !s2) return null;

  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE race_schedule
    SET slot_number = ?,
        scheduled_time = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    if (keepTimes) {
      // Slot numbers and times stay fixed in position, but their assignments swap:
      // s1 takes s2's slot_number and s2's scheduled_time
      // s2 takes s1's slot_number and s1's scheduled_time
      updateStmt.run(s2.slotNumber, s2.scheduledTime, now, s1.id);
      updateStmt.run(s1.slotNumber, s1.scheduledTime, now, s2.id);
    } else {
      // Only swap slot numbers, preserving each team's assigned departure time
      updateStmt.run(s2.slotNumber, s1.scheduledTime, now, s1.id);
      updateStmt.run(s1.slotNumber, s2.scheduledTime, now, s2.id);
    }
  });

  tx();
  const updated1 = getRaceScheduleById(id1)!;
  const updated2 = getRaceScheduleById(id2)!;
  return { slot1: updated1, slot2: updated2 };
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
    try {
      db.prepare('DELETE FROM race_schedule WHERE team_id = ? OR team_name = ?').run(t.id, t.name);
      db.prepare('DELETE FROM teams WHERE id = ?').run(t.id);
    } catch {}
  }
  try {
    if (division === 'SCHOOL') {
      db.prepare("DELETE FROM race_schedule WHERE category_division = 'SCHOOL'").run();
      db.prepare("DELETE FROM teams WHERE category_id = 'cat-race-school' OR race_category = 'SCHOOL'").run();
    } else if (division === 'UNIVERSITY') {
      db.prepare("DELETE FROM race_schedule WHERE category_division = 'UNIVERSITY'").run();
      db.prepare("DELETE FROM teams WHERE category_id = 'cat-race-university' OR race_category = 'UNIVERSITY'").run();
    } else {
      db.prepare("DELETE FROM race_schedule").run();
      db.prepare("DELETE FROM teams WHERE category_id IN ('cat-race', 'cat-race-school', 'cat-race-university')").run();
    }
  } catch (e) {
    console.warn('[clearAllRaceTeams SQLite warning]:', e);
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
