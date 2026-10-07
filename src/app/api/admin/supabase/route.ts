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

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Supabase action failed' }, { status: 500 });
  }
}
