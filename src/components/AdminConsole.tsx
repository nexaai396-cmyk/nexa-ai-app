import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { pushLog } from '@/lib/logs';
import { useWorkspace, useModules } from '@/lib/workspace';
import { useSecretsVault, type SecretsVault } from '@/lib/secrets';
import { useGeneratedModules } from '@/lib/useGeneratedModules';
import { commitFileToGitHub } from '@/lib/github';
import { useToast } from '@/components/Toast';
import LiveLogs from './LiveLogs';
import TrainingPanel from './TrainingPanel';
import GeneratedModulesPanel from './GeneratedModulesPanel';
import SelfBuildBanner, { type BannerState } from './SelfBuildBanner';
import {
  Palette,
  TerminalSquare,
  LayoutGrid,
  KeyRound,
  ScrollText,
  Save,
  Loader2,
  Plus,
  Check,
  Power,
  Package,
  Github,
  Eye,
  EyeOff,
  Rocket,
  ExternalLink,
} from 'lucide-react';

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition';

type Tab = 'rebrand' | 'training' | 'modules' | 'generated' | 'keys' | 'logs';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'rebrand', label: 'Rebranding', icon: <Palette className="w-4 h-4" /> },
  { id: 'training', label: 'AI Training', icon: <TerminalSquare className="w-4 h-4" /> },
  { id: 'modules', label: 'Modules', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'generated', label: 'Generated', icon: <Package className="w-4 h-4" /> },
  { id: 'keys', label: 'API Keys', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'logs', label: 'Live Logs', icon: <ScrollText className="w-4 h-4" /> },
];

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>('training');
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { modules: generatedModules, reload: reloadGenerated } = useGeneratedModules();
  const [banner, setBanner] = useState<BannerState>({ visible: false, message: '' });

  // Show the success banner whenever a new generated module appears.
  useEffect(() => {
    if (generatedModules.length > 0 && banner.visible === false) {
      // Only auto-banner on new ingest; handled by TrainingPanel via onBuilt callback instead.
    }
  }, [generatedModules, banner.visible]);

  function handleBuilt(message: string) {
    setBanner({ visible: true, message });
    void reloadGenerated();
    void pushLog(userId, 'success', 'selfbuild.banner', message);
    window.setTimeout(() => setBanner((b) => (b.visible ? { ...b, visible: false } : b)), 8000);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pt-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          <span className="brand-text">Admin Command Center</span>
        </h2>
        <p className="text-ink-300 text-sm mt-1">Rebrand, train, self-build, manage modules, and monitor live activity.</p>
      </div>

      <SelfBuildBanner banner={banner} onDismiss={() => setBanner({ visible: false, message: '' })} />

      <div className="flex flex-wrap gap-2 p-1.5 glass-subtle">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-gradient text-ink-900' : 'text-ink-300 hover:text-ink-100 hover:bg-white/5'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'generated' && generatedModules.length > 0 && (
              <span className="text-[10px] bg-ink-900/70 text-brand-cyan rounded-full px-1.5 py-0.5 font-mono">{generatedModules.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'rebrand' && <RebrandPanel />}
      {tab === 'training' && <TrainingPanel onBuilt={handleBuilt} />}
      {tab === 'modules' && <ModulesPanel />}
      {tab === 'generated' && <GeneratedModulesPanel />}
      {tab === 'keys' && <KeysPanel />}
      {tab === 'logs' && <LiveLogs height="h-[28rem]" />}
    </div>
  );
}

