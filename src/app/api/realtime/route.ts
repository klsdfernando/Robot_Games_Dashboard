import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    let query = `
      SELECT MAX(updated_at) as last_update, COUNT(*) as match_count,
             SUM(CASE WHEN status = 'LIVE' THEN 1 ELSE 0 END) as live_count,
             SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count
      FROM matches
    `;
    const params: any[] = [];
    if (categoryId) {
      query += ' WHERE category_id = ?';
      params.push(categoryId);
    }

    const stats = db.prepare(query).get(...params) as any;

    return NextResponse.json({
      lastUpdate: stats?.last_update || new Date().toISOString(),
      matchCount: stats?.match_count || 0,
      liveCount: stats?.live_count || 0,
      completedCount: stats?.completed_count || 0,
      timestamp: Date.now()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
