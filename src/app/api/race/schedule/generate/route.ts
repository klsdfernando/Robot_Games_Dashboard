import { NextRequest, NextResponse } from 'next/server';
import { generateRaceSchedule, getRaceTeams, createRaceTeam } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { isSupabaseConfigured, syncRaceSlotToSupabase, fetchRaceTeamsFromSupabase, getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const startTime = body.startTime || '09:30 AM';
    const intervalMinutes = body.intervalMinutes ? Number(body.intervalMinutes) : 10;
    const track = body.track || 'Track 1';
    const randomize = Boolean(body.randomize);
    const categoryDivision = body.categoryDivision as 'ALL' | 'SCHOOL' | 'UNIVERSITY' | undefined;

    // If local SQLite is empty on this serverless instance, hydrate teams from Supabase
    if (isSupabaseConfigured()) {
      try {
        const localTeams = getRaceTeams(categoryDivision || 'ALL');
        if (localTeams.length === 0) {
          const cloudTeams = await fetchRaceTeamsFromSupabase(categoryDivision || 'ALL');
          for (const ct of cloudTeams) {
            try {
              createRaceTeam({
                name: ct.name,
                categoryDivision: ct.raceCategory || 'SCHOOL',
                robotName: ct.robotName,
                organization: ct.organization,
                logoUrl: ct.logoUrl,
                notes: ct.notes
              });
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[Sync cloud teams to SQLite for schedule warning]:', e);
      }
    }

    const schedule = generateRaceSchedule({
      startTime,
      intervalMinutes,
      track,
      randomize,
      categoryDivision
    });

    // Sync generated slots to Supabase
    if (isSupabaseConfigured()) {
      const client = getSupabaseAdminClient();
      if (client) {
        try {
          if (categoryDivision && categoryDivision !== 'ALL') {
            await client.from('race_schedule').delete().eq('category_division', categoryDivision);
          } else {
            await client.from('race_schedule').delete().neq('id', 'NONE');
          }
        } catch (delErr) {
          console.warn('[Supabase clear schedule before generate warning]:', delErr);
        }
      }

      for (const slot of schedule) {
        await syncRaceSlotToSupabase(slot).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated schedule for ${schedule.length} racing teams starting at ${startTime} with ${intervalMinutes}-minute intervals.`,
      schedule
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate race schedule' }, { status: 500 });
  }
}
