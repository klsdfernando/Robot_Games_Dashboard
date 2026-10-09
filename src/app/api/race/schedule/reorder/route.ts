import { NextRequest, NextResponse } from 'next/server';
import { 
  getRaceSchedule, 
  reorderRaceScheduleSlots, 
  shiftRaceScheduleTimes, 
  swapRaceScheduleSlots,
  getRaceScheduleById
} from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';
import { isSupabaseConfigured, syncRaceScheduleBatchToSupabase, syncRaceSlotToSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 1. SWAP ACTION
    if (body.action === 'swap' && body.slot1Id && body.slot2Id) {
      const swapped = swapRaceScheduleSlots(body.slot1Id, body.slot2Id, body.keepTimes !== false);
      if (!swapped) {
        return NextResponse.json({ error: 'One or both slots not found' }, { status: 404 });
      }

      if (isSupabaseConfigured()) {
        await syncRaceSlotToSupabase(swapped.slot1);
        await syncRaceSlotToSupabase(swapped.slot2);
      }

      const updatedSchedule = getRaceSchedule(body.division);
      return NextResponse.json({ 
        success: true, 
        message: 'Slots swapped successfully', 
        schedule: updatedSchedule,
        swapped 
      });
    }

    // 2. SHIFT TIMES ACTION
    if (body.action === 'shift' && typeof body.offsetMinutes === 'number') {
      const shifted = shiftRaceScheduleTimes(
        body.offsetMinutes, 
        body.fromSlotNumber ? Number(body.fromSlotNumber) : undefined,
        body.division
      );

      if (isSupabaseConfigured()) {
        await syncRaceScheduleBatchToSupabase(shifted);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Shifted race times by ${body.offsetMinutes > 0 ? '+' : ''}${body.offsetMinutes} minutes`, 
        schedule: shifted 
      });
    }

    // 3. REORDER SLOTS (FULL LIST OR BATCH)
    const slots = body.slots || body.reorderedSlots;
    if (Array.isArray(slots) && slots.length > 0) {
      const updatedSchedule = reorderRaceScheduleSlots(slots);

      if (isSupabaseConfigured()) {
        await syncRaceScheduleBatchToSupabase(updatedSchedule);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Schedule reordered successfully', 
        schedule: updatedSchedule 
      });
    }

    return NextResponse.json({ error: 'Invalid reorder/swap parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('[Race Schedule Reorder Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update schedule' }, { status: 500 });
  }
}
