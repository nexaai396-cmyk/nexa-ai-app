/*
# Add generated-modules virtual source tree for self-building capability

1. New Tables
- `nexa_generated_modules` stores the virtual source tree of AI-generated
  modules and components, one row per generated file/component.
- `id` unique row identifier.
- `user_id` owner, defaults to the authenticated account.
- `command` the natural-language command that produced this entry.
- `module_name` human-readable module name (e.g. "LinkedIn Auto-Posting").
- `module_key` stable snake_case key used for toggling.
- `file_path` virtual path where the generated code lives
  (e.g. `src/components/modules/LinkedInAutoPosting.tsx`).
- `code` the full generated React/TypeScript source.
- `explanation` short natural-language summary of what the module does.
- `status` lifecycle of the entry: `drafting`, `ingested`, `synced`, `error`.
- `enabled` whether the generated module is active in the app shell.
- `created_at`, `updated_at` timestamps.

2. Security
- Row level security is enabled.
- Four owner-scoped policies for authenticated users.

3. Important Notes
- This table acts as a durable "virtual source tree" because the browser
  app cannot write to its own served files. The Admin UI renders generated
  modules from this table as live React components and, when configured,
  pushes each generated file to GitHub via the Contents API.
- Secrets (Gemini key, GitHub token) are intentionally NOT stored here;
  they live in edge-function secrets and the in-browser ephemeral vault.
*/

CREATE TABLE IF NOT EXISTS nexa_generated_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  command text NOT NULL,
  module_name text NOT NULL,
  module_key text NOT NULL,
  file_path text NOT NULL,
  code text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'drafting' CHECK (status IN ('drafting','ingested','synced','error')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE nexa_generated_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view generated modules" ON nexa_generated_modules;
CREATE POLICY "Owners can view generated modules" ON nexa_generated_modules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can create generated modules" ON nexa_generated_modules;
CREATE POLICY "Owners can create generated modules" ON nexa_generated_modules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update generated modules" ON nexa_generated_modules;
CREATE POLICY "Owners can update generated modules" ON nexa_generated_modules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete generated modules" ON nexa_generated_modules;
CREATE POLICY "Owners can delete generated modules" ON nexa_generated_modules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS nexa_generated_modules_user_idx ON nexa_generated_modules(user_id, created_at DESC);