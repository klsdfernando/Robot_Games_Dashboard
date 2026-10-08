import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTeams, createTeam } from '@/lib/repository';
import { uploadUrlToFreeImage } from '@/lib/freeimage';
import { isSupabaseConfigured, syncTeamToSupabase } from '@/lib/supabase';

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

    let logoUrl = body.logoUrl?.trim() || undefined;
    if (logoUrl && !logoUrl.includes('iili.io') && !logoUrl.includes('freeimage.host')) {
      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.length > 25) {
        try {
          const hosted = await uploadUrlToFreeImage(logoUrl, body.name);
          if (hosted.success && hosted.url) {
            logoUrl = hosted.url;
          }
        } catch {
          // Keep existing logoUrl
        }
      }
    }

    const team = createTeam({
      categoryId: body.categoryId,
      name: body.name,
      robotName: body.robotName,
      organization: body.organization,
      seed: body.seed ? Number(body.seed) : undefined,
      logoUrl,
      notes: body.notes
    });

    if (isSupabaseConfigured()) {
      syncTeamToSupabase(team).catch(() => {});
    }

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
