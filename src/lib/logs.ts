import { supabase } from './supabase';
import type { LogLevel } from './types';

export async function pushLog(
  userId: string,
  level: LogLevel,
  event: string,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('nexa_system_logs').insert({
      user_id: userId,
      level,
      event,
      message,
      metadata,
    });
  } catch (err) {
    console.error('Failed to persist log', err);
  }
}
