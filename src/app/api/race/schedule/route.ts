import { NextRequest, NextResponse } from 'next/server';
import { getRaceSchedule, createRaceScheduleSlot, clearRaceSchedule } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { isSupabaseConfigured, syncRaceSlotToSupabase, fetchRaceScheduleFromSupabase, getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') as 'ALL' | 'SCHOOL' | 'UNIVERSITY' | null;

    let schedule: any[] = [];

    // Prioritize Supabase cloud database if configured
    if (isSupabaseConfigured()) {
      try {
        const cloudSchedule = await fetchRaceScheduleFromSupabase(division || 'ALL');
        if (cloudSchedule && Array.isArray(cloudSchedule)) {
          schedule = cloudSchedule;
        }
      } catch (err) {
        console.warn('[Supabase Schedule Fetch Warning]:', err);
      }
    }

    // Fall back to local SQLite if Supabase not configured or returned nothing
    if (schedule.length === 0) {
      try {
        schedule = getRaceSchedule(division || undefined);
      } catch (e) {
        console.warn('[Local SQLite Schedule Fetch Warning]:', e);
      }
    }

    return NextResponse.json({ schedule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch race schedule' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.teamName || !body.scheduledTime) {
      return NextResponse.json({ error: 'Team name and scheduled time are required' }, { status: 400 });
    }

    const division = body.categoryDivision === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL';

    let slot: any;
    try {
      slot = createRaceScheduleSlot({
        teamId: body.teamId,
        teamName: body.teamName,
        robotName: body.robotName,
        organization: body.organization,
        logoUrl: body.logoUrl,
        categoryDivision: division,
        slotNumber: body.slotNumber ? Number(body.slotNumber) : undefined,
        scheduledTime: body.scheduledTime,
        status: body.status || 'SCHEDULED',
        track: body.track || 'Track 1',
        timeRecorded: body.timeRecorded,
        score: body.score !== undefined && body.score !== null ? Number(body.score) : undefined,
        notes: body.notes
      });
    } catch (dbErr) {
      console.warn('[Local SQLite Slot Insert Warning]:', dbErr);
      const slotId = `slot-${crypto.randomUUID()}`;
      slot = {
        id: slotId,
        teamId: body.teamId || null,
        teamName: body.teamName,
        robotName: body.robotName || null,
        organization: body.organization || null,
        logoUrl: body.logoUrl || null,
        categoryDivision: division,
        slotNumber: body.slotNumber ? Number(body.slotNumber) : 1,
        scheduledTime: body.scheduledTime,
        status: body.status || 'SCHEDULED',
        track: body.track || 'Track 1',
        timeRecorded: body.timeRecorded || null,
        score: body.score !== undefined && body.score !== null ? Number(body.score) : null,
        notes: body.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    if (isSupabaseConfigured()) {
      await syncRaceSlotToSupabase(slot);
    }

    return NextResponse.json({ success: true, slot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create race slot' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    if (isSupabaseConfigured()) {
      const client = getSupabaseAdminClient();
      if (client) {
        await client.from('race_schedule').delete().neq('id', 'NONE');
      }
    }

    try {
      clearRaceSchedule();
    } catch (e) {
      console.warn('[Local SQLite Clear Schedule Warning]:', e);
    }

    return NextResponse.json({ success: true, message: 'Race schedule cleared' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear race schedule' }, { status: 500 });
  }
}
