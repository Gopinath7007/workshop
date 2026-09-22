import { env } from './env';

const GOOGLE_TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const GOOGLE_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

export const appConfig = {
  name: 'Auth Scaffold',
  slug: 'expo-supabase-auth-scaffold',
  scheme: 'expoauth',
  version: '1.0.0',
  androidPackage: 'com.example.authscaffold',
  iosBundleId: 'com.example.authscaffold',

  supabase: {
    url: env('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: env('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },

  google: {
    webClientId: env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    androidClientId: env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
    iosClientId: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  },

  ads: {
    androidAppId: env(
      'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
      'ca-app-pub-3940256099942544~3347511713',
    ),
    iosAppId: env(
      'EXPO_PUBLIC_ADMOB_IOS_APP_ID',
      'ca-app-pub-3940256099942544~1458002511',
    ),
    bannerUnitId: env('EXPO_PUBLIC_ADMOB_BANNER_ID', GOOGLE_TEST_BANNER),
    interstitialUnitId: env(
      'EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID',
      GOOGLE_TEST_INTERSTITIAL,
    ),
    useTestUnits: env('EXPO_PUBLIC_ADMOB_USE_TEST', 'true') !== 'false',
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

export function bannerAdUnitId(): string {
  return appConfig.ads.useTestUnits ? GOOGLE_TEST_BANNER : appConfig.ads.bannerUnitId;
}

export function interstitialAdUnitId(): string {
  return appConfig.ads.useTestUnits
    ? GOOGLE_TEST_INTERSTITIAL
    : appConfig.ads.interstitialUnitId;
}
