import {
  createClient,
  SupabaseClient,
} from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BuildRequest {
  command: string;
  userId: string;
  projectTree: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

interface GeneratedModule {
  moduleName: string;
  moduleKey: string;
  filePath: string;
  code: string;
  explanation: string;
}

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const SYSTEM_PROMPT = `You are Nexa AI's self-building engine. You receive a natural-language feature command and the current project file tree, and you respond with EXACTLY one JSON object (no markdown, no prose) describing a new React + TypeScript module to inject into the app.

The app is a Vite + React + Tailwind app. Generated components must:
- Use only react, lucide-react, and tailwindcss (no external UI libs).
- Use the @/ path alias for imports (maps to src/).
- Use Tailwind classes consistent with a dark glassmorphism theme (bg-ink-800/70, border border-white/5, rounded-xl, text-ink-100, brand-text for gradient text).
- Be self-contained single-file components, exported as default.
- Be genuinely functional, not placeholder stubs.

Respond with this exact JSON shape:
{
  "moduleName": "Human readable name",
  "moduleKey": "snake_case_key",
  "filePath": "src/components/modules/<PascalName>.tsx",
  "code": "<full component source as a string>",
  "explanation": "One sentence describing what the module does"
}`;

function extractJson(text: string): GeneratedModule {
  // Strip markdown fences if present.
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  // Find the first { ... last }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model output');
  const raw = t.slice(start, end + 1);
  const parsed = JSON.parse(raw) as GeneratedModule;
  if (!parsed.moduleName || !parsed.code || !parsed.filePath) {
    throw new Error('Model output missing required fields');
  }
  return parsed;
}

async function callGemini(
  apiKey: string,
  command: string,
  projectTree: string,
): Promise<GeneratedModule> {
  const prompt = `${SYSTEM_PROMPT}

COMMAND:
${command}

CURRENT PROJECT FILE TREE:
${projectTree}

Generate the module JSON now.`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(ENDPOINT(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return extractJson(text);
}

function makeSupabase(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  return createClient(url, '', {
    global: { headers: { Authorization: auth } },
  });
}

function base64Encode(s: string): string {
  // Deno btoa expects binary strings; encode UTF-8 first.
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function getExistingSha(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get-contents failed: ${res.status}`);
  const data = await res.json();
  return (data as { sha?: string }).sha ?? null;
}

async function pushToGitHub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string,
): Promise<{ committed: boolean; url?: string; error?: string }> {
  try {
    const sha = await getExistingSha(token, owner, repo, filePath, branch);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: base64Encode(content),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { committed: false, error: `GitHub ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { commit?: { html_url?: string } };
    return { committed: true, url: data.commit?.html_url };
  } catch (e) {
    return { committed: false, error: (e as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { command, userId, projectTree } = (await req.json()) as BuildRequest;
    if (!command || !userId) {
      return new Response(
        JSON.stringify({ error: 'command and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = makeSupabase(req);

    // Load secrets from the project settings table (stored by the admin).
    const { data: settingsRow } = await supabase
      .from('nexa_settings')
      .select('value')
      .eq('key', 'secrets')
      .maybeSingle();
    const secrets = (settingsRow?.value ?? {}) as Record<string, string>;
    const geminiKey = secrets.geminiKey ?? Deno.env.get('GEMINI_API_KEY') ?? '';
    const githubToken = secrets.githubToken ?? '';
    const githubRepo = secrets.githubRepo ?? ''; // "owner/repo"
    const githubBranch = secrets.githubBranch ?? 'main';

    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error: 'No Gemini API key configured. Add it in Admin > API Keys.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Stage 1: Generate code via Gemini.
    const generated = await callGemini(geminiKey, command, projectTree);

    // Stage 2: Persist to virtual source tree (idempotent upsert by module_key).
    const { data: existing } = await supabase
      .from('nexa_generated_modules')
      .select('id')
      .eq('user_id', userId)
      .eq('module_key', generated.moduleKey)
      .maybeSingle();

    let moduleId = existing?.id ?? '';
    if (existing?.id) {
      await supabase
        .from('nexa_generated_modules')
        .update({
          command,
          module_name: generated.moduleName,
          file_path: generated.filePath,
          code: generated.code,
          explanation: generated.explanation,
          status: 'ingested',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      const { data: created } = await supabase
        .from('nexa_generated_modules')
        .insert({
          user_id: userId,
          command,
          module_name: generated.moduleName,
          module_key: generated.moduleKey,
          file_path: generated.filePath,
          code: generated.code,
          explanation: generated.explanation,
          status: 'ingested',
          enabled: true,
        })
        .select('id')
        .maybeSingle();
      moduleId = created?.id ?? '';
    }

    // Stage 3: GitHub sync if configured.
    let githubResult: { committed: boolean; url?: string; error?: string } | null = null;
    if (githubToken && githubRepo) {
      const [owner, repo] = githubRepo.split('/');
      if (owner && repo) {
        githubResult = await pushToGitHub(
          githubToken,
          owner,
          repo,
          githubBranch,
          generated.filePath,
          generated.code,
          `feat(nexa): ${generated.moduleName} [auto-generated by Nexa AI]`,
        );
        if (githubResult?.committed) {
          await supabase
            .from('nexa_generated_modules')
            .update({ status: 'synced', updated_at: new Date().toISOString() })
            .eq('id', moduleId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        module: {
          id: moduleId,
          moduleName: generated.moduleName,
          moduleKey: generated.moduleKey,
          filePath: generated.filePath,
          explanation: generated.explanation,
          code: generated.code,
        },
        github: githubResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
