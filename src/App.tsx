import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { pushLog } from '@/lib/logs';
import { useRoute } from '@/lib/router';
import { ToastProvider, useToast } from '@/components/Toast';
import TopBar, { PublicHeader } from '@/components/TopBar';
import PublicEngine from '@/components/PublicEngine';
import AdminConsole from '@/components/AdminConsole';

function Shell() {
  const { session, loading, isAdmin, signOut } = useAuth();
  const { workspace } = useWorkspace();
  const [route, navigate] = useRoute();
  const { notify } = useToast();

  useEffect(() => {
    document.title = workspace.app_name || 'Nexa AI';
  }, [workspace.app_name]);

  // If someone lands on #/admin without being the authorized admin, reject + redirect.
  useEffect(() => {
    if (loading) return;
    if (route === 'admin' && !isAdmin) {
      notify('error', 'Unauthorized access: You do not have administrator permissions.');
      if (session) {
        void pushLog(session.user.id, 'error', 'auth.denied', 'Non-admin attempted /admin access');
        void signOut();
      }
      navigate('public');
    }
  }, [route, loading, isAdmin, session, signOut, navigate, notify]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-pink/30 border-t-brand-pink animate-spin" />
      </div>
    );
  }

  // Admin route: only the authorized admin sees the Command Center.
  if (route === 'admin' && session && isAdmin) {
    return (
      <div className="min-h-screen">
        <TopBar
          appName={workspace.app_name}
          logoUrl={workspace.logo_url}
          onExitToPublic={() => navigate('public')}
        />
        <main className="px-4 md:px-6 py-6 pb-16">
          <AdminConsole />
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-ink-300">
          <span className="brand-text font-semibold">{workspace.app_name}</span> · {workspace.site_description}
        </footer>
      </div>
    );
  }

  // Public route (default): everyone sees the public site.
  return (
    <div className="min-h-screen">
      <PublicHeader appName={workspace.app_name} logoUrl={workspace.logo_url} />
      <main className="px-4 md:px-6 py-6 pb-16">
        <PublicEngine />
      </main>
      <footer className="border-t border-white/5 py-6 flex flex-col items-center gap-2 text-xs text-ink-300">
        <div>
          <span className="brand-text font-semibold">{workspace.app_name}</span> · {workspace.site_description}
        </div>
        <button
          onClick={() => navigate('admin')}
          className="text-ink-400 hover:text-brand-pink transition text-[11px] tracking-wider uppercase"
          title="Staff access"
          aria-label="Admin login"
        >
          ·
        </button>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  );
}
