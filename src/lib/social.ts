import { supabase } from './supabase';
import { useAuth } from './auth';
import { useCallback, useEffect, useState } from 'react';

export type SocialPlatform = 'telegram' | 'twitter';

export interface TelegramCreds {
  botToken: string;
  chatId: string;
}

export interface TwitterCreds {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  label: string;
  credentials: TelegramCreds | TwitterCreds;
  connected: boolean;
  created_at: string;
  updated_at: string;
}

export function useSocialAccounts() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from('user_social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setAccounts((data ?? []) as SocialAccount[]);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = useCallback(
    async (platform: SocialPlatform, label: string, credentials: TelegramCreds | TwitterCreds) => {
      if (!userId) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('user_social_accounts')
        .upsert(
          {
            user_id: userId,
            platform,
            label,
            credentials,
            connected: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' },
        );
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [userId, load],
  );

  const disconnect = useCallback(
    async (platform: SocialPlatform) => {
      if (!userId) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('user_social_accounts')
        .update({ connected: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform', platform);
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [userId, load],
  );

  const isConnected = useCallback(
    (platform: SocialPlatform) => accounts.some((a) => a.platform === platform && a.connected),
    [accounts],
  );

  return { accounts, loaded, upsert, disconnect, isConnected, reload: load };
}
