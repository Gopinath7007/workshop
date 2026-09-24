import { isStrongPassword, passwordRules } from '../src/auth/password';
import { isGoogleAuthConfigured, isSupabaseConfigured, PUBLIC_ENV_KEYS } from '../src/config';

describe('app config', () => {
  it('treats missing keys as unconfigured', () => {
    expect(isSupabaseConfigured()).toBe(false);
    expect(isGoogleAuthConfigured()).toBe(false);
  });

  it('lists every public env key the native extra map needs', () => {
    expect(PUBLIC_ENV_KEYS).toEqual(
      expect.arrayContaining([
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_AUTH_REDIRECT_URL',
      ]),
    );
    expect(PUBLIC_ENV_KEYS).not.toEqual(expect.arrayContaining(['EXPO_PUBLIC_ADMOB_USE_TEST']));
  });
});

describe('password rules', () => {
  it('requires length, case, and a number', () => {
    expect(isStrongPassword('short')).toBe(false);
    expect(isStrongPassword('StrongPass1')).toBe(true);
    expect(passwordRules('StrongPass1').every((rule) => rule.ok)).toBe(true);
  });
});
