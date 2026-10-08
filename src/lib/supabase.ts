import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { Team, RaceScheduleSlot } from '@/lib/types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let clientInstance: SupabaseClient | null = null;
let adminClientInstance: SupabaseClient | null = null;

/**
 * Returns true if Supabase URL and Key are present in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    (supabaseAnonKey || supabaseServiceKey)
  );
}

/**
 * Returns the Supabase URL currently configured (masked for safety).
 */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}

/**
 * Returns a public Supabase client (browser & server safe).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      auth: { persistSession: false },
      ...(typeof window === 'undefined' ? { realtime: { transport: ws as any } } : {})
    });
  }
  return clientInstance;
}

/**
 * Returns an administrative Supabase client (server-side with Service Role Key if available).
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { transport: ws as any }
    });
  }
  return adminClientInstance;
}

/**
 * Test connectivity to Supabase and verify required tables exist.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  missingTables?: string[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
      error: 'MISSING_ENV_VARS'
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return { success: false, message: 'Could not initialize Supabase client.' };
  }

  try {
    const requiredTables = ['categories', 'teams', 'race_schedule'];
    const tablesFound: string[] = [];
    const missingTables: string[] = [];

    for (const table of requiredTables) {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error && (error.code === 'PGRST205' || error.message.includes('Could not find the table'))) {
        missingTables.push(table);
      } else {
        tablesFound.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Connected to Supabase, but missing table(s): ${missingTables.join(', ')}. Please run supabase/schema.sql in your Supabase SQL editor.`,
        tablesFound,
        missingTables
      };
    }

    return {
      success: true,
      message: 'Supabase connection successful! All tables (teams, race_schedule, categories) are accessible.',
      tablesFound
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Supabase: ${err.message}`,
      error: err.message
    };
  }
}

const CATEGORY_UUID_MAP: Record<string, string> = {
  'cat-heavy': 'c0000000-0000-0000-0000-000000000001',
  'cat-heavyweight': 'c0000000-0000-0000-0000-000000000001',
  'HEAVYWEIGHT': 'c0000000-0000-0000-0000-000000000001',
  'cat-light': 'c0000000-0000-0000-0000-000000000002',
  'cat-lightweight': 'c0000000-0000-0000-0000-000000000002',
  'LIGHTWEIGHT': 'c0000000-0000-0000-0000-000000000002',
  'cat-race-school': 'c0000000-0000-0000-0000-000000000003',
  'RACE_SCHOOL': 'c0000000-0000-0000-0000-000000000003',
  'cat-race-university': 'c0000000-0000-0000-0000-000000000004',
  'RACE_UNIVERSITY': 'c0000000-0000-0000-0000-000000000004',
};

/**
 * Resolves any local string category ID into a valid Supabase UUID.
 */
export function resolveSupabaseCategoryId(categoryId?: string, raceCategory?: string | null): string {
  if (raceCategory === 'UNIVERSITY' || categoryId === 'cat-race-university') {
    return 'c0000000-0000-0000-0000-000000000004';
  }
  if (raceCategory === 'SCHOOL' || categoryId === 'cat-race-school' || categoryId === 'cat-race') {
    return 'c0000000-0000-0000-0000-000000000003';
  }
  if (categoryId && CATEGORY_UUID_MAP[categoryId]) {
    return CATEGORY_UUID_MAP[categoryId];
  }
  if (categoryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
    return categoryId;
  }
  return 'c0000000-0000-0000-0000-000000000003';
}

/**
 * Upserts a team into Supabase (if Supabase is configured).
 */
