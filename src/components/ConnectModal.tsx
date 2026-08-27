import { useState } from 'react';
import { X, Loader2, Send, CheckCircle2, Trash2, MessageCircle, Twitter } from 'lucide-react';
import { useSocialAccounts, type SocialPlatform, type TelegramCreds, type TwitterCreds } from '@/lib/social';
import { useToast } from '@/components/Toast';

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition';

export default function ConnectModal({
  platform,
  onClose,
}: {
  platform: SocialPlatform;
  onClose: () => void;
}) {
  const { upsert, disconnect } = useSocialAccounts();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');

  // Telegram fields
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  // Twitter fields
  const [apiKey, setApiKey] = useState('');
  const [apiKeySecret, setApiKeySecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [accessTokenSecret, setAccessTokenSecret] = useState('');

  const isTelegram = platform === 'telegram';

  async function save() {
    setBusy(true);
    if (isTelegram) {
      if (!botToken.trim() || !chatId.trim()) {
        setBusy(false);
        notify('error', 'Bot Token and Chat ID are required.');
        return;
      }
      const creds: TelegramCreds = { botToken: botToken.trim(), chatId: chatId.trim() };
      const { error } = await upsert('telegram', label || 'Telegram Bot', creds);
      setBusy(false);
      if (error) {
        notify('error', `Failed to connect: ${error}`);
      } else {
        notify('success', 'Telegram account connected successfully.');
        onClose();
      }
    } else {
      if (!apiKey.trim() || !apiKeySecret.trim() || !accessToken.trim() || !accessTokenSecret.trim()) {
        setBusy(false);
        notify('error', 'All four Twitter credentials are required.');
        return;
      }
      const creds: TwitterCreds = {
        apiKey: apiKey.trim(),
        apiKeySecret: apiKeySecret.trim(),
        accessToken: accessToken.trim(),
        accessTokenSecret: accessTokenSecret.trim(),
      };
      const { error } = await upsert('twitter', label || 'Twitter / X', creds);
      setBusy(false);
      if (error) {
        notify('error', `Failed to connect: ${error}`);
      } else {
        notify('success', 'Twitter / X account connected successfully.');
        onClose();
      }
    }
  }

  async function remove() {
    setBusy(true);
    const { error } = await disconnect(platform);
    setBusy(false);
    if (error) {
      notify('error', `Failed to disconnect: ${error}`);
    } else {
      notify('success', `${isTelegram ? 'Telegram' : 'Twitter / X'} disconnected.`);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink-900/80 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center text-brand-cyan">
                {isTelegram ? <MessageCircle className="w-5 h-5" /> : <Twitter className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold">{isTelegram ? 'Connect Telegram' : 'Connect Twitter / X'}</h3>
                <p className="text-xs text-ink-300 mt-0.5">
                  {isTelegram ? 'Bot Token + Chat ID' : 'OAuth 1.0a API credentials'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-ink-300 hover:text-ink-100 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-200 mb-1.5 block">Account Label</label>
              <input
                className={inputCls}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={isTelegram ? 'Main Telegram Bot' : 'Twitter / X Account'}
              />
            </div>

            {isTelegram ? (
              <>
                <div>
                  <label className="text-xs font-medium text-ink-200 mb-1.5 block">Bot Token</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:AAEx..."
                  />
                  <p className="text-[11px] text-ink-400 mt-1">Get this from @BotFather on Telegram.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-200 mb-1.5 block">Chat / Group ID</label>
                  <input
                    className={inputCls}
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="-1001234567890"
                  />
                  <p className="text-[11px] text-ink-400 mt-1">Numeric ID of the channel, group, or chat.</p>
                </div>
              </>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-ink-200 mb-1.5 block">API Key</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Consumer API key"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-200 mb-1.5 block">API Key Secret</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={apiKeySecret}
                      onChange={(e) => setApiKeySecret(e.target.value)}
                      placeholder="Consumer API secret"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-200 mb-1.5 block">Access Token</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="OAuth access token"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-200 mb-1.5 block">Access Token Secret</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={accessTokenSecret}
                      onChange={(e) => setAccessTokenSecret(e.target.value)}
                      placeholder="OAuth access token secret"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink-400">
                  Create a project at developer.twitter.com to get these credentials.
                </p>
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-brand-gradient text-ink-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Connect Account
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-ink-800/70 border border-white/5 text-ink-300 hover:text-error text-sm px-4 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact connection-status chip used in the syndication panel. */
export function ConnectionStatus({
  platform,
  connected,
  onConnect,
}: {
  platform: SocialPlatform;
  connected: boolean;
  onConnect: () => void;
}) {
  return (
    <button
      onClick={onConnect}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
        connected
          ? 'bg-success/10 border-success/20 text-success'
          : 'bg-ink-800/60 border-white/5 text-ink-300 hover:border-white/10'
      }`}
    >
      {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
      {connected ? 'Connected' : 'Connect'}
    </button>
  );
}
