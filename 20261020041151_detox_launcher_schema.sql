/*
# Digital Detox Launcher — schema (single-tenant, no auth)

1. New Tables
- `detox_config`: single row holding the parental PIN, daily restricted-app limit (seconds), and the allowed-apps allowlist.
  - `id` int primary key (always 1, enforced)
  - `pin` text not null default '1234' (4-digit parental PIN)
  - `daily_limit_seconds` int not null default 10800 (3 hours = 10800s)
  - `allowed_apps` jsonb not null (array of app keys with unlimited access)
  - `updated_at` timestamptz default now()
- `detox_daily_usage`: one row per calendar date tracking cumulative restricted-app usage.
  - `date` date primary key
  - `used_seconds` int not null default 0
  - `updated_at` timestamptz default now()
- `detox_sessions`: log of individual app-open sessions for history/stats.
  - `id` uuid primary key
  - `app_key` text not null
  - `app_name` text not null
  - `restricted` boolean not null
  - `date` date not null
  - `duration_seconds` int not null default 0
  - `started_at` timestamptz not null default now()
  - `ended_at` timestamptz
2. Security
- RLS enabled on all three tables.
- Single-tenant no-auth app: TO anon, authenticated with USING (true) / WITH CHECK (true) because the data is intentionally shared (one device's launcher state).
3. Notes
- Midnight reset is handled by the app reading detox_daily_usage for today's date; a new date row naturally starts at 0 used_seconds.
*/

CREATE TABLE IF NOT EXISTS detox_config (
  id int PRIMARY KEY DEFAULT 1,
  pin text NOT NULL DEFAULT '1234',
  daily_limit_seconds int NOT NULL DEFAULT 10800,
  allowed_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE detox_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_config" ON detox_config;
CREATE POLICY "anon_read_config" ON detox_config FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_config" ON detox_config;
CREATE POLICY "anon_insert_config" ON detox_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_config" ON detox_config;
CREATE POLICY "anon_update_config" ON detox_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_config" ON detox_config;
CREATE POLICY "anon_delete_config" ON detox_config FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS detox_daily_usage (
  date date PRIMARY KEY,
  used_seconds int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE detox_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_usage" ON detox_daily_usage;
CREATE POLICY "anon_read_usage" ON detox_daily_usage FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_usage" ON detox_daily_usage;
CREATE POLICY "anon_insert_usage" ON detox_daily_usage FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_usage" ON detox_daily_usage;
CREATE POLICY "anon_update_usage" ON detox_daily_usage FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_usage" ON detox_daily_usage;
CREATE POLICY "anon_delete_usage" ON detox_daily_usage FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS detox_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL,
  app_name text NOT NULL,
  restricted boolean NOT NULL,
  date date NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE detox_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_sessions" ON detox_sessions;
CREATE POLICY "anon_read_sessions" ON detox_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sessions" ON detox_sessions;
CREATE POLICY "anon_insert_sessions" ON detox_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON detox_sessions;
CREATE POLICY "anon_update_sessions" ON detox_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sessions" ON detox_sessions;
CREATE POLICY "anon_delete_sessions" ON detox_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_detox_sessions_date ON detox_sessions(date);

-- Seed the single config row if absent.
INSERT INTO detox_config (id, pin, daily_limit_seconds, allowed_apps)
VALUES (1, '1234', 10800, '["whatsapp","phonepe","gpay","paytm","phone","messages","gemini"]'::jsonb)
ON CONFLICT (id) DO NOTHING;