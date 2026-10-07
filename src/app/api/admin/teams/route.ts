import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTeams, createTeam } from '@/lib/repository';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId') || undefined;
  const teams = getTeams(categoryId);
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.name || !body.categoryId) {
      return NextResponse.json({ error: 'Team name and category are required' }, { status: 400 });
    }

    const team = createTeam({
      categoryId: body.categoryId,
      name: body.name,
      robotName: body.robotName,
      organization: body.organization,
      seed: body.seed ? Number(body.seed) : undefined,
      logoUrl: body.logoUrl,
      notes: body.notes
    });

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
