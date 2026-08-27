/**
 * GitHub Contents API client.
 * Reads credentials from import.meta.env, with fallback to the per-user
 * secrets vault stored in Supabase (so the admin can also configure them
 * from the dashboard without rebuilding).
 */

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface CommitResult {
  ok: boolean;
  commitUrl?: string;
  error?: string;
}

/** Resolve GitHub config from env vars first, then from a vault override. */
export function resolveGithubConfig(vault?: Partial<{ githubToken: string; githubRepo: string; githubBranch: string }>): GithubConfig | null {
  const token = vault?.githubToken || import.meta.env.VITE_GITHUB_PAT_TOKEN || '';
  const owner = import.meta.env.VITE_GITHUB_OWNER || (vault?.githubRepo?.split('/')[0] ?? '');
  const repoFromEnv = import.meta.env.VITE_GITHUB_REPO || '';
  const repo = (vault?.githubRepo && vault.githubRepo.includes('/') ? vault.githubRepo.split('/')[1] : '') || repoFromEnv;
  const branch = vault?.githubBranch || 'main';
  if (!token || !owner || !repo) return null;
  return { token, owner, repo, branch };
}

function base64Encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function getExistingSha(cfg: GithubConfig, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get-contents failed: ${res.status}`);
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

/**
 * Commit a file to the configured GitHub repository via the Contents API.
 * Creates or updates the file at `path` with `content` and a commit `message`.
 */
export async function commitFileToGitHub(
  path: string,
  content: string,
  message: string,
  vault?: Partial<{ githubToken: string; githubRepo: string; githubBranch: string }>,
): Promise<CommitResult> {
  const cfg = resolveGithubConfig(vault);
  if (!cfg) {
    return { ok: false, error: 'GitHub not configured. Set VITE_GITHUB_PAT_TOKEN, VITE_GITHUB_OWNER, VITE_GITHUB_REPO or save them in Admin > API Keys.' };
  }
  try {
    const sha = await getExistingSha(cfg, path);
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: base64Encode(content),
        branch: cfg.branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `GitHub ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { commit?: { html_url?: string } };
    return { ok: true, commitUrl: data.commit?.html_url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
