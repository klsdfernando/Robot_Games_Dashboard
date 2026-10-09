import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { swapMatchParticipants } from '@/lib/repository';
import { isSupabaseConfigured, syncTournamentStateToSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sourceMatchId, sourceSlotOrder, targetMatchId, targetSlotOrder } = body;

    if (!sourceMatchId || !targetMatchId || !sourceSlotOrder || !targetSlotOrder) {
      return NextResponse.json(
        { error: 'Missing required parameters for match swap' },
        { status: 400 }
      );
    }

    const result = swapMatchParticipants(
      sourceMatchId,
      Number(sourceSlotOrder),
      targetMatchId,
      Number(targetSlotOrder)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to swap teams' }, { status: 400 });
    }

    if (result.categoryId && isSupabaseConfigured()) {
      syncTournamentStateToSupabase(result.categoryId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Successfully swapped ${result.sourceTeamName} and ${result.targetTeamName}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
