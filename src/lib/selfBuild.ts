/**
 * A static snapshot of the project file tree that we send to Gemini so the
 * model understands the app structure when generating new modules. Kept as a
 * plain string for prompt token efficiency.
 */
export const PROJECT_TREE = `Nexa AI — Vite + React + TypeScript + Tailwind
src/
  App.tsx                    # Shell: auth gate + Public/Admin view switch
  main.tsx                   # React root
  index.css                  # Tailwind layers + glassmorphism utilities
  lib/
    supabase.ts              # Supabase client singleton
    auth.tsx                 # AuthProvider + useAuth (email/password)
    types.ts                 # Shared TypeScript types
    constants.ts             # Default modules, platform lists
    workspace.ts             # useWorkspace + useModules hooks
    secrets.ts               # useSecretsVault (Gemini/GitHub keys)
    logs.ts                  # pushLog helper
    useLogs.ts               # realtime log subscription hook
    selfBuild.ts             # callSelfBuild (edge function client)
  components/
    AuthScreen.tsx           # Sign in / sign up
    TopBar.tsx               # Header with logo + Public/Admin toggle
    PublicEngine.tsx         # Content gen, auto-publish, indexing, syndication
    AdminConsole.tsx         # Rebrand, training terminal, modules, keys, logs
    LiveLogs.tsx             # Realtime system logs console
    modules/                 # AI-generated modules land here (virtual source tree)
public/
  image.png                  # Nexa AI logo
tailwind.config.js           # Dark theme, brand gradient, glassmorphism
package.json                 # react, lucide-react, @supabase/supabase-js`;

export function callSelfBuild(command: string, userId: string): Promise<SelfBuildResult> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexa-self-build`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ command, userId, projectTree: PROJECT_TREE }),
  }).then(async (res) => {
    const json = (await res.json()) as SelfBuildResult | { error: string };
    if (!res.ok) {
      const errMsg = (json as { error?: string }).error ?? `Request failed (${res.status})`;
      throw new Error(errMsg);
    }
    return json as SelfBuildResult;
  });
}

export interface GeneratedModulePayload {
  id: string;
  moduleName: string;
  moduleKey: string;
  filePath: string;
  explanation: string;
  code: string;
}

export interface SelfBuildResult {
  success: boolean;
  module: GeneratedModulePayload;
  github: { committed: boolean; url?: string; error?: string } | null;
}
