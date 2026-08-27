import { supabase } from './supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexa-social-syndicate`;

export interface GeneratedAdvert {
  telegram: string;
  twitter: string;
}

export interface SyndicateResult {
  ok: boolean;
  error?: string;
}

export interface SyndicateResponse {
  success: boolean;
  results?: Record<string, SyndicateResult>;
  advert?: GeneratedAdvert;
  error?: string;
}

async function callEdgeFunction(body: Record<string, unknown>): Promise<SyndicateResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as SyndicateResponse;
  if (!res.ok) {
    return { success: false, error: json.error ?? `Request failed (${res.status})` };
  }
  return json;
}

export async function generateAdvert(params: {
  userId: string;
  product: string;
  audience: string;
  goal: string;
  tone: string;
}): Promise<GeneratedAdvert> {
  const result = await callEdgeFunction({
    action: 'generate',
    ...params,
  });
  if (!result.success || !result.advert) {
    throw new Error(result.error ?? 'Failed to generate advert');
  }
  return result.advert;
}

export async function syndicatePost(params: {
  userId: string;
  message: string;
  platforms: string[];
}): Promise<Record<string, SyndicateResult>> {
  const result = await callEdgeFunction({
    action: 'syndicate',
    ...params,
  });
  if (!result.success && !result.results) {
    throw new Error(result.error ?? 'Syndication failed');
  }
  return result.results ?? {};
}
