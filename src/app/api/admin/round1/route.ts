import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { startRound1, getTeams } from '@/lib/repository';
import { generateRound1Plan } from '@/lib/tournament-engine';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categoryId, manualByeTeamId, customPairings, previewOnly } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const teams = getTeams(categoryId).filter(t => !t.isWithdrawn);

    if (previewOnly) {
      const plan = generateRound1Plan(teams, manualByeTeamId, true);
      return NextResponse.json({
        preview: true,
        matches: plan.matches,
        byeTeam: plan.byeTeam,
        totalTeams: teams.length
      });
    }

    const result = startRound1(categoryId, manualByeTeamId, customPairings);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
