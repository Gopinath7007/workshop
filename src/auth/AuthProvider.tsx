import { makeRedirectUri } from 'expo-auth-session';
import * as GoogleAuth from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { appConfig, isGoogleAuthConfigured, isSupabaseConfigured } from '../config';
import * as auth from './authService';
import type { AppUser } from './types';

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  googleReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

type GoogleBridge = {
  ready: boolean;
  signInWithGoogle: () => Promise<AppUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

function AuthSessionProvider({
  children,
  google,
}: {
  children: ReactNode;
  google?: GoogleBridge;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const googleAvailable = Boolean(google?.ready) || isSupabaseConfigured();

  useEffect(() => {
    let active = true;
    void auth
      .getCurrentUser()
      .then((next) => {
        if (active) setUser(next);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const sub = auth.onAuthChange((next) => setUser(next));
    return () => {
      active = false;
      sub.unsubscribe();
    };
  }, []);

  // Complete OAuth redirect (web hash / deep link) back into a Supabase session.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const handleUrl = (url: string | null) => {
      if (!url) return;
      void auth.createSessionFromUrl(url).then((next) => {
        if (next) setUser(next);
      }).catch((error) => {
        console.warn('[Auth] OAuth redirect failed', error);
      });
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      handleUrl(window.location.href);
    }

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL().then(handleUrl);
    return () => sub.remove();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      googleReady: googleAvailable,
      signIn: async (email, password) => {
        setUser(await auth.signInWithEmail(email, password));
      },
      signUp: auth.signUpWithEmail,
      signOut: async () => {
        await auth.signOut();
        setUser(null);
      },
      sendPasswordReset: auth.sendPasswordReset,
      resendVerificationEmail: auth.resendVerificationEmail,
      updateProfile: async (displayName) => {
        setUser(await auth.updateProfile({ displayName }));
      },
      updatePassword: auth.updatePassword,
      signInWithGoogle: async () => {
        if (google?.ready) {
          const next = await google.signInWithGoogle();
          if (next) setUser(next);
          return;
        }
        if (!isSupabaseConfigured()) {
          throw new Error('Supabase is not configured.');
        }
        const next = await auth.signInWithGoogleOAuth();
        if (next) setUser(next);
      },
    }),
    [google, googleAvailable, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Native Google ID-token flow — only mounts when EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set.
 */
function GoogleIdTokenAuthProvider({ children }: { children: ReactNode }) {
  const isExpoGo = Constants.appOwnership === 'expo';
  const webClientId = appConfig.google.webClientId;

  const redirectUri =
    Platform.OS === 'web'
      ? auth.googleRedirectUri()
      : makeRedirectUri({
          scheme: appConfig.scheme,
          path: 'oauthredirect',
        });

  const [request, , promptAsync] = GoogleAuth.useIdTokenAuthRequest({
    clientId: webClientId,
    webClientId,
    iosClientId: appConfig.google.iosClientId || webClientId,
    androidClientId:
      isExpoGo || Platform.OS === 'web'
        ? appConfig.google.androidClientId || undefined
        : undefined,
    redirectUri,
  });

  const google = useMemo<GoogleBridge>(
    () => ({
      ready: Boolean(request),
      signInWithGoogle: async () => {
        const result = await promptAsync();
        if (result.type !== 'success' || !result.params.id_token) return null;
        return auth.signInWithGoogleIdToken(result.params.id_token);
      },
    }),
    [promptAsync, request],
  );

  return <AuthSessionProvider google={google}>{children}</AuthSessionProvider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isGoogleAuthConfigured()) {
    return <GoogleIdTokenAuthProvider>{children}</GoogleIdTokenAuthProvider>;
  }
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
