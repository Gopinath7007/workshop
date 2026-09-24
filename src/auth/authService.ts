import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { appConfig, isGoogleAuthConfigured } from '../config';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { isValidEmail, normalizeEmail } from './email';
import { isStrongPassword } from './password';
import { authMessage, mapSupabaseUser, type AppUser } from './types';

WebBrowser.maybeCompleteAuthSession();

function clientOrThrow() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

function requireEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  return normalized;
}

export function googleRedirectUri(): string {
  if (appConfig.auth.emailRedirectTo) return appConfig.auth.emailRedirectTo;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return Linking.createURL('/');
}

/** Create / restore a session from an OAuth redirect URL (web + native). */
export async function createSessionFromUrl(url: string): Promise<AppUser | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (!access_token) return null;

  const { data, error } = await clientOrThrow().auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (error) throw new Error(authMessage(error, 'Could not complete Google sign-in'));
  return data.user ? mapSupabaseUser(data.user) : null;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await clientOrThrow().auth.getSession();
  if (error) throw new Error(authMessage(error, 'Could not restore session'));
  return data.session?.user ? mapSupabaseUser(data.session.user) : null;
}

export function onAuthChange(listener: (user: AppUser | null) => void) {
  const supabase = getSupabase();
  if (!supabase) return { unsubscribe: () => undefined };
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ? mapSupabaseUser(session.user) : null);
  });
  return data.subscription;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<void> {
  if (!isStrongPassword(password)) {
    throw new Error('Choose a stronger password.');
  }
  const { error } = await clientOrThrow().auth.signUp({
    email: requireEmail(email),
    password,
    options: {
      data: displayName ? { display_name: displayName.trim() } : undefined,
      emailRedirectTo: appConfig.auth.emailRedirectTo || undefined,
    },
  });
  if (error) throw new Error(authMessage(error, 'Could not create account'));
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  const { data, error } = await clientOrThrow().auth.signInWithPassword({
    email: requireEmail(email),
    password,
  });
  if (error) throw new Error(authMessage(error, 'Could not sign in'));
  if (!data.user) throw new Error('Could not sign in');
  return mapSupabaseUser(data.user);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authMessage(error, 'Could not sign out'));
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await clientOrThrow().auth.resetPasswordForEmail(requireEmail(email), {
    redirectTo: appConfig.auth.emailRedirectTo || undefined,
  });
  if (error) throw new Error(authMessage(error, 'Could not send reset email'));
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!isStrongPassword(newPassword)) {
    throw new Error('Choose a stronger password.');
  }
  const { error } = await clientOrThrow().auth.updateUser({ password: newPassword });
  if (error) throw new Error(authMessage(error, 'Could not update password'));
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await clientOrThrow().auth.resend({
    type: 'signup',
    email: requireEmail(email),
  });
  if (error) throw new Error(authMessage(error, 'Could not resend verification email'));
}

export async function updateProfile(patch: { displayName?: string }): Promise<AppUser> {
  const { data, error } = await clientOrThrow().auth.updateUser({
    data: patch.displayName ? { display_name: patch.displayName.trim() } : undefined,
  });
  if (error) throw new Error(authMessage(error, 'Could not update profile'));
  if (!data.user) throw new Error('Could not update profile');
  return mapSupabaseUser(data.user);
}

export async function signInWithGoogleIdToken(idToken: string, nonce?: string): Promise<AppUser> {
  if (!isGoogleAuthConfigured()) {
    throw new Error('Google sign-in is not configured.');
  }
  const { data, error } = await clientOrThrow().auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    ...(nonce ? { nonce } : {}),
  });
  if (error) throw new Error(authMessage(error, 'Google sign-in failed'));
  if (!data.user) throw new Error('Google sign-in failed');
  return mapSupabaseUser(data.user);
}

/**
 * Supabase-hosted Google OAuth (no Expo Google client ID required).
 * Enable Google under Authentication → Providers in the Supabase dashboard.
 */
export async function signInWithGoogleOAuth(): Promise<AppUser | null> {
  const supabase = clientOrThrow();
  const redirectTo = googleRedirectUri();

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(authMessage(error, 'Google sign-in failed'));
    return null;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) throw new Error(authMessage(error, 'Google sign-in failed'));
  if (!data.url) throw new Error('Google sign-in failed');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return null;
  return createSessionFromUrl(result.url);
}
