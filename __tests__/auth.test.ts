import { isValidEmail, normalizeEmail } from '../src/auth/email';
import { authMessage, mapSupabaseUser } from '../src/auth/types';

describe('email helpers', () => {
  it('normalizes and validates addresses', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(isValidEmail('ada@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('auth messages', () => {
  it('maps common Supabase errors', () => {
    expect(authMessage({ message: 'Email not confirmed' }, 'x')).toMatch(/verify your email/i);
    expect(authMessage({ message: 'Invalid login credentials' }, 'x')).toMatch(/incorrect/i);
    expect(authMessage({ message: 'User already registered' }, 'x')).toMatch(/already exists/i);
    expect(authMessage({ message: 'Too many requests' }, 'x')).toMatch(/too many attempts/i);
  });
});

describe('mapSupabaseUser', () => {
  it('prefers display_name metadata', () => {
    const user = mapSupabaseUser({
      id: 'user-1',
      email: 'ada@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      user_metadata: { display_name: 'Ada', avatar_url: 'https://example.com/a.png' },
      app_metadata: { provider: 'email' },
    } as never);

    expect(user).toMatchObject({
      uid: 'user-1',
      email: 'ada@example.com',
      displayName: 'Ada',
      photoURL: 'https://example.com/a.png',
      emailVerified: true,
      providerId: 'email',
    });
  });
});
