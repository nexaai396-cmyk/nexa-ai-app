import { useState } from 'react';
import {
  Sparkles,
  Send,
  Share2,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Twitter,
  Wand2,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { pushLog } from '@/lib/logs';
import { useToast } from '@/components/Toast';
import { useSocialAccounts, type SocialPlatform } from '@/lib/social';
import { generateAdvert, syndicatePost, type GeneratedAdvert, type SyndicateResult } from '@/lib/syndicate';
import ConnectModal, { ConnectionStatus } from '@/components/ConnectModal';

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition';

const TONES = ['Promotional', 'Casual', 'High-Energy', 'Professional', 'Urgent'];

interface PlatformStatus {
  platform: string;
  result: SyndicateResult;
}

export default function SocialSyndication() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { notify } = useToast();
  const { isConnected } = useSocialAccounts();

  const [connectModal, setConnectModal] = useState<SocialPlatform | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [synBusy, setSynBusy] = useState(false);
  const [advert, setAdvert] = useState<GeneratedAdvert | null>(null);
  const [statuses, setStatuses] = useState<PlatformStatus[]>([]);

  // Advert generation form
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState(TONES[0]);

  // Which platforms to syndicate to
  const [targets, setTargets] = useState<string[]>(['telegram', 'twitter']);

  const telegramConnected = isConnected('telegram');
  const twitterConnected = isConnected('twitter');

  function toggleTarget(p: string) {
    setTargets((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleGenerate() {
    if (!product.trim() || !audience.trim() || !goal.trim()) {
      notify('error', 'Product, audience, and goal are required.');
      return;
    }
    setGenBusy(true);
    setAdvert(null);
    setStatuses([]);
    try {
      const result = await generateAdvert({ userId, product, audience, goal, tone });
      setAdvert(result);
      notify('success', 'Advert generated! Review the copy below, then syndicate.');
      void pushLog(userId, 'success', 'advert.generate', `Generated advert for "${product}"`, { tone });
    } catch (e) {
      notify('error', `Generation failed: ${(e as Error).message}`);
      void pushLog(userId, 'error', 'advert.generate', 'Advert generation failed', { error: (e as Error).message });
    }
    setGenBusy(false);
  }

  async function handleSyndicate() {
    if (!advert) return;
    if (targets.length === 0) {
      notify('error', 'Select at least one platform to syndicate.');
      return;
    }
    setSynBusy(true);
    setStatuses([]);

    const platformResults: PlatformStatus[] = [];
    for (const target of targets) {
      const message = target === 'telegram' ? advert.telegram : advert.twitter;
      try {
        const results = await syndicatePost({ userId, message, platforms: [target] });
        const r = results[target] ?? { ok: false, error: 'No response' };
        platformResults.push({ platform: target, result: r });
        if (r.ok) {
          notify('success', `${target === 'telegram' ? 'Telegram' : 'Twitter / X'}: posted successfully.`);
          void pushLog(userId, 'success', `syndicate.${target}`, `Posted to ${target}`);
        } else {
          notify('error', `${target === 'telegram' ? 'Telegram' : 'Twitter / X'}: ${r.error ?? 'failed'}`);
          void pushLog(userId, 'error', `syndicate.${target}`, `Post failed: ${r.error ?? ''}`);
        }
      } catch (e) {
        platformResults.push({ platform: target, result: { ok: false, error: (e as Error).message } });
        notify('error', `${target}: ${(e as Error).message}`);
        void pushLog(userId, 'error', `syndicate.${target}`, (e as Error).message);
      }
    }
    setStatuses(platformResults);
    setSynBusy(false);
  }

  const platforms: { id: string; label: string; icon: React.ReactNode; connected: boolean }[] = [
    { id: 'telegram', label: 'Telegram', icon: <MessageCircle className="w-4 h-4" />, connected: telegramConnected },
    { id: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4" />, connected: twitterConnected },
  ];

  return (
    <div className="space-y-6">
      {/* AI Advert Generator */}
      <div className="glass p-6 animate-fade-up space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center text-brand-pink shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Advert Generator</h3>
            <p className="text-xs text-ink-300 mt-0.5">
              Generate targeted copy formatted for Telegram and Twitter / X.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-ink-200 mb-1.5 block">Product Name</label>
            <input
              className={inputCls}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Nexa AI Pro Subscription"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-200 mb-1.5 block">Target Audience</label>
            <input
              className={inputCls}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Startup founders, marketing teams"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-200 mb-1.5 block">Campaign Goal</label>
            <input
              className={inputCls}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Drive sign-ups for the beta launch"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-200 mb-1.5 block">Tone</label>
            <select
              className={inputCls}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={genBusy}
          className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50"
        >
          {genBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Advert with Nexa
        </button>
      </div>

      {/* Generated advert preview */}
      {advert && (
        <div className="glass p-6 animate-fade-up space-y-4">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-brand-cyan" />
            <h3 className="font-semibold">Generated Advert</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 bg-ink-800/40 p-4">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-brand-cyan">
                <MessageCircle className="w-3.5 h-3.5" /> Telegram ({advert.telegram.length} chars)
              </div>
              <p className="text-sm text-ink-100 whitespace-pre-wrap leading-relaxed">{advert.telegram}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-ink-800/40 p-4">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-brand-cyan">
                <Twitter className="w-3.5 h-3.5" /> Twitter / X ({advert.twitter.length} chars)
              </div>
              <p className="text-sm text-ink-100 whitespace-pre-wrap leading-relaxed">{advert.twitter}</p>
            </div>
          </div>

          {/* Syndication targets */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs font-medium text-ink-200 mb-3">Publish to:</p>
            <div className="flex flex-wrap gap-3">
              {platforms.map((p) => {
                const active = targets.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
                      active ? 'bg-brand-soft border-brand-pink/30' : 'bg-ink-800/60 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <button onClick={() => toggleTarget(p.id)} className="flex items-center gap-2 text-sm font-medium">
                      {p.icon}
                      {p.label}
                    </button>
                    <ConnectionStatus
                      platform={p.id as SocialPlatform}
                      connected={p.connected}
                      onConnect={() => setConnectModal(p.id as SocialPlatform)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSyndicate}
              disabled={synBusy || targets.length === 0}
              className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50"
            >
              {synBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish Advert
            </button>
            {targets.length === 0 && (
              <span className="text-xs text-ink-400">Select at least one platform.</span>
            )}
          </div>

          {/* Real-time status feed */}
          {statuses.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <p className="text-xs font-medium text-ink-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-brand-cyan" /> Delivery Status
              </p>
              {statuses.map((s) => (
                <div
                  key={s.platform}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                    s.result.ok
                      ? 'bg-success/10 border-success/20 text-success'
                      : 'bg-error/10 border-error/20 text-error'
                  }`}
                >
                  {s.result.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-medium capitalize">{s.platform === 'telegram' ? 'Telegram' : 'Twitter / X'}</span>
                  <span className="text-xs opacity-80">
                    {s.result.ok ? 'Delivered successfully' : s.result.error ?? 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {connectModal && (
        <ConnectModal platform={connectModal} onClose={() => setConnectModal(null)} />
      )}
    </div>
  );
}
