# 🤖 Robot Games Tournament Management System

A standalone, full-stack tournament management and public spectator portal built specifically for university combat robotics competitions.

Designed exclusively around the custom **Robot Games Flow**:
```
ROUND 1 (1v1 battles + odd-count BYE)
   │
   ├──────── Winners ──────────────────────────┐
   │                                           │
   └──── Losers                                │
           ↓                                   │
       WILDCARD (3-way & 2-way battles)        │
           ↓                                   │
     Wildcard Winners                          │
           └───────────────────────────────────┤
                                               ↓
                                          RE-ENTRY (Play-in normalization)
                                               ↓
                                         MAIN KNOCKOUTS (Quarterfinals)
                                               ↓
                                           SEMIFINALS
                                               ↓
                                            FINALS
                                               ↓
                                        DIVISION CHAMPION
```

---

## 🚀 Key Features

### 1. Dual Independent Categories
- **Heavyweight Division (20kg)** & **Lightweight Division (3kg)**
- Completely isolated rosters, matches, wildcard groups, brackets, and champions.
- Instant, seamless public division switcher `[ HEAVYWEIGHT ]` `[ LIGHTWEIGHT ]`.

### 2. Custom Robot Games Tournament Engine
- **Round 1 with Odd-Count BYEs**: Handles any participant count (e.g. 15 teams -> 7 matches + 1 BYE). The BYE team advances automatically to the winner path without combat. Supports random assignment or manual admin override.
- **Fair-Play Wildcard Grouping**:
  - Primarily groups of 3 with 1 winner returning to the main tournament.
  - If remainder is 2: exactly one 2-team battle (e.g., 8 teams -> `[3, 3, 2]`; 11 teams -> `[3, 3, 3, 2]`).
  - If remainder is 1: **NEVER** creates a `3 + 1` free victory! Rebalances the last four into `2 + 2` (e.g., 7 teams -> `[3, 2, 2]`; 10 teams -> `[3, 3, 2, 2]`; 4 teams -> `[2, 2]`).
  - Single-team special case: Prompts admin resolution (configurable: eliminate vs. award BYE).
- **Dynamic Re-Entry / Play-In Normalization**:
  - Normalizes combined Main winners and Wildcard winners to the nearest power-of-two bracket ($16, 8, 4, 2$).
  - Wildcard winners are paired into re-entry matches first against Main winners. Direct pass teams bypass re-entry straight into Quarterfinals/Semifinals.

### 3. Public Spectator Portal (Zero Login Required)
- **Home Dashboard (`/`)**: Current stage banner, LIVE combat spotlight with real-time pulsing indicator, Up Next on-deck card, visual stage progression stepper, and quick statistics.
- **Graphical Bracket (`/bracket`)**:
  - **Desktop**: Horizontal tournament flowchart with cards and distinct connector paths (Solid Blue for Winner Main Path, Dashed Amber for Round 1 Loser to Wildcard, Purple for BYE passes).
  - **Mobile Responsive**: Stage-based tab selector (`Round 1`, `Wildcard`, `Re-entry`, `Quarter`, `Semi`, `Final`) with touch-friendly navigation buttons and zero horizontal overflow.
  - **Interactive Match Modal**: Tap any match to view combatant details, scores, lineage (previous matches), and next stage destinations.
- **Match Schedule & Logs (`/matches`)**: Filterable by `Live Now`, `Up Next`, `Upcoming`, and `Completed`.
- **Competitor Roster (`/teams`)**: Full team listing with organizations and real-time status badges (`ACTIVE`, `WILDCARD`, `FINALIST`, `CHAMPION`, `ELIMINATED`).
- **Celebration Screen**: Grand finals champion announcement with celebratory particle effect.

### 4. Organizer Admin Console
- Unlinked private route protected by a bcrypt-backed event passkey and session JWT cookie.
- **Team Management**: Add, edit, delete (with cascade protection), and withdraw toggle.
- **Round 1 Generation**: Interactive preview of proposed pairings and manual BYE override before database persistence.
- **Wildcard Console**: Review pool of Round 1 losers, verify calculated groups, and confirm generation.
- **Live Match Controller**: Mark matches as LIVE in the arena, record scores, and declare single winners.
- **Winner Correction System**: Detects downstream affected matches and warns organizers if completed downstream matches will be reset before applying changes.
- **Tournament Settings & Maintenance**: Configure single-team wildcard rules, seed realistic demo teams, or perform a clean category reset.

---

## 🛠️ Technology Stack & Architecture

