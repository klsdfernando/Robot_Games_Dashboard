import { NextRequest, NextResponse } from 'next/server';
import { generateRaceSchedule } from '@/lib/repository';
import { getAdminSession } from '@/lib/auth';

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

    const schedule = generateRaceSchedule({
      startTime,
      intervalMinutes,
      track,
      randomize,
      categoryDivision
    });

    return NextResponse.json({
      success: true,
      message: `Generated schedule for ${schedule.length} racing teams starting at ${startTime} with ${intervalMinutes}-minute intervals.`,
      schedule
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate race schedule' }, { status: 500 });
  }
}
