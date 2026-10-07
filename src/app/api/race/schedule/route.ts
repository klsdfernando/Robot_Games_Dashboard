import { NextRequest, NextResponse } from 'next/server';
import { getRaceSchedule, createRaceScheduleSlot, clearRaceSchedule } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { syncRaceSlotToSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') as 'ALL' | 'SCHOOL' | 'UNIVERSITY' | null;
    const schedule = getRaceSchedule(division || undefined);
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

    const slot = createRaceScheduleSlot({
      teamId: body.teamId,
      teamName: body.teamName,
      robotName: body.robotName,
      organization: body.organization,
      logoUrl: body.logoUrl,
      categoryDivision: body.categoryDivision === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL',
      slotNumber: body.slotNumber ? Number(body.slotNumber) : undefined,
      scheduledTime: body.scheduledTime,
      status: body.status || 'SCHEDULED',
      track: body.track || 'Track 1',
      timeRecorded: body.timeRecorded,
      score: body.score !== undefined && body.score !== null ? Number(body.score) : undefined,
      notes: body.notes
    });

    syncRaceSlotToSupabase(slot).catch(() => {});

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
    clearRaceSchedule();
    return NextResponse.json({ success: true, message: 'Race schedule cleared' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear race schedule' }, { status: 500 });
  }
}
