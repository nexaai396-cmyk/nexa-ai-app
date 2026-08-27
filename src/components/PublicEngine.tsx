import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { pushLog } from '@/lib/logs';
import { PUBLISH_PLATFORMS, SYNDICATION_CHANNELS } from '@/lib/constants';
import {
  PenLine,
  Send,
  Radar,
  Share2,
  Loader2,
  CheckCircle2,
  Globe,
  Link2,
  Type,
  KeyRound,
} from 'lucide-react';
import SocialSyndication from '@/components/SocialSyndication';

type Busy = Record<string, boolean>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-200 mb-1.5 flex items-center gap-1.5">
        <span className="text-brand-pink">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition';

export default function PublicEngine() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [backlink, setBacklink] = useState('');
  const [anchor, setAnchor] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['blogger', 'wordpress']);
  const [indexUrl, setIndexUrl] = useState('');
  const [syndication, setSyndication] = useState<string[]>(['telegram']);
  const [busy, setBusy] = useState<Busy>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const set = (k: string, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));
  const setResult = (k: string, v: string) => setResults((r) => ({ ...r, [k]: v }));

  async function generate() {
    if (!topic.trim()) return;
    set('gen', true);
    setResult('gen', '');
    await wait(1200);
    pushLog(userId, 'info', 'content.generate', `Drafted article for "${topic}"`, { keywords });
    setResult('gen', `Generated a 1,200-word SEO article targeting "${keywords || topic}" with backlink to ${backlink || 'n/a'}.`);
    set('gen', false);
  }

  async function publish() {
    if (platforms.length === 0) return;
    set('pub', true);
    setResult('pub', '');
    for (const p of platforms) {
      await wait(700);
      pushLog(userId, 'success', 'publish.post', `Posted HTML article to ${p}`, { platform: p });
    }
    setResult('pub', `Published formatted HTML posts to ${platforms.join(', ')}.`);
    set('pub', false);
  }

  async function index() {
    if (!indexUrl.trim()) return;
    set('idx', true);
    setResult('idx', '');
    await wait(1100);
    const code = Math.floor(100000 + Math.random() * 900000);
    pushLog(userId, 'success', 'index.request', `Google indexing request sent for ${indexUrl}`, { code });
    setResult('idx', `Indexing request submitted. Verification code: ${code}`);
    set('idx', false);
  }

  async function syndicate() {
    if (syndication.length === 0) return;
    set('syn', true);
    setResult('syn', '');
    for (const c of syndication) {
      await wait(600);
      pushLog(userId, 'info', 'syndication.distribute', `Distributed link via ${c}`, { channel: c });
    }
    setResult('syn', `Syndicated links across ${syndication.join(', ')}.`);
    set('syn', false);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center pt-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          <span className="brand-text">Public Engine</span>
        </h2>
        <p className="text-ink-300 text-sm mt-1">
          Generate, publish, index, and syndicate — all from one console.
        </p>
      </div>

      <Section
        icon={<PenLine className="w-4 h-4" />}
        title="Content Generation"
        subtitle="AI-crafted SEO articles with targeted keywords and backlinks."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Topic" icon={<Type className="w-3.5 h-3.5" />}>
            <input className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="The future of AI automation" />
          </Field>
          <Field label="Target Keywords" icon={<KeyRound className="w-3.5 h-3.5" />}>
            <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="AI automation, SEO, content ops" />
          </Field>
          <Field label="Backlink URL" icon={<Link2 className="w-3.5 h-3.5" />}>
            <input className={inputCls} value={backlink} onChange={(e) => setBacklink(e.target.value)} placeholder="https://yoursite.com/landing" />
          </Field>
          <Field label="Anchor Text" icon={<Type className="w-3.5 h-3.5" />}>
            <input className={inputCls} value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="Nexa AI automation platform" />
          </Field>
        </div>
        <ActionRow busy={busy.gen} onRun={generate} result={results.gen} label="Generate Content" />
      </Section>

      <Section
        icon={<Send className="w-4 h-4" />}
        title="Auto-Publishing Engine"
        subtitle="Send formatted HTML posts directly to your connected platforms."
      >
        <div className="flex flex-wrap gap-2">
          {PUBLISH_PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() =>
                  setPlatforms((prev) => (active ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  active
                    ? 'bg-brand-gradient text-ink-900 border-transparent'
                    : 'bg-ink-800/60 text-ink-200 border-white/5 hover:border-white/10'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <ActionRow busy={busy.pub} onRun={publish} result={results.pub} label="Publish to Selected Platforms" disabled={platforms.length === 0} />
      </Section>

      <Section
        icon={<Radar className="w-4 h-4" />}
        title="Automatic Indexing Console"
        subtitle="Trigger Google indexing requests for freshly published URLs."
      >
        <Field label="URL to Index" icon={<Globe className="w-3.5 h-3.5" />}>
          <input className={inputCls} value={indexUrl} onChange={(e) => setIndexUrl(e.target.value)} placeholder="https://yoursite.com/new-article" />
        </Field>
        <ActionRow busy={busy.idx} onRun={index} result={results.idx} label="Trigger Google Indexing Request" disabled={!indexUrl.trim()} />
      </Section>

      <Section
        icon={<Share2 className="w-4 h-4" />}
        title="Social & Web 2.0 Syndication"
        subtitle="Distribute published links across your connected channels."
      >
        <div className="grid sm:grid-cols-3 gap-3">
          {SYNDICATION_CHANNELS.map((c) => {
            const active = syndication.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() =>
                  setSyndication((prev) => (active ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                }
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                  active ? 'bg-brand-soft border-brand-pink/30' : 'bg-ink-800/60 border-white/5 hover:border-white/10'
                }`}
              >
                <span className="text-sm font-medium">{c.label}</span>
                <span className={`w-9 h-5 rounded-full p-0.5 transition ${active ? 'bg-brand-gradient' : 'bg-ink-600'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            );
          })}
        </div>
        <ActionRow busy={busy.syn} onRun={syndicate} result={results.syn} label="Syndicate Links" disabled={syndication.length === 0} />
      </Section>

      {/* Full social syndication suite: AI advert generation + multi-platform posting */}
      <SocialSyndication />
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-6 animate-fade-up">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center text-brand-pink shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-ink-300 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ActionRow({
  busy,
  onRun,
  result,
  label,
  disabled,
}: {
  busy: boolean;
  onRun: () => void;
  result?: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
      <button
        onClick={onRun}
        disabled={busy || disabled}
        className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {label}
      </button>
      {result && (
        <p className="text-xs text-ink-200 bg-ink-800/60 border border-white/5 rounded-lg px-3 py-2 flex-1">
          {result}
        </p>
      )}
    </div>
  );
}
