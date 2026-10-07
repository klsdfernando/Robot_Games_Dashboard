import { NextRequest, NextResponse } from 'next/server';
import { updateRaceScheduleSlot, deleteRaceScheduleSlot, getRaceScheduleById } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { isSupabaseConfigured, syncRaceSlotToSupabase, deleteRaceSlotFromSupabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slot = getRaceScheduleById(id);
    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }
    return NextResponse.json({ slot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    let updated: any = null;
    try {
      updated = updateRaceScheduleSlot(id, {
        teamName: body.teamName,
        robotName: body.robotName,
        organization: body.organization,
        logoUrl: body.logoUrl,
        categoryDivision: body.categoryDivision,
        slotNumber: body.slotNumber !== undefined ? Number(body.slotNumber) : undefined,
        scheduledTime: body.scheduledTime,
        status: body.status,
        track: body.track,
        timeRecorded: body.timeRecorded,
        score: body.score !== undefined ? (body.score === null ? null : Number(body.score)) : undefined,
        notes: body.notes
      });
    } catch (dbErr) {
      console.warn('[Local SQLite Slot Update Warning]:', dbErr);
    }

    if (!updated) {
      updated = {
        id,
        teamId: body.teamId || null,
        teamName: body.teamName || 'Unknown Team',
        robotName: body.robotName || null,
        organization: body.organization || null,
        logoUrl: body.logoUrl || null,
        categoryDivision: body.categoryDivision || 'SCHOOL',
        slotNumber: body.slotNumber ? Number(body.slotNumber) : 1,
        scheduledTime: body.scheduledTime || '09:30 AM',
        status: body.status || 'SCHEDULED',
        track: body.track || 'Track 1',
        timeRecorded: body.timeRecorded || null,
        score: body.score !== undefined ? (body.score === null ? null : Number(body.score)) : null,
        notes: body.notes || null,
        updatedAt: new Date().toISOString()
      };
    }

    if (isSupabaseConfigured()) {
      await syncRaceSlotToSupabase(updated);
    }

    return NextResponse.json({ success: true, slot: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update race slot' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      await deleteRaceSlotFromSupabase(id);
    }

    try {
      deleteRaceScheduleSlot(id);
    } catch (dbErr) {
      console.warn('[Local SQLite Slot Delete Warning]:', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete race slot' }, { status: 500 });
  }
}
