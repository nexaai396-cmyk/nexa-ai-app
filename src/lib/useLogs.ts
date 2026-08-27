import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { SystemLog } from './types';

export function useLogs(max = 100) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load() {
      const { data } = await supabase
        .from('nexa_system_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(max);
      if (active && data) setLogs(data as SystemLog[]);
    }

    void load();

    const channel = supabase
      .channel('nexa-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'nexa_system_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as SystemLog, ...prev].slice(0, max));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, max]);

  return { logs, setLogs, userId };
}
