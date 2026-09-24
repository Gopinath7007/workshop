import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

export function requireSupabase() {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  return client;
}

export function throwIfError(error: { message?: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}
