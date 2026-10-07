import { NextRequest, NextResponse } from 'next/server';
import { updateRaceScheduleSlot, deleteRaceScheduleSlot, getRaceScheduleById } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { syncRaceSlotToSupabase, deleteRaceSlotFromSupabase } from '@/lib/supabase';

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

    const updated = updateRaceScheduleSlot(id, {
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

    if (!updated) {
      return NextResponse.json({ error: 'Slot not found or failed to update' }, { status: 404 });
    }

    syncRaceSlotToSupabase(updated).catch(() => {});

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
    const success = deleteRaceScheduleSlot(id);
    if (!success) {
      return NextResponse.json({ error: 'Slot not found or already deleted' }, { status: 404 });
    }

    deleteRaceSlotFromSupabase(id).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete race slot' }, { status: 500 });
  }
}