export async function syncTeamToSupabase(team: {
  id: string;
  name: string;
  categoryId?: string;
  robotName?: string | null;
  organization?: string | null;
  seed?: number | null;
  status?: string;
  lives?: number;
  isWithdrawn?: boolean;
  logoUrl?: string | null;
  raceCategory?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const targetCatId = resolveSupabaseCategoryId(team.categoryId, team.raceCategory);

    const { error } = await client.from('teams').upsert(
      {
        id: team.id,
        category_id: targetCatId,
        name: team.name,
        robot_name: team.robotName || null,
        organization: team.organization || null,
        seed: team.seed || null,
        status: team.status || 'ACTIVE',
        lives: team.lives !== null && team.lives !== undefined ? team.lives : 2,
        is_withdrawn: Boolean(team.isWithdrawn),
        logo_url: team.logoUrl || null,
        race_category: team.raceCategory || (team.categoryId === 'cat-race-university' ? 'UNIVERSITY' : 'SCHOOL'),
        notes: team.notes || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync Team Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a team from Supabase, removing race schedule slots first to satisfy foreign keys.
 */
export async function deleteTeamFromSupabase(teamId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    // Delete any dependent race schedule slots first
    await client.from('race_schedule').delete().eq('team_id', teamId);
    const { error } = await client.from('teams').delete().eq('id', teamId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Delete Team Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Clears all race teams and race schedule slots from Supabase.
 */
export async function clearRaceTeamsFromSupabase(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const schoolCatId = 'c0000000-0000-0000-0000-000000000003';
    const uniCatId = 'c0000000-0000-0000-0000-000000000004';

    if (division === 'SCHOOL') {
      const { data: sTeams } = await client.from('teams').select('id').or(`category_id.eq.${schoolCatId},race_category.eq.SCHOOL`);
      const teamIds = (sTeams || []).map(t => t.id);
      if (teamIds.length > 0) {
        await client.from('race_schedule').delete().in('team_id', teamIds);
      }
      await client.from('race_schedule').delete().eq('category_division', 'SCHOOL');
      await client.from('teams').delete().eq('category_id', schoolCatId);
      await client.from('teams').delete().eq('race_category', 'SCHOOL');
    } else if (division === 'UNIVERSITY') {
      const { data: uTeams } = await client.from('teams').select('id').or(`category_id.eq.${uniCatId},race_category.eq.UNIVERSITY`);
      const teamIds = (uTeams || []).map(t => t.id);
      if (teamIds.length > 0) {
        await client.from('race_schedule').delete().in('team_id', teamIds);
      }
      await client.from('race_schedule').delete().eq('category_division', 'UNIVERSITY');
      await client.from('teams').delete().eq('category_id', uniCatId);
      await client.from('teams').delete().eq('race_category', 'UNIVERSITY');
    } else {
      await client.from('race_schedule').delete().neq('id', 'NONE');
      await client.from('teams').delete().in('category_id', [schoolCatId, uniCatId]);
      await client.from('teams').delete().in('race_category', ['SCHOOL', 'UNIVERSITY']);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Upserts a race schedule slot into Supabase.
 */
export async function syncRaceSlotToSupabase(slot: {
  id: string;
  teamId?: string | null;
  teamName: string;
  robotName?: string | null;
  organization?: string | null;
  logoUrl?: string | null;
  categoryDivision?: string;
  slotNumber: number;
  scheduledTime?: string | null;
  status?: string;
  track?: string | null;
  timeRecorded?: string | null;
  score?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client.from('race_schedule').upsert(
      {
        id: slot.id,
        team_id: slot.teamId || null,
        team_name: slot.teamName,
        robot_name: slot.robotName || null,
        organization: slot.organization || null,
        logo_url: slot.logoUrl || null,
        category_division: slot.categoryDivision || 'SCHOOL',
        slot_number: slot.slotNumber,
        scheduled_time: slot.scheduledTime || '09:30 AM',
        status: slot.status || 'SCHEDULED',
        track: slot.track || 'Track 1',
        time_recorded: slot.timeRecorded || null,
        score: slot.score !== undefined ? slot.score : null,
        notes: slot.notes || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync Race Slot Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a race schedule slot from Supabase.
 */
export async function deleteRaceSlotFromSupabase(slotId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client.from('race_schedule').delete().eq('id', slotId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Delete Race Slot Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches race teams from Supabase cloud database.
 */
export async function fetchRaceTeamsFromSupabase(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): Promise<Team[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];

  const schoolCatId = 'c0000000-0000-0000-0000-000000000003';
  const uniCatId = 'c0000000-0000-0000-0000-000000000004';

  try {
    let query = client.from('teams').select('*');

    if (division === 'SCHOOL') {
      query = query.or(`category_id.eq.${schoolCatId},race_category.eq.SCHOOL`);
    } else if (division === 'UNIVERSITY') {
      query = query.or(`category_id.eq.${uniCatId},race_category.eq.UNIVERSITY`);
    } else {
      query = query.or(`category_id.eq.${schoolCatId},category_id.eq.${uniCatId},race_category.eq.SCHOOL,race_category.eq.UNIVERSITY`);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) {
      console.warn('[Supabase fetchRaceTeams error]:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      categoryId: r.category_id === uniCatId ? 'cat-race-university' : 'cat-race-school',
      name: r.name,
      robotName: r.robot_name || undefined,
      organization: r.organization || undefined,
      seed: r.seed ?? undefined,
      status: r.status || 'ACTIVE',
      lives: r.lives ?? 2,
      isWithdrawn: Boolean(r.is_withdrawn),
      logoUrl: r.logo_url || undefined,
      raceCategory: (r.race_category === 'UNIVERSITY' || r.category_id === uniCatId) ? 'UNIVERSITY' : 'SCHOOL',
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err: any) {
    console.warn('[Supabase fetchRaceTeams exception]:', err.message);
    return [];
  }
}

/**
 * Fetches race schedule slots from Supabase cloud database.
 */
export async function fetchRaceScheduleFromSupabase(division?: 'ALL' | 'SCHOOL' | 'UNIVERSITY'): Promise<RaceScheduleSlot[]> {
  // If PostgreSQL pool is available, query directly from Postgres
  if (process.env.DATABASE_URL) {
    try {
      const { queryPostgres } = await import('@/lib/pg');
      let sql = 'SELECT * FROM public.race_schedule';
      const params: any[] = [];
      if (division && division !== 'ALL') {
        sql += ' WHERE category_division = $1';
        params.push(division);
      }
      sql += ' ORDER BY slot_number ASC';
      const rows = await queryPostgres(sql, params);
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          teamId: r.team_id || undefined,
          teamName: r.team_name,
          robotName: r.robot_name || undefined,
          organization: r.organization || undefined,
          logoUrl: r.logo_url || undefined,
          categoryDivision: (r.category_division === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL'),
          slotNumber: r.slot_number,
          scheduledTime: r.scheduled_time || '09:30 AM',
          status: r.status || 'SCHEDULED',
          track: r.track || 'Track 1',
          timeRecorded: r.time_recorded || undefined,
          score: r.score !== null && r.score !== undefined ? Number(r.score) : undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (pgErr: any) {
      console.warn('[Postgres fetchRaceSchedule Warning]:', pgErr.message);
    }
  }

  const client = getSupabaseAdminClient();
  if (!client) return [];

  try {
    let query = client.from('race_schedule').select('*');
    if (division && division !== 'ALL') {
      query = query.eq('category_division', division);
    }

    const { data, error } = await query.order('slot_number', { ascending: true });
    if (error) {
      console.warn('[Supabase fetchRaceSchedule error]:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      teamId: r.team_id || undefined,
      teamName: r.team_name,
      robotName: r.robot_name || undefined,
      organization: r.organization || undefined,
      logoUrl: r.logo_url || undefined,
      categoryDivision: (r.category_division === 'UNIVERSITY' ? 'UNIVERSITY' : 'SCHOOL'),
      slotNumber: r.slot_number,
      scheduledTime: r.scheduled_time || '09:30 AM',
      status: r.status || 'SCHEDULED',
      track: r.track || 'Track 1',
      timeRecorded: r.time_recorded || undefined,
      score: r.score !== null && r.score !== undefined ? Number(r.score) : undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err: any) {
    console.warn('[Supabase fetchRaceSchedule exception]:', err.message);
    return [];
  }
}

/**
 * Syncs the entire combat tournament state (stages, matches, participants, teams) to Supabase.
 */
export async function syncTournamentStateToSupabase(categoryId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { getStages, getMatches, getTeams } = await import('@/lib/repository');
    const targetCatId = resolveSupabaseCategoryId(categoryId);

    // 1. Sync teams
    const teams = getTeams(categoryId);
    for (const t of teams) {
      await syncTeamToSupabase({
        id: t.id,
        name: t.name,
        categoryId: targetCatId,
        robotName: t.robotName,
        organization: t.organization,
        seed: t.seed,
        status: t.status,
        lives: t.lives,
        isWithdrawn: t.isWithdrawn,
        logoUrl: t.logoUrl,
        notes: t.notes
      });
    }

    // 2. Sync stages
    const stages = getStages(categoryId);
    for (const s of stages) {
      await client.from('stages').upsert({
        id: s.id,
        category_id: targetCatId,
        stage_type: s.stageType,
        stage_order: s.stageOrder,
        display_name: s.displayName,
        status: s.status,
        started_at: s.startedAt || null,
        completed_at: s.completedAt || null
      }, { onConflict: 'id' });
    }

    // 3. Sync matches and participants
    const matches = getMatches(categoryId);
    for (const m of matches) {
      await client.from('matches').upsert({
        id: m.id,
        category_id: targetCatId,
        stage_id: m.stageId,
        stage_type: m.stageType,
        match_number: m.matchNumber,
        round_order: m.roundOrder,
        status: m.status,
        winner_team_id: m.winnerTeamId || null,
        completed_at: m.completedAt || null,
        next_match_id: m.nextMatchId || null,
        wildcard_match_id: m.wildcardMatchId || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      for (const p of m.participants) {
        await client.from('match_participants').upsert({
          id: p.id,
          match_id: m.id,
          team_id: p.teamId || null,
          placeholder_text: p.placeholderText || null,
          participant_order: p.participantOrder,
          is_winner: Boolean(p.isWinner),
          score: p.score ?? 0,
          advancement_source: p.advancementSource || null,
          source_match_id: p.sourceMatchId || null
        }, { onConflict: 'id' });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync Tournament State Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Clears tournament stages and matches for a category from Supabase.
 */
export async function clearTournamentFromSupabase(categoryId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const targetCatId = resolveSupabaseCategoryId(categoryId);
    await client.from('matches').delete().eq('category_id', targetCatId);
    await client.from('stages').delete().eq('category_id', targetCatId);
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Clear Tournament Error]:', err.message);
    return { success: false, error: err.message };
  }
}


