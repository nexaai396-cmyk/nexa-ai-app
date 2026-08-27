import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { pushLog } from '@/lib/logs';
import { useSecretsVault } from '@/lib/secrets';
import { callSelfBuild, type SelfBuildResult } from '@/lib/selfBuild';
import { useGeneratedModules } from '@/lib/useGeneratedModules';
import {
  TerminalSquare,
  Loader2,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  GitBranch,
  FileCode,
  ChevronRight,
} from 'lucide-react';

interface Stage {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

const INITIAL_STAGES: Stage[] = [
  { label: 'Parsing Command', status: 'pending' },
  { label: 'Generating Code (Gemini)', status: 'pending' },
  { label: 'Ingesting New Module', status: 'pending' },
  { label: 'Live Reloading App', status: 'pending' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TrainingPanel({ onBuilt }: { onBuilt?: (message: string) => void }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { vault } = useSecretsVault();
  const { reload } = useGeneratedModules();

  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [history, setHistory] = useState<{ cmd: string; reply: string; ok: boolean }[]>([]);
  const [lastResult, setLastResult] = useState<SelfBuildResult | null>(null);

  function setStage(idx: number, status: Stage['status'], detail?: string) {
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, status, detail } : s)));
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || !userId || busy) return;
    const cmd = command.trim();
    setBusy(true);
    setCommand('');
    setLastResult(null);
    setStages(INITIAL_STAGES);

    // Stage 1: Parsing
    setStage(0, 'running');
    pushLog(userId, 'info', 'selfbuild.parse', `Parsing command: "${cmd}"`);
    await wait(500);
    if (!vault.geminiKey) {
      setStage(0, 'error', 'No Gemini API key — add it in API Keys');
      pushLog(userId, 'error', 'selfbuild.parse', 'Aborted: no Gemini API key configured');
      setHistory((h) => [{ cmd, reply: 'No Gemini API key configured. Add one in Admin > API Keys, then retry.', ok: false }, ...h]);
      setBusy(false);
      return;
    }
    setStage(0, 'done');

    // Stage 2: Generating code via edge function (Gemini server-side)
    setStage(1, 'running');
    pushLog(userId, 'info', 'selfbuild.generate', 'Calling Gemini via self-build edge function…');
    let result: SelfBuildResult;
    try {
      result = await callSelfBuild(cmd, userId);
    } catch (err) {
      const msg = (err as Error).message;
      setStage(1, 'error', msg);
      pushLog(userId, 'error', 'selfbuild.generate', `Code generation failed: ${msg}`);
      setHistory((h) => [{ cmd, reply: `Generation failed: ${msg}`, ok: false }, ...h]);
      setBusy(false);
      return;
    }
    setStage(1, 'done', result.module.moduleName);

    // Stage 3: Ingesting module (edge function already persisted to DB)
    setStage(2, 'running');
    await wait(500);
    pushLog(userId, 'success', 'selfbuild.ingest', `Ingested module "${result.module.moduleName}" → ${result.module.filePath}`);
    await reload();
    setStage(2, 'done');

    // Stage 4: GitHub sync (if configured) + live reload
    setStage(3, 'running');
    if (result.github) {
      if (result.github.committed) {
        pushLog(userId, 'success', 'github.push', `Pushed ${result.module.filePath} to GitHub`, { url: result.github.url });
        setStage(3, 'done', 'Synced to GitHub + app reloaded');
      } else {
        pushLog(userId, 'warning', 'github.push', `GitHub sync skipped: ${result.github.error ?? 'unknown'}`);
        setStage(3, 'done', 'App reloaded (GitHub sync skipped)');
      }
    } else {
      pushLog(userId, 'info', 'selfbuild.reload', 'Module mounted in virtual source tree; app shell reloaded');
      setStage(3, 'done', 'App reloaded');
    }

    setLastResult(result);
    const reply = result.github?.committed
      ? `"${result.module.moduleName}" generated, ingested, and pushed to GitHub. ${result.module.explanation}`
      : `"${result.module.moduleName}" generated and ingested into the virtual source tree. ${result.module.explanation}`;
    setHistory((h) => [{ cmd, reply, ok: true }, ...h]);
    if (onBuilt) {
      onBuilt(`Nexa AI has updated its own codebase. Re-scaffolding complete — "${result.module.moduleName}" ingested.`);
    }
    setBusy(false);
  }

  const hasGithub = Boolean(vault.githubToken && vault.githubRepo);

  return (
    <div className="glass p-6 animate-fade-up space-y-4">
      <PanelHeader
        icon={<TerminalSquare className="w-4 h-4" />}
        title="AI Training & Self-Coding Terminal"
        subtitle="Type a feature command. Nexa generates the React code, ingests it, and syncs to GitHub."
      />

      <form onSubmit={run} className="relative">
        <div className="flex items-center gap-2 bg-ink-900/80 border border-white/10 rounded-xl px-4 py-3 font-mono focus-within:border-brand-pink/40 transition">
          <span className="text-brand-pink text-sm font-semibold shrink-0">nexa&gt;</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Add a new module for LinkedIn auto-posting"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-400"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !command.trim()} className="text-brand-cyan hover:text-brand-pink transition disabled:opacity-40 shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Execution pipeline */}
      <div className="rounded-xl bg-ink-900/70 border border-white/5 p-4 font-mono text-xs space-y-2.5">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 animate-fade-up">
            <StageIcon status={s.status} />
            <span className={s.status === 'error' ? 'text-error' : s.status === 'done' ? 'text-success' : s.status === 'running' ? 'text-brand-cyan' : 'text-ink-300'}>
              {s.label}
            </span>
            {s.detail && <span className="text-ink-400">— {s.detail}</span>}
            {s.status === 'running' && <span className="text-brand-cyan animate-blink">_</span>}
          </div>
        ))}
      </div>

      {/* Result card */}
      {lastResult && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-sm font-semibold text-success">Self-build complete</p>
          </div>
          <p className="text-xs text-ink-100 mb-3">{lastResult.module.explanation}</p>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-ink-300">
              <FileCode className="w-3.5 h-3.5 text-brand-pink" /> {lastResult.module.filePath}
            </div>
            <div className="flex items-center gap-1.5 text-ink-300">
              <GitBranch className="w-3.5 h-3.5 text-brand-cyan" />
              {lastResult.github?.committed ? (
                <a href={lastResult.github.url} target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline truncate">
                  {lastResult.github.url ?? 'GitHub commit'}
                </a>
              ) : hasGithub ? (
                <span className="text-warning">Sync skipped</span>
              ) : (
                <span className="text-ink-400">GitHub not configured</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Command history */}
      <div className="rounded-xl bg-ink-900/70 border border-white/5 p-4 font-mono text-xs space-y-3 max-h-64 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-ink-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-yellow" /> Try: "Add a LinkedIn auto-posting module" or "Add a dark mode toggle to the Public view".
          </div>
        ) : (
          history.map((h, i) => (
            <div key={i} className="animate-fade-up">
              <div className="text-brand-pink flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> {h.cmd}
              </div>
              <div className={`pl-4 border-l border-white/10 mt-1 ${h.ok ? 'text-ink-100' : 'text-error'}`}>
                {h.ok ? <CheckCircle2 className="w-3 h-3 inline mr-1 text-success" /> : <XCircle className="w-3 h-3 inline mr-1 text-error" />}
                {h.reply}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StageIcon({ status }: { status: Stage['status'] }) {
  if (status === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
  if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-error shrink-0" />;
  if (status === 'running') return <Loader2 className="w-3.5 h-3.5 text-brand-cyan animate-spin shrink-0" />;
  return <span className="w-3.5 h-3.5 rounded-full border border-ink-400/40 shrink-0" />;
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
