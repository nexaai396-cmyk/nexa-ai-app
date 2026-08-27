import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGeneratedModules, type GeneratedModule } from '@/lib/useGeneratedModules';
import { pushLog } from '@/lib/logs';
import { useAuth } from '@/lib/auth';
import {
  Package,
  Power,
  Trash2,
  Eye,
  Code2,
  Loader2,
  GitBranch,
  FileCode,
} from 'lucide-react';

export default function GeneratedModulesPanel() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { modules, loading, toggle, remove } = useGeneratedModules();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewing, setViewing] = useState<GeneratedModule | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function resync(mod: GeneratedModule) {
    setSyncing(mod.id);
    const { data: settingsRow } = await supabase
      .from('nexa_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'secrets')
      .maybeSingle();
    const secrets = (settingsRow?.value ?? {}) as { githubToken?: string; githubRepo?: string; githubBranch?: string };
    if (!secrets.githubToken || !secrets.githubRepo) {
      pushLog(userId, 'error', 'github.resync', 'GitHub not configured — add token + repo in API Keys');
      setSyncing(null);
      return;
    }
    const [owner, repo] = secrets.githubRepo.split('/');
    const branch = secrets.githubBranch ?? 'main';
    try {
      const shaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${mod.file_path}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${secrets.githubToken}`, Accept: 'application/vnd.github+json' },
      });
      const sha = shaRes.ok ? ((await shaRes.json()) as { sha?: string }).sha ?? null : null;
      const contentBytes = btoa(unescape(encodeURIComponent(mod.code)));
      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${mod.file_path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${secrets.githubToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `feat(nexa): re-sync ${mod.module_name} [auto]`,
          content: contentBytes,
          branch,
          ...(sha ? { sha } : {}),
        }),
      });
      if (putRes.ok) {
        await supabase.from('nexa_generated_modules').update({ status: 'synced', updated_at: new Date().toISOString() }).eq('id', mod.id);
        pushLog(userId, 'success', 'github.sync', `Re-synced ${mod.file_path} to GitHub`);
      } else {
        const t = await putRes.text();
        pushLog(userId, 'error', 'github.sync', `GitHub sync failed: ${putRes.status} ${t.slice(0, 160)}`);
      }
    } catch (e) {
      pushLog(userId, 'error', 'github.sync', `Sync error: ${(e as Error).message}`);
    }
    setSyncing(null);
  }

  if (loading) {
    return (
      <div className="glass p-6 flex items-center gap-2 text-ink-300 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading generated modules…
      </div>
    );
  }

  return (
    <div className="glass p-6 animate-fade-up space-y-4">
      <PanelHeader
        icon={<Package className="w-4 h-4" />}
        title="Generated Modules (Virtual Source Tree)"
        subtitle="AI-generated modules ingested by the self-build loop. Toggle to mount them in the app shell."
      />

      {modules.length === 0 ? (
        <div className="text-center py-10 text-ink-300 text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 text-ink-400" />
          No generated modules yet. Use the AI Training terminal to build one.
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => (
            <div key={m.id} className="gradient-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{m.module_name}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-ink-300 mt-0.5">{m.explanation}</p>
                  <p className="text-[11px] text-ink-400 font-mono mt-1 flex items-center gap-1">
                    <FileCode className="w-3 h-3" /> {m.file_path}
                  </p>
                </div>
                <button
                  onClick={() => toggle(m.id, !m.enabled)}
                  className={`relative w-11 h-6 rounded-full p-0.5 transition shrink-0 ${m.enabled ? 'bg-brand-gradient' : 'bg-ink-600'}`}
                  title={m.enabled ? 'Disable' : 'Enable'}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <p className="text-[11px] text-ink-400 mt-2 italic">"{m.command}"</p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setViewing(viewing?.id === m.id ? null : m)}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-ink-800/60 border border-white/5 hover:border-white/10 text-ink-200 flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> {viewing?.id === m.id ? 'Hide code' : 'View code'}
                </button>
                <button
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-ink-800/60 border border-white/5 hover:border-white/10 text-ink-200 flex items-center gap-1.5 transition"
                >
                  <Code2 className="w-3.5 h-3.5" /> {expanded === m.id ? 'Hide tree' : 'Show tree'}
                </button>
                <button
                  onClick={() => resync(m)}
                  disabled={syncing === m.id}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-ink-800/60 border border-white/5 hover:border-white/10 text-ink-200 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {syncing === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />} Sync to GitHub
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-ink-800/60 border border-white/5 hover:border-error/30 hover:text-error text-ink-300 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <span className={`flex items-center gap-1 text-[11px] ml-auto ${m.enabled ? 'text-success' : 'text-ink-400'}`}>
                  <Power className="w-3 h-3" /> {m.enabled ? 'Mounted' : 'Unmounted'}
                </span>
              </div>

              {viewing?.id === m.id && (
                <pre className="mt-3 rounded-lg bg-ink-900/80 border border-white/5 p-3 text-xs font-mono text-ink-100 overflow-x-auto max-h-80 animate-fade-up">
                  <code>{m.code}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: GeneratedModule['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    drafting: { label: 'drafting', cls: 'text-ink-300 bg-ink-700/60' },
    ingested: { label: 'ingested', cls: 'text-brand-cyan bg-brand-cyan/10' },
    synced: { label: 'synced', cls: 'text-success bg-success/10' },
    error: { label: 'error', cls: 'text-error bg-error/10' },
  };
  const s = map[status] ?? map.drafting;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${s.cls}`}>{s.label}</span>;
}

function PanelHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center text-brand-cyan shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-ink-300 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
