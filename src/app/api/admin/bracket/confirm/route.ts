import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { confirmTeamsAndGenerateFullBracket } from '@/lib/repository';
import { isSupabaseConfigured, syncTournamentStateToSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { categoryId, randomize, customPairings } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const result = confirmTeamsAndGenerateFullBracket(categoryId, Boolean(randomize), customPairings);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      syncTournamentStateToSupabase(categoryId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
