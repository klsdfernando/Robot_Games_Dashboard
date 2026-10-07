import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
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

  const settings = db.prepare('SELECT * FROM tournament_settings WHERE category_id = ?').get(categoryId) as any;
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { categoryId, wildcardSingleTeamRule, autoProgressStages, allowManualPairings } = await req.json();

    db.prepare(`
      UPDATE tournament_settings
      SET wildcard_single_team_rule = ?, auto_progress_stages = ?, allow_manual_pairings = ?, updated_at = ?
      WHERE category_id = ?
    `).run(
      wildcardSingleTeamRule || 'MANUAL',
      autoProgressStages ? 1 : 0,
      allowManualPairings ? 1 : 0,
      new Date().toISOString(),
      categoryId
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
