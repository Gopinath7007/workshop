import Constants from 'expo-constants';

type Extra = Record<string, string | undefined>;

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** Read a public env value from Metro `process.env` or Expo `extra`. */
export function env(name: string, fallback = ''): string {
  const fromProcess = process.env[name];
  if (fromProcess && fromProcess.trim()) return fromProcess.trim();
  const fromExtra = extra()[name];
  if (fromExtra && fromExtra.trim()) return fromExtra.trim();
  return fallback;
}

export const PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_AUTH_REDIRECT_URL',
  'EXPO_PUBLIC_DATA_MODE',
] as const;

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