function RebrandPanel() {
  const { workspace, setWorkspace, userId } = useWorkspace();
  const [form, setForm] = useState(workspace);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(workspace), [workspace]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('nexa_workspaces')
      .upsert({
        user_id: userId,
        app_name: form.app_name,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        site_description: form.site_description,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();

    setSaving(false);
    if (!error) {
      const fresh = { ...form, updated_at: new Date().toISOString() };
      setWorkspace(fresh);
      setSaved(true);
      pushLog(userId, 'success', 'rebrand.update', `Branding updated — app name "${form.app_name}"`);
      setTimeout(() => setSaved(false), 2200);
    } else {
      pushLog(userId, 'error', 'rebrand.update', 'Failed to save branding', { error: error.message });
    }
  }

  return (
    <div className="glass p-6 animate-fade-up space-y-5">
      <PanelHeader icon={<Palette className="w-4 h-4" />} title="System Rebranding Engine" subtitle="Update identity, theme, and metadata instantly." />

      <div className="grid md:grid-cols-2 gap-4">
        <Labeled label="App Name">
          <input className={inputCls} value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
        </Labeled>
        <Labeled label="Logo URL">
          <input className={inputCls} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
        </Labeled>
        <Labeled label="Primary Color">
          <div className="flex gap-2">
            <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-10 rounded-lg bg-ink-800 border border-white/5" />
            <input className={inputCls} value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
          </div>
        </Labeled>
        <Labeled label="Secondary Color">
          <div className="flex gap-2">
            <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-12 h-10 rounded-lg bg-ink-800 border border-white/5" />
            <input className={inputCls} value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
          </div>
        </Labeled>
        <Labeled label="Site Metadata / Description" full>
          <textarea rows={3} className={inputCls} value={form.site_description} onChange={(e) => setForm({ ...form, site_description: e.target.value })} />
        </Labeled>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Branding
        </button>
        {saved && <span className="text-sm text-success flex items-center gap-1"><Check className="w-4 h-4" /> Applied across the app</span>}
      </div>
    </div>
  );
}

function ModulesPanel() {
  const { modules, setModules, userId } = useModules();
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(id: string, key: string, enabled: boolean) {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
    if (!userId) return;
    setSaving(key);
    await supabase.from('nexa_modules').update({ enabled }).eq('id', id);
    pushLog(userId, enabled ? 'success' : 'warning', 'module.toggle', `${key} ${enabled ? 'enabled' : 'disabled'}`);
    setSaving(null);
  }

  return (
    <div className="glass p-6 animate-fade-up space-y-4">
      <PanelHeader icon={<LayoutGrid className="w-4 h-4" />} title="Feature Builder & Module Manager" subtitle="Enable, disable, and inspect active Nexa modules." />
      <div className="grid sm:grid-cols-2 gap-3">
        {modules.map((m) => (
          <div key={m.id || m.key} className="gradient-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{m.label}</p>
                <p className="text-xs text-ink-300 mt-0.5">{m.description}</p>
              </div>
              <button
                onClick={() => toggle(m.id, m.key, !m.enabled)}
                className={`relative w-11 h-6 rounded-full p-0.5 transition shrink-0 ${m.enabled ? 'bg-brand-gradient' : 'bg-ink-600'}`}
                title={m.enabled ? 'Disable' : 'Enable'}
              >
                {saving === m.key ? (
                  <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-white" />
                ) : (
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-5' : ''}`} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`flex items-center gap-1 ${m.enabled ? 'text-success' : 'text-ink-400'}`}>
                <Power className="w-3 h-3" /> {m.enabled ? 'Active' : 'Disabled'}
              </span>
              <span className="text-ink-400 font-mono">{m.key}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeysPanel() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { vault, save, loaded } = useSecretsVault();
  const { notify } = useToast();
  const [form, setForm] = useState<SecretsVault>(vault);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; url?: string; error?: string } | null>(null);

  async function testCommit() {
    setTestBusy(true);
    setTestResult(null);
    const content = `# Nexa AI Test Commit

This file was generated by the Nexa AI Admin Dashboard test-commit button at ${new Date().toISOString()}.
It verifies that the GitHub Contents API integration is working correctly.
`;
    const result = await commitFileToGitHub('test-commit.md', content, 'test: Nexa AI dashboard test commit', form);
    setTestBusy(false);
    setTestResult(result);
    if (result.ok) {
      notify('success', 'Test commit pushed to GitHub successfully.');
      pushLog(userId, 'success', 'github.test', 'Test commit pushed to GitHub', { url: result.commitUrl });
    } else {
      notify('error', `GitHub test commit failed: ${result.error ?? 'unknown error'}`);
      pushLog(userId, 'error', 'github.test', 'Test commit failed', { error: result.error });
    }
  }

  useEffect(() => {
    if (loaded) setForm(vault);
  }, [vault, loaded]);

  async function saveAll() {
    setBusy(true);
    const { error } = await save(form);
    setBusy(false);
    if (!error) {
      setSaved(true);
      pushLog(userId, 'success', 'keys.update', 'API key vault updated', { keys: Object.keys(form) });
      setTimeout(() => setSaved(false), 2200);
    } else {
      pushLog(userId, 'error', 'keys.update', `Failed to save keys: ${error}`);
    }
  }

  const fields: { id: keyof SecretsVault; label: string; placeholder: string; secret?: boolean }[] = [
    { id: 'geminiKey', label: 'Gemini API Key', placeholder: 'AIza…', secret: true },
    { id: 'openaiKey', label: 'OpenAI API Key', placeholder: 'sk-…', secret: true },
    { id: 'supabaseUrl', label: 'Supabase URL', placeholder: 'https://<project>.supabase.co' },
    { id: 'supabaseKey', label: 'Supabase Service Role Key', placeholder: 'eyJ…', secret: true },
    { id: 'makeWebhook', label: 'Make.com Webhook URL', placeholder: 'https://hook.make.com/…' },
    { id: 'n8nWebhook', label: 'n8n Webhook URL', placeholder: 'https://n8n.example.com/webhook/…' },
  ];

  const githubFields: { id: keyof SecretsVault; label: string; placeholder: string; secret?: boolean }[] = [
    { id: 'githubToken', label: 'GitHub Personal Access Token', placeholder: 'ghp_…', secret: true },
    { id: 'githubRepo', label: 'Repository (owner/repo)', placeholder: 'your-name/nexa-ai' },
    { id: 'githubBranch', label: 'Branch', placeholder: 'main' },
  ];

  function fieldInput(f: { id: keyof SecretsVault; label: string; placeholder: string; secret?: boolean }) {
    const isSecret = f.secret && !reveal[f.id];
    return (
      <div className="relative">
        <input
          type={isSecret ? 'password' : 'text'}
          className={inputCls + (f.secret ? ' pr-10' : '')}
          value={form[f.id]}
          onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
          placeholder={f.placeholder}
        />
        {f.secret && (
          <button
            type="button"
            onClick={() => setReveal((r) => ({ ...r, [f.id]: !r[f.id] }))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-100 transition"
            tabIndex={-1}
          >
            {reveal[f.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6 animate-fade-up space-y-4">
        <PanelHeader icon={<KeyRound className="w-4 h-4" />} title="System & API Key Management" subtitle="Secrets are stored encrypted at rest and never shown in the public view." />
        <div className="grid md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <Labeled key={f.id} label={f.label}>
              {fieldInput(f)}
            </Labeled>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveAll} disabled={busy} className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save Credentials
          </button>
          {saved && <span className="text-sm text-success flex items-center gap-1"><Check className="w-4 h-4" /> Stored securely</span>}
        </div>
      </div>

      <div className="glass p-6 animate-fade-up space-y-4">
        <PanelHeader
          icon={<Github className="w-4 h-4" />}
          title="GitHub Sync"
          subtitle="Auto-commit self-generated modules to your repository via the GitHub Contents API."
        />
        <div className="grid md:grid-cols-3 gap-4">
          {githubFields.map((f) => (
            <Labeled key={f.id} label={f.label} full={false}>
              {fieldInput(f)}
            </Labeled>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={saveAll} disabled={busy} className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save GitHub Settings
          </button>
          <button onClick={testCommit} disabled={testBusy} className="inline-flex items-center gap-2 bg-ink-800/70 border border-brand-cyan/30 text-brand-cyan font-semibold text-sm px-4 py-2.5 rounded-lg hover:border-brand-cyan/60 transition disabled:opacity-50">
            {testBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Test Commit to GitHub
          </button>
          <span className="text-xs text-ink-300">
            {vault.githubToken && vault.githubRepo ? (
              <span className="text-success flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Connected to {vault.githubRepo}</span>
            ) : (
              'Add a token + repo to enable auto-commit on every self-build command.'
            )}
          </span>
        </div>

        {testResult && (
          <div className={`rounded-lg border px-4 py-3 text-sm animate-fade-up ${
            testResult.ok
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-error/10 border-error/20 text-error'
          }`}>
            {testResult.ok ? (
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>Test commit pushed successfully.</p>
                  {testResult.url && (
                    <a href={testResult.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-cyan hover:underline mt-1 text-xs">
                      <ExternalLink className="w-3 h-3" /> View commit on GitHub
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <span>{testResult.error}</span>
            )}
          </div>
        )}

        <p className="text-[11px] text-ink-400">
          Env defaults: owner=<span className="font-mono text-ink-300">{import.meta.env.VITE_GITHUB_OWNER || '—'}</span>,
          repo=<span className="font-mono text-ink-300">{import.meta.env.VITE_GITHUB_REPO || '—'}</span>.
          Saved vault values override the repo and branch fields.
        </p>
      </div>
    </div>
  );
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

function Labeled({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-ink-200 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
