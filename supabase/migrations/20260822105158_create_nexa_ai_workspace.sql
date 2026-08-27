/*
# Create Nexa AI workspace data

1. New Tables
- `nexa_workspaces` stores each signed-in owner's editable brand identity, theme, and metadata.
- `id` unique workspace identifier.
- `user_id` owner reference, automatically filled from the signed-in account.
- `app_name`, `logo_url`, `primary_color`, `secondary_color`, and `site_description` store non-secret rebranding settings.
- `nexa_modules` stores enabled feature modules and their workflow configuration.
- `key`, `label`, `description`, `enabled`, and `settings` describe a module.
- `nexa_system_logs` stores durable execution events for the live console.
- `level`, `event`, `message`, `metadata`, and `created_at` describe each log entry.

2. Security
- Row level security is enabled on all three tables.
- Four owner-scoped policies are added per table for authenticated users.
- API keys and webhook secrets are intentionally not stored in these browser-readable tables.

3. Important Notes
- Each account receives one workspace through a unique user_id constraint.
- Defaults make the first signed-in render usable without an onboarding mutation.
*/

CREATE TABLE IF NOT EXISTS nexa_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name text NOT NULL DEFAULT 'Nexa AI',
  logo_url text NOT NULL DEFAULT '/image.png',
  primary_color text NOT NULL DEFAULT '#FF2A85',
  secondary_color text NOT NULL DEFAULT '#00C2FF',
  site_description text NOT NULL DEFAULT 'Autonomous content operations for the modern web.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexa_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS nexa_system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
  event text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nexa_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexa_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexa_system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view workspaces" ON nexa_workspaces;
CREATE POLICY "Owners can view workspaces" ON nexa_workspaces FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can create workspaces" ON nexa_workspaces;
CREATE POLICY "Owners can create workspaces" ON nexa_workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can update workspaces" ON nexa_workspaces;
CREATE POLICY "Owners can update workspaces" ON nexa_workspaces FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can delete workspaces" ON nexa_workspaces;
CREATE POLICY "Owners can delete workspaces" ON nexa_workspaces FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view modules" ON nexa_modules;
CREATE POLICY "Owners can view modules" ON nexa_modules FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can create modules" ON nexa_modules;
CREATE POLICY "Owners can create modules" ON nexa_modules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can update modules" ON nexa_modules;
CREATE POLICY "Owners can update modules" ON nexa_modules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can delete modules" ON nexa_modules;
CREATE POLICY "Owners can delete modules" ON nexa_modules FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view logs" ON nexa_system_logs;
CREATE POLICY "Owners can view logs" ON nexa_system_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can create logs" ON nexa_system_logs;
CREATE POLICY "Owners can create logs" ON nexa_system_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can update logs" ON nexa_system_logs;
CREATE POLICY "Owners can update logs" ON nexa_system_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can delete logs" ON nexa_system_logs;
CREATE POLICY "Owners can delete logs" ON nexa_system_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS nexa_system_logs_user_created_idx ON nexa_system_logs(user_id, created_at DESC);