- **Framework**: Next.js 16 (App Router, Server External Packages)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens (Dark Theme, Glassmorphism)
- **Local Database**: SQLite with `better-sqlite3` in WAL mode (atomic transactions, foreign keys enabled)
- **Production / Cloud Database**: Supabase / PostgreSQL ready (`supabase/schema.sql` included with Realtime publications)
- **Authentication**: JWT via `jose` with `httpOnly`, `SameSite=lax` secure cookies & `bcryptjs` password hashing

---

## 📁 Project Structure

```
├── data/
│   └── robot_games.db          # Authoritative local SQLite database (WAL mode)
├── scripts/
│   ├── test-engine.ts           # Pure algorithm verification test suite
│   └── test-database-lifecycle.ts # Database lifecycle & cascade test suite
├── src/
│   ├── app/
│   │   ├── api/                 # REST & Polling API endpoints
│   │   │   ├── admin/           # Protected admin APIs (teams, matches, stages, wildcard)
│   │   │   ├── auth/            # Admin login, logout, session check
│   │   │   └── public/          # Public read-only endpoints (tournament-state, match details)
│   │   ├── control-7v9k2m4q/   # Private organizer administration console
│   │   │   ├── bracket/         # Round 1 generator & progression
│   │   │   ├── matches/         # Live arena match control & winner correction
│   │   │   ├── teams/           # Team registration and withdrawal
│   │   │   ├── wildcard/        # Dedicated Wildcard second-chance manager
│   │   │   ├── settings/        # Rules & database maintenance
│   │   │   └── login/           # Admin authentication page
│   │   ├── bracket/             # Public graphical tournament bracket
│   │   ├── matches/             # Public match schedule and logs
│   │   ├── teams/               # Public competitor roster
│   │   ├── globals.css          # Design system tokens and styling
│   │   ├── layout.tsx           # Main application shell with Navbar and Footer
│   │   └── page.tsx             # Public landing dashboard
│   ├── components/              # Shared UI components
│   │   ├── ChampionBanner.tsx   # Celebratory champion announcement
│   │   ├── Footer.tsx           # Public footer
│   │   ├── GraphicalBracket.tsx # Desktop & mobile graphical bracket
│   │   ├── MatchCard.tsx        # Scalable 2/3-player match card
│   │   ├── MatchDetailModal.tsx # Match inspection dialog
│   │   ├── Navbar.tsx           # Navigation bar with category switcher
│   │   └── TournamentProgressStepper.tsx # Stage progress tracker
│   ├── context/
│   │   └── TournamentContext.tsx# Real-time state provider & polling client
│   └── lib/
│       ├── auth.ts              # Session validation & token helpers
│       ├── db.ts                # Database connection & table initializers
│       ├── repository.ts        # Relational data access & transaction engine
│       ├── tournament-engine.ts # Pure tournament logic algorithms
│       └── types.ts             # TypeScript domain types
└── supabase/
    └── schema.sql               # Ready-to-deploy PostgreSQL / Supabase schema
```

---

## 🏃 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Algorithm & Database Verification Tests
```bash
npx tsx scripts/test-engine.ts
npx tsx scripts/test-database-lifecycle.ts
```

### 3. Start Development Server
```bash
npm run dev -- -p 3001
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

---

## 🔐 Organizer Access

Configure `ADMIN_PASSKEY_HASH` and `ADMIN_JWT_SECRET` in `.env.local`. The private route and passkey should be shared with authorized event staff only and must not be committed to source control.

---

## ☁️ Deployment Instructions

### Option A: Node.js / Docker / VPS Deployment
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```
   The persistent SQLite database is preserved in the `./data/` folder.

### Option B: Deploying with Supabase & Vercel
1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the provided SQL script:
   [`supabase/schema.sql`](file:///home/klsdfernando/Documents/Robot%20Race%20Dashboard/supabase/schema.sql)
3. Set the following environment variables in Vercel or your hosting provider:
   ```env
   ADMIN_JWT_SECRET="your-secure-random-secret-key-at-least-32-chars"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```
4. Deploy using standard Next.js deployment.

---

## 🧪 Verified Test Scenarios

The engine includes automated test coverage for all participant sizes:
`2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 16, 17, 20`

- ✅ **Odd Round 1 counts**: Automatic single BYE without fake opponents.
- ✅ **Divisible by 3 Wildcards**: Clean 3-way matches (`[3, 3, 3]`).
- ✅ **Remainder 2 Wildcards**: Single 2-way match fallback (`[3, 3, 2]`).
- ✅ **Remainder 1 Wildcards**: Rebalanced `2 + 2` to prevent single-team free victories (`[3, 2, 2]`).
- ✅ **Re-Entry play-ins**: Normalizes pools (e.g. 8 Main + 3 Wildcard = 11 teams -> 3 play-in matches -> 8 teams).
- ✅ **Winner Correction**: Cascading reset warning modal preventing corrupt bracket states.
