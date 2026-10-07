const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// 1. Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

// Import local repository
const Database = require('better-sqlite3');
const dbPath = path.join(process.cwd(), 'data', 'tournament.db');
if (!fs.existsSync(dbPath)) {
  console.error('❌ Local database not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

async function runSync() {
  console.log('====================================================');
  console.log('⚡ ROBOT GAMES TOURNAMENT - SUPABASE SYNC');
  console.log(`Connecting to: ${supabaseUrl}`);
  console.log('====================================================\n');

  // Step 1: Check categories
  console.log('1️⃣ Checking & Seeding Categories...');
  const categories = [
    { id: 'c0000000-0000-0000-0000-000000000001', name: 'HEAVYWEIGHT', display_name: 'Heavyweight Division', description: '60kg combat robots' },
    { id: 'c0000000-0000-0000-0000-000000000002', name: 'LIGHTWEIGHT', display_name: 'Lightweight Division', description: '15kg combat robots' },
    { id: 'c0000000-0000-0000-0000-000000000003', name: 'RACE_SCHOOL', display_name: 'School Category', description: 'Robot Race School Category' },
    { id: 'c0000000-0000-0000-0000-000000000004', name: 'RACE_UNIVERSITY', display_name: 'University Category', description: 'Robot Race University Category' }
  ];

  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'name' });
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.error('\n❌ ERROR: Supabase tables have not been created yet!');
        console.error('👉 Please open Supabase Dashboard -> SQL Editor and execute "supabase/schema.sql" first.\n');
        process.exit(1);
      }
      console.warn(`  ⚠️ Category ${cat.name}:`, error.message);
    } else {
      console.log(`  ✅ Category synced: ${cat.display_name} (${cat.name})`);
    }
  }

  const { data: supaCats } = await supabase.from('categories').select('*');
  const catMap = {};
  supaCats?.forEach(c => { catMap[c.name] = c.id; });

  // Step 2: Sync Teams
  console.log('\n2️⃣ Syncing Teams to Supabase...');
  const teams = db.prepare('SELECT * FROM teams').all();
  console.log(`Found ${teams.length} teams in local SQLite.`);

  let teamsSynced = 0;
  for (const t of teams) {
    let targetCatId = catMap['RACE_SCHOOL'];
    if (t.race_category === 'UNIVERSITY' || t.category_id === 'cat-race-university') {
      targetCatId = catMap['RACE_UNIVERSITY'] || targetCatId;
    } else if (t.category_id === 'cat-heavy') {
      targetCatId = catMap['HEAVYWEIGHT'] || targetCatId;
    } else if (t.category_id === 'cat-light') {
      targetCatId = catMap['LIGHTWEIGHT'] || targetCatId;
    }

    const { error } = await supabase.from('teams').upsert({
      id: t.id,
      category_id: targetCatId,
      name: t.name,
      robot_name: t.robot_name || null,
      organization: t.organization || null,
      seed: t.seed || null,
      status: t.status || 'ACTIVE',
      lives: t.lives !== null && t.lives !== undefined ? t.lives : 2,
      is_withdrawn: Boolean(t.is_withdrawn),
      logo_url: t.logo_url || null,
      race_category: t.race_category || 'SCHOOL',
      notes: t.notes || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`  ❌ Failed team "${t.name}":`, error.message);
    } else {
      teamsSynced++;
      console.log(`  ✅ Team synced: "${t.name}" [${t.race_category || 'COMBAT'}] -> Logo: ${t.logo_url || 'None'}`);
    }
  }

  // Step 3: Sync Race Schedule
  console.log('\n3️⃣ Syncing Race Schedule Slots to Supabase...');
  const slots = db.prepare('SELECT * FROM race_schedule').all();
  console.log(`Found ${slots.length} schedule slots in local SQLite.`);

  let slotsSynced = 0;
  for (const s of slots) {
    const { error } = await supabase.from('race_schedule').upsert({
      id: s.id,
      team_id: s.team_id || null,
      team_name: s.team_name,
      robot_name: s.robot_name || null,
      organization: s.organization || null,
      logo_url: s.logo_url || null,
      category_division: s.category_division || 'SCHOOL',
      slot_number: s.slot_number,
      scheduled_time: s.scheduled_time || '09:30 AM',
      status: s.status || 'SCHEDULED',
      track: s.track || 'Track 1',
      time_recorded: s.time_recorded || null,
      score: s.score !== null && s.score !== undefined ? s.score : null,
      notes: s.notes || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn(`  ❌ Slot ${s.slot_number} ("${s.team_name}") failed:`, error.message);
    } else {
      slotsSynced++;
      console.log(`  ✅ Slot #${s.slot_number} synced: "${s.team_name}" (${s.category_division}) at ${s.scheduled_time}`);
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 COMPLETED! Synced ${teamsSynced}/${teams.length} teams and ${slotsSynced}/${slots.length} race slots to Supabase!`);
  console.log('====================================================');
}

runSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
