import { useState } from 'react';
import { Sparkles, Mail, Lock, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '@/lib/auth';
import { useToast } from '@/components/Toast';

export default function AuthScreen({ onClose }: { onClose?: () => void }) {
  const { signIn, signUp } = useAuth();
  const { notify } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      notify('error', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink-900/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft border border-white/10 flex items-center justify-center mb-4 shadow-glow">
            <img src="/image.png" alt="Nexa AI" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="brand-text">Nexa AI</span>
          </h1>
          <p className="text-ink-300 text-sm mt-1">Command center access required</p>
        </div>

        <div className="glass p-8">
          <div className="flex gap-2 mb-6 p-1 bg-ink-800/60 rounded-lg">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'signin' ? 'bg-brand-gradient text-ink-900' : 'text-ink-300 hover:text-ink-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'signup' ? 'bg-brand-gradient text-ink-900' : 'text-ink-300 hover:text-ink-100'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-200 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition"
                  placeholder="admin@nexa.ai"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-200 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-ink-800/70 border border-white/5 text-sm focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-brand-gradient text-ink-900 font-semibold py-2.5 rounded-lg hover:shadow-glow transition disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Enter Command Center' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-ink-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
              Restricted access
            </p>
            {onClose && (
              <button onClick={onClose} className="text-xs text-ink-300 hover:text-ink-100 transition">
                Return to public site
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ADMIN_EMAIL };
