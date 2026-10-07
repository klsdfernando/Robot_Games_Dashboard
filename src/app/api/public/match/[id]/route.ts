import { NextRequest, NextResponse } from 'next/server';
import { getMatchById, getCategoryById } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const match = getMatchById(id);

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const category = getCategoryById(match.categoryId);

    // Additional lineage information
    const nextMatch = match.nextMatchId ? getMatchById(match.nextMatchId) : null;
    const sourceMatches = match.participants
      .filter(p => p.sourceMatchId)
      .map(p => getMatchById(p.sourceMatchId!))
      .filter(Boolean);

    return NextResponse.json({
      match,
      category,
      nextMatch,
      sourceMatches
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
