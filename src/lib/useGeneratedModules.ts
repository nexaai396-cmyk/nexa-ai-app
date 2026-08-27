import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { pushLog } from './logs';

export interface GeneratedModule {
  id: string;
  user_id: string;
  command: string;
  module_name: string;
  module_key: string;
  file_path: string;
  code: string;
  explanation: string;
  status: 'drafting' | 'ingested' | 'synced' | 'error';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useGeneratedModules() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [modules, setModules] = useState<GeneratedModule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('nexa_generated_modules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setModules(data as GeneratedModule[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const channel = supabase
      .channel('nexa-generated-modules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nexa_generated_modules' },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
      await supabase.from('nexa_generated_modules').update({ enabled }).eq('id', id);
      if (userId) {
        pushLog(userId, enabled ? 'success' : 'warning', 'selfbuild.toggle', `${id} ${enabled ? 'enabled' : 'disabled'}`);
      }
    },
    [userId],
  );

  const remove = useCallback(
    async (id: string) => {
      setModules((prev) => prev.filter((m) => m.id !== id));
      await supabase.from('nexa_generated_modules').delete().eq('id', id);
    },
    [],
  );

  return { modules, loading, reload: load, toggle, remove };
}
