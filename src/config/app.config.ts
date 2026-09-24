import { env } from './env';

export const appConfig = {
  name: 'Workshop',
  slug: 'workshop',
  scheme: 'workshop',
  version: '1.0.0',
  androidPackage: 'com.workshop.app',
  iosBundleId: 'com.workshop.app',
  market: 'IN' as const,
  currency: 'INR' as const,
  locale: 'en-IN' as const,

  supabase: {
    url: env('EXPO_PUBLIC_SUPABASE_URL', 'https://pvpnaxjaacoiyyuicjzp.supabase.co'),
    anonKey: env('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },

  google: {
    webClientId: env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    androidClientId: env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
    iosClientId: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  },

  auth: {
    minPasswordLength: 8,
    emailRedirectTo: env('EXPO_PUBLIC_AUTH_REDIRECT_URL'),
  },
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(appConfig.google.webClientId);
}
