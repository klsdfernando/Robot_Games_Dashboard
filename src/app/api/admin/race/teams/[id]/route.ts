import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTeamById, updateTeam, deleteRaceTeam } from '@/lib/repository';
import { resolveDriveLogoUrl } from '@/lib/logo-downloader';
import { isSupabaseConfigured, syncTeamToSupabase, deleteTeamFromSupabase } from '@/lib/supabase';

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
    const body = await req.json();
    const { name, categoryDivision, robotName, organization, driveLink, logoUrl: directLogoUrl, notes } = body;

    let existing: any = null;
    try {
      existing = getTeamById(id);
    } catch (e) {
      console.warn('[Local SQLite Get Warning]:', e);
    }

    let resolvedLogoUrl = directLogoUrl !== undefined ? directLogoUrl : (existing?.logoUrl);

    if (driveLink && typeof driveLink === 'string' && driveLink.trim()) {
      resolvedLogoUrl = resolveDriveLogoUrl(driveLink.trim()) || driveLink.trim();
    }

    const categoryId = categoryDivision === 'UNIVERSITY' ? 'cat-race-university' : 'cat-race-school';

    let updated: any = null;
    if (existing) {
      try {
        updated = updateTeam(id, {
          name: name !== undefined ? name.trim() : existing.name,
          categoryId,
          robotName: robotName !== undefined ? robotName?.trim() || undefined : existing.robotName,
          organization: organization !== undefined ? organization?.trim() || undefined : existing.organization,
          logoUrl: resolvedLogoUrl,
          notes: notes !== undefined ? notes?.trim() || undefined : existing.notes
        });
      } catch (e) {
        console.warn('[Local SQLite Update Warning]:', e);
      }
    }

    if (!updated) {
      updated = {
        id,
        categoryId,
        name: name ? name.trim() : 'Updated Team',
        robotName: robotName ? robotName.trim() : undefined,
        organization: organization ? organization.trim() : undefined,
        logoUrl: resolvedLogoUrl,
        raceCategory: categoryDivision === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL',
        notes: notes ? notes.trim() : undefined,
        status: 'ACTIVE',
        lives: 2,
        isWithdrawn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Sync update to Supabase
    if (isSupabaseConfigured()) {
      await syncTeamToSupabase(updated);
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

    // Delete from Supabase first if configured
    if (isSupabaseConfigured()) {
      await deleteTeamFromSupabase(id);
    }

    // Also delete from local SQLite
    try {
      deleteRaceTeam(id);
    } catch (dbErr) {
      console.warn('[Local SQLite Delete Warning]:', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete race team' }, { status: 500 });
  }
}
