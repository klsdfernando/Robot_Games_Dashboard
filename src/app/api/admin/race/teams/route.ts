import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getRaceTeams, createRaceTeam } from '@/lib/repository';
import { resolveDriveLogoUrl } from '@/lib/logo-downloader';
import { syncTeamToSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') as 'ALL' | 'SCHOOL' | 'UNIVERSITY' | null;

    const allTeams = getRaceTeams('ALL');
    const schoolTeams = allTeams.filter(t => t.raceCategory === 'SCHOOL');
    const universityTeams = allTeams.filter(t => t.raceCategory === 'UNIVERSITY');

    const filtered = division && division !== 'ALL'
      ? (division === 'SCHOOL' ? schoolTeams : universityTeams)
      : allTeams;

    return NextResponse.json({
      teams: filtered,
      schoolTeams,
      universityTeams,
      counts: {
        total: allTeams.length,
        school: schoolTeams.length,
        university: universityTeams.length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch race teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, categoryDivision, robotName, organization, driveLink, logoUrl: directLogoUrl, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const division: 'SCHOOL' | 'UNIVERSITY' = categoryDivision === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL';

    // Store Google Drive Link / image URL directly in database as logo_url (NO local file download)
    let resolvedLogoUrl: string | undefined = undefined;
    const rawUrl = (driveLink || directLogoUrl || '').trim();
    if (rawUrl) {
      resolvedLogoUrl = resolveDriveLogoUrl(rawUrl) || rawUrl;
    }

    const team = createRaceTeam({
      name: name.trim(),
      categoryDivision: division,
      robotName: robotName?.trim() || undefined,
      organization: organization?.trim() || undefined,
      logoUrl: resolvedLogoUrl,
      notes: notes?.trim() || undefined
    });

    // Automatically sync team to Supabase if configured
    syncTeamToSupabase(team).catch(err => {
      console.warn('[Supabase Sync Warning]:', err);
    });

    return NextResponse.json({
      success: true,
      team,
      logoUrl: resolvedLogoUrl || null
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create race team' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const division = (searchParams.get('division') || 'ALL') as 'ALL' | 'SCHOOL' | 'UNIVERSITY';

    const { clearAllRaceTeams } = await import('@/lib/repository');
    const { clearRaceTeamsFromSupabase } = await import('@/lib/supabase');

    const result = clearAllRaceTeams(division);
    clearRaceTeamsFromSupabase(division).catch(err => {
      console.warn('[Supabase Clear Warning]:', err);
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} race teams from ${division === 'ALL' ? 'all divisions' : division + ' division'}.`,
      deletedCount: result.count
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear race teams' }, { status: 500 });
  }
}
