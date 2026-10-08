import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getRaceTeams, createRaceTeam, clearAllRaceTeams } from '@/lib/repository';
import { resolveDriveLogoUrl } from '@/lib/logo-downloader';
import { uploadUrlToFreeImage } from '@/lib/freeimage';
import { isSupabaseConfigured, syncTeamToSupabase, fetchRaceTeamsFromSupabase, clearRaceTeamsFromSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') as 'ALL' | 'SCHOOL' | 'UNIVERSITY' | null;

    let allTeams: any[] = [];

    // Prioritize Supabase cloud database if configured
    if (isSupabaseConfigured()) {
      try {
        const cloudTeams = await fetchRaceTeamsFromSupabase('ALL');
        if (cloudTeams && Array.isArray(cloudTeams)) {
          allTeams = cloudTeams;
        }
      } catch (err) {
        console.warn('[Supabase Fetch Teams Warning]:', err);
      }
    }

    // Fall back to local SQLite if Supabase not configured or returned nothing
    if (allTeams.length === 0) {
      try {
        allTeams = getRaceTeams('ALL');
      } catch (e) {
        console.warn('[Local SQLite Fetch Warning]:', e);
      }
    }

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

    // Store Freeimage CDN link / image URL directly in database as logo_url
    let resolvedLogoUrl: string | undefined = undefined;
    const rawUrl = (driveLink || directLogoUrl || '').trim();
    if (rawUrl) {
      try {
        const hosted = await uploadUrlToFreeImage(rawUrl, name.trim());
        if (hosted.success && hosted.url) {
          resolvedLogoUrl = hosted.url;
        } else {
          resolvedLogoUrl = resolveDriveLogoUrl(rawUrl) || rawUrl;
        }
      } catch {
        resolvedLogoUrl = resolveDriveLogoUrl(rawUrl) || rawUrl;
      }
    }

    let team: any;
    try {
      team = createRaceTeam({
        name: name.trim(),
        categoryDivision: division,
        robotName: robotName?.trim() || undefined,
        organization: organization?.trim() || undefined,
        logoUrl: resolvedLogoUrl,
        notes: notes?.trim() || undefined
      });
    } catch (dbErr) {
      console.warn('[Local SQLite Insert Warning]:', dbErr);
      team = {
        id: `team-${crypto.randomUUID()}`,
        categoryId: division === 'UNIVERSITY' ? 'cat-race-university' : 'cat-race-school',
        name: name.trim(),
        robotName: robotName?.trim() || undefined,
        organization: organization?.trim() || undefined,
        status: 'ACTIVE',
        lives: 2,
        isWithdrawn: false,
        logoUrl: resolvedLogoUrl,
        raceCategory: division,
        notes: notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Automatically sync team to Supabase cloud if configured
    if (isSupabaseConfigured()) {
      await syncTeamToSupabase(team);
    }

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

    // Clear from Supabase first if configured
    if (isSupabaseConfigured()) {
      await clearRaceTeamsFromSupabase(division);
    }

    let deletedCount = 0;
    try {
      const result = clearAllRaceTeams(division);
      deletedCount = result.count;
    } catch (dbErr) {
      console.warn('[Local SQLite Clear Warning]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Cleared race teams from ${division === 'ALL' ? 'all divisions' : division + ' division'}.`,
      deletedCount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear race teams' }, { status: 500 });
  }
}
