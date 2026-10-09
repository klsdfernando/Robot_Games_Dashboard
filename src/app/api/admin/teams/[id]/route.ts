import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { updateTeam, deleteTeam } from '@/lib/repository';
import { uploadUrlToFreeImage } from '@/lib/freeimage';
import { isSupabaseConfigured, syncTeamToSupabase, deleteTeamFromSupabase } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();

    let logoUrl = body.logoUrl;
    if (logoUrl && typeof logoUrl === 'string' && !logoUrl.includes('iili.io') && !logoUrl.includes('freeimage.host')) {
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

    const updated = updateTeam(id, {
      name: body.name,
      robotName: body.robotName,
      organization: body.organization,
      seed: body.seed ? Number(body.seed) : undefined,
      status: body.status,
      isWithdrawn: body.isWithdrawn,
      logoUrl,
      notes: body.notes
    });

    if (!updated) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (isSupabaseConfigured()) {
      syncTeamToSupabase(updated).catch(() => {});
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const result = deleteTeam(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      deleteTeamFromSupabase(id).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
