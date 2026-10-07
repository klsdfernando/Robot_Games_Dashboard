import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { generateNextStage, getTeams } from '@/lib/repository';
import { calculateReEntryPlan } from '@/lib/tournament-engine';
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

  // Fetch Main winners
  const r1Matches = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'ROUND_1' AND (status = 'COMPLETED' OR status = 'BYE')
  `).all(categoryId) as { winner_team_id: string }[];
  const mainWinnerIds = r1Matches.map(m => m.winner_team_id).filter(Boolean);

  // Fetch Wildcard winners
  const wcMatches = db.prepare(`
    SELECT winner_team_id FROM matches
    WHERE category_id = ? AND stage_type = 'WILDCARD' AND status = 'COMPLETED'
  `).all(categoryId) as { winner_team_id: string }[];
  const wildcardWinnerIds = wcMatches.map(m => m.winner_team_id).filter(Boolean);

  const mainWinners = getTeams(categoryId).filter(t => mainWinnerIds.includes(t.id));
  const wildcardWinners = getTeams(categoryId).filter(t => wildcardWinnerIds.includes(t.id));

  const plan = calculateReEntryPlan(mainWinners, wildcardWinners);

  return NextResponse.json({
    mainWinners,
    wildcardWinners,
    plan
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { categoryId } = await req.json();
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const result = generateNextStage(categoryId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, nextStage: result.nextStage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
