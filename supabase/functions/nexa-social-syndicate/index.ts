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

interface TelegramCreds {
  botToken: string;
  chatId: string;
}

interface TwitterCreds {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface SyndicateRequest {
  action: 'generate' | 'syndicate';
  userId: string;
  // generate
  product?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  // syndicate
  message?: string;
  platforms?: string[];
}

interface SocialAccount {
  platform: string;
  credentials: TelegramCreds | TwitterCreds;
  connected: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

const MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

function makeSupabase(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, serviceKey, {
    global: { headers: { Authorization: auth } },
  });
}

function extractJson(text: string): Record<string, string> {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model output');
  return JSON.parse(t.slice(start, end + 1));
}

async function generateAdvert(
  geminiKey: string,
  product: string,
  audience: string,
  goal: string,
  tone: string,
): Promise<{ telegram: string; twitter: string }> {
  const prompt = `You are an expert social media copywriter for Nexa AI. Generate targeted advertising copy for the following campaign:

Product: ${product}
Target Audience: ${audience}
Campaign Goal: ${goal}
Tone: ${tone}

Create TWO versions of the advert:
1. A "telegram" version (up to 4096 characters, can include emojis and a strong CTA)
2. A "twitter" version (max 280 characters, punchy and concise with hashtags)

Respond with EXACTLY this JSON shape (no markdown, no prose):
{
  "telegram": "<full telegram post text>",
  "twitter": "<full twitter post text within 280 chars>"
}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(GEMINI_ENDPOINT(geminiKey), {
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

  const parsed = extractJson(text);
  if (!parsed.telegram || !parsed.twitter) {
    throw new Error('Generated advert missing required fields');
  }
  return { telegram: parsed.telegram, twitter: parsed.twitter };
}

async function sendTelegram(
  creds: TelegramCreds,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${creds.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: creds.chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `Telegram ${res.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

async function sendTwitter(
  creds: TwitterCreds,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  // Twitter API v2 - OAuth 1.0a user context
  const oauthNonce = crypto.randomUUID().replace(/-/g, '');
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const resourceUrl = 'https://api.twitter.com/2/tweets';

  const params: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: oauthTimestamp,
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  const baseString = `${method}&${encodeURIComponent(resourceUrl)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(creds.apiKeySecret)}&${encodeURIComponent(creds.accessTokenSecret)}`;

  const keyData = new TextEncoder().encode(signingKey);
  const msgData = new TextEncoder().encode(baseString);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const sigBytes = new Uint8Array(signature);
  let sigB64 = '';
  for (const b of sigBytes) sigB64 += String.fromCharCode(b);
  const oauthSignature = btoa(sigB64);

  const authHeader =
    `OAuth ${Object.entries({
      ...params,
      oauth_signature: oauthSignature,
    })
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .sort((a, b) => a.localeCompare(b))
      .join(', ')}`;

  const res = await fetch(resourceUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: message.slice(0, 280) }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `Twitter ${res.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SyndicateRequest;
    if (!body.action || !body.userId) {
      return new Response(
        JSON.stringify({ error: 'action and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = makeSupabase(req);

    if (body.action === 'generate') {
      // --- AI Advert Generation ---
      const { product, audience, goal, tone } = body;
      if (!product || !audience || !goal || !tone) {
        return new Response(
          JSON.stringify({ error: 'product, audience, goal, and tone are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Load Gemini key from settings or env.
      const { data: settingsRow } = await supabase
        .from('nexa_settings')
        .select('value')
        .eq('user_id', body.userId)
        .eq('key', 'secrets')
        .maybeSingle();
      const secrets = (settingsRow?.value ?? {}) as Record<string, string>;
      const geminiKey = secrets.geminiKey ?? Deno.env.get('GEMINI_API_KEY') ?? '';

      if (!geminiKey) {
        return new Response(
          JSON.stringify({ error: 'No Gemini API key configured. Add it in Admin > API Keys.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const advert = await generateAdvert(geminiKey, product, audience, goal, tone);

      return new Response(
        JSON.stringify({ success: true, advert }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (body.action === 'syndicate') {
      // --- Multi-platform posting ---
      const { message, platforms } = body;
      if (!message || !platforms || platforms.length === 0) {
        return new Response(
          JSON.stringify({ error: 'message and platforms are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Load the user's connected social accounts.
      const { data: accounts } = await supabase
        .from('user_social_accounts')
        .select('platform, credentials, connected')
        .eq('user_id', body.userId)
        .eq('connected', true)
        .in('platform', platforms);

      const results: Record<string, { ok: boolean; error?: string }> = {};

      for (const account of (accounts ?? []) as SocialAccount[]) {
        if (account.platform === 'telegram') {
          results.telegram = await sendTelegram(account.credentials as TelegramCreds, message);
        } else if (account.platform === 'twitter') {
          results.twitter = await sendTwitter(account.credentials as TwitterCreds, message);
        }
      }

      // Mark platforms with no connected account.
      for (const p of platforms) {
        if (!results[p]) {
          results[p] = { ok: false, error: `No connected ${p} account found.` };
        }
      }

      const allOk = Object.values(results).every((r) => r.ok);

      return new Response(
        JSON.stringify({ success: allOk, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
