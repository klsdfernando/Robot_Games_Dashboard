import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { setMatchWinner, correctMatchWinner, getMatchById, updateMatchTeams } from '@/lib/repository';
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
    const { status, winnerTeamId, scores, team1Id, team2Id } = body;

    const match = getMatchById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 1. Manually update teams for this battle
    if (team1Id !== undefined || team2Id !== undefined) {
      if (match.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Cannot modify teams of a completed match. Use Winner Correction instead.' },
          { status: 400 }
        );
      }

      const result = updateMatchTeams(id, team1Id, team2Id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(match.categoryId).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    // 2. Change match status (e.g. LIVE or SCHEDULED)
    if (status && status !== match.status && !winnerTeamId) {
      const now = new Date().toISOString();

      if (status === 'LIVE') {
        // Must have both teams ready before going live
        if (match.participants.length < 2 || match.participants.some(p => !p.teamId)) {
          return NextResponse.json(
            { error: 'Cannot set match to LIVE until both teams are assigned.' },
            { status: 400 }
          );
        }

        // ENFORCE: Only ONE match can be LIVE at a time in this division/category!
        // Reset any other currently LIVE matches back to SCHEDULED
        db.prepare(`
          UPDATE matches 
          SET status = 'SCHEDULED', updated_at = ? 
          WHERE category_id = ? AND status = 'LIVE' AND id != ?
        `).run(now, match.categoryId, id);
      }

      db.prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?").run(
        status,
        now,
        id
      );

      if (isSupabaseConfigured()) {
        syncTournamentStateToSupabase(match.categoryId).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    // 3. Declare match winner
    if (winnerTeamId) {
      // Must be LIVE in the arena before a winner can be declared!
      if (match.status !== 'LIVE') {
        return NextResponse.json(
          { error: 'Match must be LIVE in the arena before declaring a winner.' },
          { status: 400 }
        );
      }

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
