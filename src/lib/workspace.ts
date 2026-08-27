import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Workspace } from './types';
import { DEFAULT_MODULES } from './constants';

const FALLBACK: Workspace = {
  id: 'preview',
  user_id: 'preview',
  app_name: 'Nexa AI',
  logo_url: '/image.png',
  primary_color: '#FF2A85',
  secondary_color: '#00C2FF',
  site_description: 'Autonomous content operations for the modern web.',
  updated_at: new Date().toISOString(),
};

export function useWorkspace() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [workspace, setWorkspace] = useState<Workspace>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) {
        setWorkspace(FALLBACK);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('nexa_workspaces')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setWorkspace(FALLBACK);
        setLoading(false);
        return;
      }
      setWorkspace(data as Workspace);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { workspace, setWorkspace, loading, userId };
}

export function useModules() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [modules, setModules] = useState(DEFAULT_MODULES.map((m) => ({ ...m, id: '', user_id: '' })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) {
        setModules(DEFAULT_MODULES.map((m) => ({ ...m, id: '', user_id: '' })));
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('nexa_modules').select('*').eq('user_id', userId);
      if (!active) return;
      if (data && data.length > 0) {
        setModules(data as typeof modules);
      } else {
        const inserts = DEFAULT_MODULES.map((m) => ({ ...m, user_id: userId }));
        const { data: created } = await supabase.from('nexa_modules').insert(inserts).select('*');
        if (created && active) setModules(created as typeof modules);
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { modules, setModules, loading, userId };
}
