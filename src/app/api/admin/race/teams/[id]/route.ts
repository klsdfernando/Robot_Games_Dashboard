import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTeamById, updateTeam, deleteRaceTeam } from '@/lib/repository';
import { resolveDriveLogoUrl } from '@/lib/logo-downloader';
import { syncTeamToSupabase, deleteTeamFromSupabase } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = getTeamById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, categoryDivision, robotName, organization, driveLink, logoUrl: directLogoUrl, notes } = body;

    let resolvedLogoUrl = directLogoUrl !== undefined ? directLogoUrl : existing.logoUrl;

    if (driveLink && typeof driveLink === 'string' && driveLink.trim()) {
      resolvedLogoUrl = resolveDriveLogoUrl(driveLink.trim()) || driveLink.trim();
    }

    const categoryId = categoryDivision === 'UNIVERSITY' ? 'cat-race-university' : 'cat-race-school';

    const updated = updateTeam(id, {
      name: name !== undefined ? name.trim() : existing.name,
      categoryId,
      robotName: robotName !== undefined ? robotName?.trim() || undefined : existing.robotName,
      organization: organization !== undefined ? organization?.trim() || undefined : existing.organization,
      logoUrl: resolvedLogoUrl,
      notes: notes !== undefined ? notes?.trim() || undefined : existing.notes
    });

    if (updated) {
      // Sync update to Supabase
      syncTeamToSupabase(updated).catch(err => {
        console.warn('[Supabase Sync Update Warning]:', err);
      });
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update race team' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = deleteRaceTeam(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Team not found or already deleted' }, { status: 404 });
    }

    // Also delete from Supabase if configured
    deleteTeamFromSupabase(id).catch(err => {
      console.warn('[Supabase Delete Warning]:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete race team' }, { status: 500 });
  }
}
