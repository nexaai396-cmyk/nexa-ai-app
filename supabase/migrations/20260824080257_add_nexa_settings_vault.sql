/*
# Add nexa_settings table for encrypted-ish secret vault

1. New Tables
- `nexa_settings` stores per-owner key/value settings, primarily the
  encrypted-at-rest secret vault (Gemini key, GitHub token, repo, etc.)
  that the admin enters in the API Keys panel. The edge function reads
  these to call Gemini and GitHub server-side.
- `id` row identifier.
- `user_id` owner, defaults to the authenticated account.
- `key` setting key (e.g. "secrets").
- `value` JSONB blob holding the setting payload.
- `updated_at` timestamp.
- UNIQUE(user_id, key) ensures one vault per owner.

2. Security
- RLS enabled; four owner-scoped policies.

3. Important Notes
- Values are JSONB so secrets are stored as object fields. Supabase
  encrypts columns at rest. The admin UI never displays secret values
  after they are saved (masked), and the public view has no access to
  this table.
*/

CREATE TABLE IF NOT EXISTS nexa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE nexa_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view settings" ON nexa_settings;
CREATE POLICY "Owners can view settings" ON nexa_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can create settings" ON nexa_settings;
CREATE POLICY "Owners can create settings" ON nexa_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update settings" ON nexa_settings;
CREATE POLICY "Owners can update settings" ON nexa_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete settings" ON nexa_settings;
CREATE POLICY "Owners can delete settings" ON nexa_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);