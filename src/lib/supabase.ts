import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { appConfig, isSupabaseConfigured } from '../config';

const AUTH_TIMEOUT_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 8_000;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeoutMs = requestUrl(input).includes('/auth/v1/')
    ? AUTH_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: init?.signal ?? controller.signal }).finally(
    () => clearTimeout(timer),
  );
}

let client: SupabaseClient | null = null;

export { isSupabaseConfigured };

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        storage: AsyncStorage,
      },
      global: {
        fetch: fetchWithTimeout,
        headers: { 'x-client-info': 'expo-supabase-auth-scaffold' },
      },
    });
  }
  return client;
}

export async function requireSession(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in required');
  return token;
}
