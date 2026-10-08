import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDatabaseInstance(): Database.Database {
  // Detect if running in serverless / read-only environment like Vercel or AWS Lambda
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION
  );

  const localDir = path.join(process.cwd(), 'data');
  const localDbPath = path.join(localDir, 'robot_games.db');

  let useTmp = isServerless;

  // If not explicitly serverless, test whether localDir is writable
  if (!useTmp) {
    try {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const testFile = path.join(localDir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
    } catch {
      useTmp = true;
    }
  }

  let dbPath = localDbPath;

  if (useTmp) {
    // /tmp is the ONLY writable directory on Vercel / AWS Lambda
    const tmpDbPath = path.join('/tmp', 'robot_games.db');
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(localDbPath)) {
        fs.copyFileSync(localDbPath, tmpDbPath);
        if (fs.existsSync(localDbPath + '-wal')) {
          try { fs.copyFileSync(localDbPath + '-wal', tmpDbPath + '-wal'); } catch {}
        }
        if (fs.existsSync(localDbPath + '-shm')) {
          try { fs.copyFileSync(localDbPath + '-shm', tmpDbPath + '-shm'); } catch {}
        }
      }
    } catch (copyErr) {
      console.warn('[DB] Could not copy bundled DB to /tmp, will initialize new DB:', copyErr);
    }
    dbPath = tmpDbPath;
  }

  let dbInstance: Database.Database;
  try {
    dbInstance = new Database(dbPath);
  } catch (openErr) {
    console.warn(`[DB] Failed to open ${dbPath}, falling back to /tmp fallback:`, openErr);
    const fallbackPath = path.join('/tmp', `robot_games_${Date.now()}.db`);
    dbInstance = new Database(fallbackPath);
  }

  // Set pragmas safely
  try {
    dbInstance.pragma('journal_mode = WAL');
  } catch {
    try {
      dbInstance.pragma('journal_mode = DELETE');
    } catch {}
  }

  try {
    dbInstance.pragma('foreign_keys = ON');
  } catch {}

  return dbInstance;
}

const db = getDatabaseInstance();

export function initDatabase() {
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      robot_name TEXT,
      organization TEXT,
      seed INTEGER,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      lives INTEGER NOT NULL DEFAULT 2,
      is_withdrawn INTEGER NOT NULL DEFAULT 0,
      logo_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      stage_type TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      stage_id TEXT NOT NULL REFERENCES stages(id),
      stage_type TEXT NOT NULL,
      match_number INTEGER NOT NULL,
      round_order INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      winner_team_id TEXT REFERENCES teams(id),
      scheduled_time TEXT,
      completed_at TEXT,
      notes TEXT,
      next_match_id TEXT,
      wildcard_match_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_participants (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id),
      placeholder_text TEXT,
      participant_order INTEGER NOT NULL,
      is_winner INTEGER NOT NULL DEFAULT 0,
      score INTEGER DEFAULT 0,
      advancement_source TEXT,
      source_match_id TEXT
    );

    CREATE TABLE IF NOT EXISTS advancement_links (
      id TEXT PRIMARY KEY,
      source_match_id TEXT NOT NULL REFERENCES matches(id),
      target_match_id TEXT NOT NULL REFERENCES matches(id),
      link_type TEXT NOT NULL,
      target_participant_slot INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournament_settings (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL UNIQUE REFERENCES categories(id),
      wildcard_single_team_rule TEXT NOT NULL DEFAULT 'MANUAL',
      auto_progress_stages INTEGER NOT NULL DEFAULT 0,
      allow_manual_pairings INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS race_schedule (
      id TEXT PRIMARY KEY,
      team_id TEXT REFERENCES teams(id),
      team_name TEXT NOT NULL,
      robot_name TEXT,
      organization TEXT,
      logo_url TEXT,
      slot_number INTEGER NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      track TEXT DEFAULT 'Track 1',
      time_recorded TEXT,
      score REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration: Ensure 'lives' and 'logo_url' columns exist on teams table
  try {
    const teamCols = db.pragma('table_info(teams)') as { name: string }[];
    if (!teamCols.some(c => c.name === 'lives')) {
      db.exec('ALTER TABLE teams ADD COLUMN lives INTEGER NOT NULL DEFAULT 2');
    }
    if (!teamCols.some(c => c.name === 'logo_url')) {
      db.exec('ALTER TABLE teams ADD COLUMN logo_url TEXT');
    }

    const raceCols = db.pragma('table_info(race_schedule)') as { name: string }[];
    if (!raceCols.some(c => c.name === 'score')) {
      db.exec('ALTER TABLE race_schedule ADD COLUMN score REAL');
    }
    if (!raceCols.some(c => c.name === 'category_division')) {
      db.exec("ALTER TABLE race_schedule ADD COLUMN category_division TEXT DEFAULT 'SCHOOL'");
    }

    if (!teamCols.some(c => c.name === 'race_category')) {
      db.exec("ALTER TABLE teams ADD COLUMN race_category TEXT DEFAULT 'SCHOOL'");
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }

  // Seed Robot Race categories if not exist
  try {
    const raceCat = db.prepare("SELECT * FROM categories WHERE id = 'cat-race' OR name = 'ROBOT_RACE'").get();
    if (!raceCat) {
      db.prepare(`
        INSERT INTO categories (id, name, display_name, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'cat-race',
        'ROBOT_RACE',
        'Robot Race',
        'High-Speed Track Racing Championship. Time trials and track telemetry.',
        new Date().toISOString()
      );
    }

    const schoolCat = db.prepare("SELECT * FROM categories WHERE id = 'cat-race-school'").get();
    if (!schoolCat) {
      db.prepare(`
        INSERT INTO categories (id, name, display_name, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'cat-race-school',
        'RACE_SCHOOL',
        'Robot Race (School Category)',
        'School Level High-Speed Robot Race Competition',
        new Date().toISOString()
      );
    }

    const uniCat = db.prepare("SELECT * FROM categories WHERE id = 'cat-race-university'").get();
    if (!uniCat) {
      db.prepare(`
        INSERT INTO categories (id, name, display_name, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'cat-race-university',
        'RACE_UNIVERSITY',
        'Robot Race (University Category)',
        'University & Collegiate Level High-Speed Robot Race Competition',
        new Date().toISOString()
      );
    }
  } catch (e) {
    console.error('Seeding cat-race failed:', e);
  }

  // Seed standard categories if not exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, display_name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertCat.run(
      'cat-heavyweight',
      'HEAVYWEIGHT',
      'Heavyweight Division',
      'Maximum robot weight: 20kg. High-energy combat category.',
      new Date().toISOString()
    );

    insertCat.run(
      'cat-lightweight',
      'LIGHTWEIGHT',
      'Lightweight Division',
      'Maximum robot weight: 3kg. Fast-paced tactical combat category.',
      new Date().toISOString()
    );

    // Default settings
    const insertSettings = db.prepare(`
      INSERT INTO tournament_settings (id, category_id, wildcard_single_team_rule, auto_progress_stages, allow_manual_pairings, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertSettings.run('set-hw', 'cat-heavyweight', 'MANUAL', 0, 1, new Date().toISOString());
    insertSettings.run('set-lw', 'cat-lightweight', 'MANUAL', 0, 1, new Date().toISOString());
  }

  } catch (err) {
    console.warn('[DB Init Warning]:', err);
  }
}

// Call initDatabase on module load
initDatabase();

export default db;
