import { supabase } from './supabase';
import { useAuth } from './auth';
import { useCallback, useEffect, useState } from 'react';

export interface SecretsVault {
  geminiKey: string;
  openaiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  makeWebhook: string;
  n8nWebhook: string;
  githubToken: string;
  githubRepo: string; // "owner/repo"
  githubBranch: string;
}

export const EMPTY_VAULT: SecretsVault = {
  geminiKey: '',
  openaiKey: '',
  supabaseUrl: '',
  supabaseKey: '',
  makeWebhook: '',
  n8nWebhook: '',
  githubToken: '',
  githubRepo: '',
  githubBranch: 'main',
};

/**
 * Loads the secret vault from nexa_settings. The stored object only contains
 * keys that were actually filled in, so we merge over EMPTY_VAULT.
 */
export function useSecretsVault() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [vault, setVault] = useState<SecretsVault>(EMPTY_VAULT);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('nexa_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'secrets')
      .maybeSingle();
    if (data?.value) {
      setVault({ ...EMPTY_VAULT, ...(data.value as Partial<SecretsVault>) });
    }
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next: SecretsVault): Promise<{ error: string | null }> => {
      if (!userId) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('nexa_settings')
        .upsert({ user_id: userId, key: 'secrets', value: next, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('key', 'secrets');
      if (error) return { error: error.message };
      setVault(next);
      return { error: null };
    },
    [userId],
  );

  return { vault, save, loaded, reload: load };
}
