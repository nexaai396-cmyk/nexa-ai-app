/*
# Add user_social_accounts table for social syndication

1. New Tables
- `user_social_accounts` stores per-user connected social platform
  credentials for the Social & Web 2.0 Syndication module. One row per
  platform per user.
- `id` unique row identifier.
- `user_id` owner, defaults to the authenticated account.
- `platform` the social platform: 'telegram' or 'twitter'.
- `label` a user-chosen display name for the connection (e.g. "Main Bot").
- `credentials` JSONB blob holding the platform-specific credential fields:
    Telegram: { botToken, chatId }
    Twitter:  { apiKey, apiKeySecret, accessToken, accessTokenSecret }
- `connected` whether the account is currently active for syndication.
- `created_at`, `updated_at` timestamps.
- UNIQUE(user_id, platform) ensures one active connection per platform per user.

2. Security
- Row level security is enabled.
- Four owner-scoped policies for authenticated users (select/insert/update/delete).
- Credentials are stored in a JSONB column; Supabase encrypts columns at
  rest. The public view has no access to this table.

3. Important Notes
- This table is multi-user: every signed-in user can store their own social
  account credentials, scoped by RLS to their own rows.
- The edge function (nexa-social-syndicate) reads these credentials
  server-side using the user's auth token to post messages to Telegram and
  Twitter.
*/

CREATE TABLE IF NOT EXISTS user_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('telegram', 'twitter')),
  label text NOT NULL DEFAULT '',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE user_social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view social accounts" ON user_social_accounts;
CREATE POLICY "Owners can view social accounts" ON user_social_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can create social accounts" ON user_social_accounts;
CREATE POLICY "Owners can create social accounts" ON user_social_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update social accounts" ON user_social_accounts;
CREATE POLICY "Owners can update social accounts" ON user_social_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete social accounts" ON user_social_accounts;
CREATE POLICY "Owners can delete social accounts" ON user_social_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_social_accounts_user_idx ON user_social_accounts(user_id, platform);
