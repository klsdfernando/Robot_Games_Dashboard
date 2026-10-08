import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { generateWildcardStage, getTeams, calculateTeamLives } from '@/lib/repository';
import { generateWildcardProposal } from '@/lib/tournament-engine';
import { isSupabaseConfigured, syncTournamentStateToSupabase } from '@/lib/supabase';
import { StageType } from '@/lib/types';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  if (!categoryId) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  let sourceStageType: StageType = (searchParams.get('sourceStage') as StageType) || 'ROUND_1';

  // If no sourceStage was explicitly passed, detect the active wildcard context
  if (!searchParams.get('sourceStage')) {
    const qfCompleted = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'QUARTERFINAL' AND status = 'COMPLETED'").get(categoryId);
    const qfwcExists = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = 'QUARTERFINAL_WILDCARD'").get(categoryId);
    if (qfCompleted && !qfwcExists) {
      sourceStageType = 'QUARTERFINAL';
    }
  }

  let targetStageType: StageType = 'WILDCARD';
  if (sourceStageType === 'QUARTERFINAL') targetStageType = 'QUARTERFINAL_WILDCARD';
  if (sourceStageType === 'SEMIFINAL') targetStageType = 'SEMIFINAL_WILDCARD';
  if (sourceStageType === 'WINNERS_FINAL') targetStageType = 'WILDCARD_SEMIFINAL';
  if (sourceStageType === 'WILDCARD_SEMIFINAL') targetStageType = 'WILDCARD_FINAL';

  // Get source stage completed matches
  const sourceMatches = db.prepare(`
    SELECT m.id, m.winner_team_id, mp.team_id
    FROM matches m
    JOIN match_participants mp ON m.id = mp.match_id
    WHERE m.category_id = ? AND m.stage_type = ? AND m.status = 'COMPLETED'
  `).all(categoryId, sourceStageType) as any[];

  const eligibleTeamIds: string[] = [];
  for (const r of sourceMatches) {
    if (r.team_id && r.team_id !== r.winner_team_id && !eligibleTeamIds.includes(r.team_id)) {
      const lives = calculateTeamLives(r.team_id);
      if (lives === 1) {
        eligibleTeamIds.push(r.team_id);
      }
    }
  }

  const poolTeams = getTeams(categoryId).filter(t => eligibleTeamIds.includes(t.id));
  const proposal = generateWildcardProposal(poolTeams);

  // Check if wildcard stage already exists
  const existingWc = db.prepare("SELECT * FROM stages WHERE category_id = ? AND stage_type = ?").get(categoryId, targetStageType);

  return NextResponse.json({
    sourceStageType,
    targetStageType,
    poolTeams,
    proposal,
    isAlreadyGenerated: Boolean(existingWc)
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { categoryId, sourceStage, manualGroups } = await req.json();
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const result = generateWildcardStage(categoryId, sourceStage || 'ROUND_1', manualGroups);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      syncTournamentStateToSupabase(categoryId).catch(() => {});
    }

    return NextResponse.json({ success: true, stageType: result.stageType });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
