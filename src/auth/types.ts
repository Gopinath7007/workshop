import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId?: string;
};

export function mapSupabaseUser(user: SupabaseUser): AppUser {
  const meta = user.user_metadata || {};
  const displayName =
    (typeof meta.display_name === 'string' && meta.display_name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (user.email ? user.email.split('@')[0] : 'Member');
  const photoURL =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;

  return {
    uid: user.id,
    email: user.email || null,
    displayName,
    photoURL,
    emailVerified: Boolean(user.email_confirmed_at),
    providerId: user.app_metadata?.provider,
  };
}

export function authMessage(error: { message?: string } | null, fallback: string): string {
  const message = error?.message || fallback;
  if (/email not confirmed/i.test(message)) {
    return 'Please verify your email before signing in.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email or password is incorrect.';
  }
  if (/user already registered/i.test(message)) {
    return 'An account with this email already exists.';
  }
  if (/password should be/i.test(message) || /weak password/i.test(message)) {
    return 'Choose a stronger password.';
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (/network request failed|failed to fetch|aborted/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  return message;
}
