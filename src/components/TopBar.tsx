import { LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function TopBar({
  appName,
  logoUrl,
  onExitToPublic,
}: {
  appName: string;
  logoUrl: string;
  onExitToPublic: () => void;
}) {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-900/70 border-b border-white/5">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center shrink-0">
            <img src={logoUrl} alt={appName} className="w-6 h-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">
              <span className="brand-text">{appName}</span>
            </p>
            <p className="text-[11px] text-ink-300 leading-tight">Admin Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExitToPublic}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-700/70 border border-white/5 text-ink-300 hover:text-ink-100 hover:border-white/10 transition text-xs font-medium"
            title="Return to Public Engine View"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Public View</span>
          </button>

          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-700/70 border border-white/5 text-ink-300 hover:text-ink-100 hover:border-white/10 transition text-xs font-medium"
            title="Sign out of Admin"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/** Minimal public-only header (no admin toggle, no auth controls). */
export function PublicHeader({ appName, logoUrl }: { appName: string; logoUrl: string }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-900/70 border-b border-white/5">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-soft border border-white/10 flex items-center justify-center shrink-0">
            <img src={logoUrl} alt={appName} className="w-6 h-6 object-contain" />
          </div>
          <p className="font-semibold leading-tight truncate">
            <span className="brand-text">{appName}</span>
          </p>
        </div>
      </div>
    </header>
  );
}
