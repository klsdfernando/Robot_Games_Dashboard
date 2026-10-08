import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  testSupabaseConnection,
  syncTeamToSupabase,
  syncRaceSlotToSupabase
} from '@/lib/supabase';
import { getTeams, getRaceSchedule } from '@/lib/repository';

export async function GET() {
  const configured = isSupabaseConfigured();
  const url = getSupabaseUrl();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      url: url ? url.substring(0, 15) + '...' : '',
      status: 'NOT_CONFIGURED',
      message: 'Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable cloud sync.'
    });
  }

  const testResult = await testSupabaseConnection();
  return NextResponse.json({
    configured: true,
    url: url.replace(/^https?:\/\//, '').split('.')[0], // Safe project identifier
    status: testResult.success ? 'CONNECTED' : 'ERROR',
    message: testResult.message,
    tablesFound: testResult.tablesFound || [],
    missingTables: testResult.missingTables || []
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action || 'test';

    if (action === 'test') {
      const res = await testSupabaseConnection();
      return NextResponse.json(res);
    }

    if (action === 'sync_all') {
      if (!isSupabaseConfigured()) {
        return NextResponse.json({
          success: false,
          error: 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        }, { status: 400 });
      }

      // Ensure categories exist in Supabase
      const client = (await import('@/lib/supabase')).getSupabaseAdminClient();
      if (client) {
        const categories = [
          { id: 'c0000000-0000-0000-0000-000000000001', name: 'HEAVYWEIGHT', display_name: 'Heavyweight Division', description: '20kg combat robots' },
          { id: 'c0000000-0000-0000-0000-000000000002', name: 'LIGHTWEIGHT', display_name: 'Lightweight Division', description: '3kg combat robots' },
          { id: 'c0000000-0000-0000-0000-000000000003', name: 'RACE_SCHOOL', display_name: 'School Category', description: 'Robot Race School Category' },
          { id: 'c0000000-0000-0000-0000-000000000004', name: 'RACE_UNIVERSITY', display_name: 'University Category', description: 'Robot Race University Category' }
        ];
        for (const cat of categories) {
          await client.from('categories').upsert(cat, { onConflict: 'name' });
        }
      }

      // Sync all teams (combat + race)
      const allTeams = getTeams();
      let teamsSynced = 0;
      let teamsFailed = 0;

      for (const team of allTeams) {
        const res = await syncTeamToSupabase({
          id: team.id,
          name: team.name,
          categoryId: team.categoryId,
          robotName: team.robotName,
          organization: team.organization,
          seed: team.seed,
          status: team.status,
          lives: team.lives,
          isWithdrawn: team.isWithdrawn,
          logoUrl: team.logoUrl,
          raceCategory: team.raceCategory,
          notes: team.notes
        });

        if (res.success) {
          teamsSynced++;
        } else {
          teamsFailed++;
        }
      }

      // Sync all race schedule slots
      const raceSlots = getRaceSchedule();
      let slotsSynced = 0;
      let slotsFailed = 0;

      for (const slot of raceSlots) {
        const res = await syncRaceSlotToSupabase({
          id: slot.id,
          teamId: slot.teamId,
          teamName: slot.teamName,
          robotName: slot.robotName,
          organization: slot.organization,
          logoUrl: slot.logoUrl,
          categoryDivision: slot.categoryDivision,
          slotNumber: slot.slotNumber,
          scheduledTime: slot.scheduledTime,
          status: slot.status,
          track: slot.track,
          timeRecorded: slot.timeRecorded,
          score: slot.score,
          notes: slot.notes
        });

        if (res.success) {
          slotsSynced++;
        } else {
          slotsFailed++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${teamsSynced} teams and ${slotsSynced} race slots to Supabase!`,
        synced: {
          teams: teamsSynced,
          teamsFailed,
          raceSlots: slotsSynced,
          slotsFailed
        }
      });
    }

    if (action === 'pull_from_supabase') {
      const { queryPostgres } = await import('@/lib/pg');
      const db = (await import('@/lib/db')).default;

      const rows = await queryPostgres(`
        SELECT team_no, name, category, category_folder, filename,
               logo_url, viewer_url, thumbnail_url, dimensions, size,
               status, organization, leader_name, leader_email, leader_phone
        FROM public.teams
        ORDER BY team_no ASC;
      `);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, error: 'No teams found in Supabase public.teams' }, { status: 404 });
      }

      let hw = 0;
      let lw = 0;
      let raceCount = 0;
      const nowIso = new Date().toISOString();

      const insertTeamStmt = db.prepare(`
        INSERT INTO teams (
          id, category_id, name, organization, seed, status, lives,
          is_withdrawn, logo_url, race_category, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          category_id=excluded.category_id,
          name=excluded.name,
          organization=excluded.organization,
          seed=excluded.seed,
          logo_url=excluded.logo_url,
          race_category=excluded.race_category,
          notes=excluded.notes,
          updated_at=excluded.updated_at;
      `);

      const insertSlotStmt = db.prepare(`
        INSERT INTO race_schedule (
          id, team_id, team_name, robot_name, organization, logo_url,
          slot_number, scheduled_time, status, track, category_division,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          team_name=excluded.team_name,
          organization=excluded.organization,
          logo_url=excluded.logo_url,
          category_division=excluded.category_division,
          updated_at=excluded.updated_at;
      `);

      for (const r of rows) {
        const catLower = (r.category || '').toLowerCase();
        let catId = 'cat-race-university';
        let raceCat: 'SCHOOL' | 'UNIVERSITY' | null = 'UNIVERSITY';
        let teamId = `team-race-uni-${r.team_no}`;

        if (catLower.includes('heavy')) {
          catId = 'cat-heavyweight';
          raceCat = null;
          teamId = `team-hw-${r.team_no}`;
          hw++;
        } else if (catLower.includes('light')) {
          catId = 'cat-lightweight';
          raceCat = null;
          teamId = `team-lw-${r.team_no}`;
          lw++;
        } else if (catLower.includes('school')) {
          catId = 'cat-race-school';
          raceCat = 'SCHOOL';
          teamId = `team-race-sch-${r.team_no}`;
          raceCount++;
        } else {
          raceCount++;
        }

        const contactParts: string[] = [];
        if (r.leader_name) contactParts.push(`Leader: ${r.leader_name}`);
        if (r.leader_phone) contactParts.push(`Phone: ${r.leader_phone}`);
        if (r.leader_email) contactParts.push(`Email: ${r.leader_email}`);
        const notes = contactParts.length > 0 ? contactParts.join(' | ') : null;

        insertTeamStmt.run(
          teamId,
          catId,
          r.name.trim(),
          r.organization?.trim() || null,
          r.team_no,
          'ACTIVE',
          2,
          0,
          r.logo_url?.trim() || null,
          raceCat,
          notes,
          nowIso,
          nowIso
        );

        if (raceCat) {
          insertSlotStmt.run(
            `slot-race-${r.team_no}`,
            teamId,
            r.name.trim(),
            null,
            r.organization?.trim() || null,
            r.logo_url?.trim() || null,
            r.team_no,
            '09:30 AM',
            'SCHEDULED',
            'Main Arena Track',
            raceCat,
            nowIso,
            nowIso
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: `Imported ${rows.length} teams from Supabase! (Heavyweight: ${hw}, Lightweight: ${lw}, Race: ${raceCount})`,
        counts: { total: rows.length, heavyweight: hw, lightweight: lw, race: raceCount }
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Supabase action failed' }, { status: 500 });
  }
}
