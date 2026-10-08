import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { setMatchWinner, correctMatchWinner, getMatchById } from '@/lib/repository';
import db from '@/lib/db';
import { isSupabaseConfigured, syncTournamentStateToSupabase } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, winnerTeamId, scores } = body;

    const match = getMatchById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (status && status !== match.status && !winnerTeamId) {
      db.prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?").run(
        status,
        new Date().toISOString(),
        id
      );
      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(match.categoryId).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    if (winnerTeamId) {
      const result = setMatchWinner(id, winnerTeamId, scores);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(match.categoryId).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST for safe winner correction
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { newWinnerTeamId } = await req.json();

    if (!newWinnerTeamId) {
      return NextResponse.json({ error: 'New winner team ID is required' }, { status: 400 });
    }

    const match = getMatchById(id);
    const result = correctMatchWinner(id, newWinnerTeamId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (isSupabaseConfigured() && match) {
      syncTournamentStateToSupabase(match.categoryId).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
