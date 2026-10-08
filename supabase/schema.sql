-- ==============================================================================
-- Robot Games Tournament & Robot Race - Supabase / PostgreSQL Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'HEAVYWEIGHT', 'LIGHTWEIGHT', 'RACE_SCHOOL', 'RACE_UNIVERSITY'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Categories (Combat & Race)
INSERT INTO public.categories (id, name, display_name, description)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'HEAVYWEIGHT', 'Heavyweight Division', '20kg combat robots with active kinetic weapons'),
    ('c0000000-0000-0000-0000-000000000002', 'LIGHTWEIGHT', 'Lightweight Division', '3kg combat robots and autonomous rovers'),
    ('c0000000-0000-0000-0000-000000000003', 'RACE_SCHOOL', 'School Category', 'Robot Race tournament division for high school competitors'),
    ('c0000000-0000-0000-0000-000000000004', 'RACE_UNIVERSITY', 'University Category', 'Robot Race tournament division for collegiate / university competitors')
ON CONFLICT (name) DO UPDATE 
SET display_name = EXCLUDED.display_name, description = EXCLUDED.description;

-- 2. TEAMS TABLE (Stores both Combat and Race teams)

CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    robot_name VARCHAR(100),
    organization VARCHAR(150),
    seed INT,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'WILDCARD', 'ELIMINATED', 'FINALIST', 'CHAMPION'
    lives INT DEFAULT 2 NOT NULL,
    is_withdrawn BOOLEAN DEFAULT FALSE NOT NULL,
    logo_url TEXT,                                -- Direct image URL or Google Drive display URL
    race_category VARCHAR(30) DEFAULT 'SCHOOL',   -- 'SCHOOL' or 'UNIVERSITY' (for race teams)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration if teams table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='logo_url') THEN
        ALTER TABLE public.teams ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='race_category') THEN
        ALTER TABLE public.teams ADD COLUMN race_category VARCHAR(30) DEFAULT 'SCHOOL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='lives') THEN
        ALTER TABLE public.teams ADD COLUMN lives INT DEFAULT 2 NOT NULL;
    END IF;
END $$;

-- 3. ROBOT RACE SCHEDULE & LEADERBOARD TABLE
CREATE TABLE IF NOT EXISTS public.race_schedule (
    id TEXT PRIMARY KEY,
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    team_name VARCHAR(100) NOT NULL,
    robot_name VARCHAR(100),
    organization VARCHAR(150),
    logo_url TEXT,
    category_division VARCHAR(30) DEFAULT 'SCHOOL' NOT NULL, -- 'SCHOOL' or 'UNIVERSITY'
    slot_number INT NOT NULL,
    scheduled_time VARCHAR(50),
    status VARCHAR(30) DEFAULT 'SCHEDULED' NOT NULL,        -- 'SCHEDULED', 'READY', 'RUNNING', 'COMPLETED', 'DISQUALIFIED'
    track VARCHAR(50) DEFAULT 'Track 1',
    time_recorded VARCHAR(50),
    score INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMBAT TOURNAMENT STAGES TABLE
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    stage_type VARCHAR(50) NOT NULL, -- 'REGISTRATION', 'ROUND_1', 'WILDCARD', 'RE_ENTRY', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'COMPLETED'
    stage_order INT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'ACTIVE', 'COMPLETED'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 5. COMBAT MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
    stage_type VARCHAR(50) NOT NULL,
    match_number INT NOT NULL,
    round_order INT DEFAULT 1 NOT NULL,
    status VARCHAR(30) DEFAULT 'SCHEDULED' NOT NULL, -- 'SCHEDULED', 'LIVE', 'COMPLETED', 'BYE'
    winner_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    wildcard_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MATCH PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    placeholder_text VARCHAR(100),
    participant_order INT NOT NULL,
    is_winner BOOLEAN DEFAULT FALSE NOT NULL,
    score INT DEFAULT 0,
    advancement_source VARCHAR(100),
    source_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL
);

-- 7. ADVANCEMENT LINKS (Lineage & Bracket Connectivity)
CREATE TABLE IF NOT EXISTS public.advancement_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    target_match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL,
    target_participant_slot INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TOURNAMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.tournament_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
    wildcard_single_team_rule VARCHAR(30) DEFAULT 'MANUAL' NOT NULL,
    auto_progress_stages BOOLEAN DEFAULT FALSE NOT NULL,
    allow_manual_pairings BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancement_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tournament data (needed for spectator dashboard)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
    CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view teams" ON public.teams;
    CREATE POLICY "Public can view teams" ON public.teams FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view race_schedule" ON public.race_schedule;
    CREATE POLICY "Public can view race_schedule" ON public.race_schedule FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view stages" ON public.stages;
    CREATE POLICY "Public can view stages" ON public.stages FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view matches" ON public.matches;
    CREATE POLICY "Public can view matches" ON public.matches FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view match_participants" ON public.match_participants;
    CREATE POLICY "Public can view match_participants" ON public.match_participants FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public can view tournament_settings" ON public.tournament_settings;
    CREATE POLICY "Public can view tournament_settings" ON public.tournament_settings FOR SELECT USING (true);

    -- Service role / authenticated write policies
    DROP POLICY IF EXISTS "Full access for authenticated or service role to teams" ON public.teams;
    CREATE POLICY "Full access for authenticated or service role to teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access for authenticated or service role to race_schedule" ON public.race_schedule;
    CREATE POLICY "Full access for authenticated or service role to race_schedule" ON public.race_schedule FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access for authenticated or service role to matches" ON public.matches;
    CREATE POLICY "Full access for authenticated or service role to matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- REALTIME PUBLICATIONS
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.race_schedule;
EXCEPTION WHEN OTHERS THEN
    -- If already added or publication doesn't exist yet, ignore error
    NULL;
END $$;
