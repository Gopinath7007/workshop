import { makeRedirectUri } from 'expo-auth-session';
import * as GoogleAuth from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { appConfig, isGoogleAuthConfigured } from '../config';
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isExpoGo = Constants.appOwnership === 'expo';

  const redirectUri =
    Platform.OS === 'web'
      ? auth.googleRedirectUri()
      : makeRedirectUri({
          scheme: appConfig.scheme,
          path: 'oauthredirect',
        });

  const [request, response, promptAsync] = GoogleAuth.useIdTokenAuthRequest({
    clientId: appConfig.google.webClientId || undefined,
    webClientId: appConfig.google.webClientId || undefined,
    iosClientId: appConfig.google.iosClientId || appConfig.google.webClientId || undefined,
    androidClientId:
      isExpoGo || Platform.OS === 'web'
        ? appConfig.google.androidClientId || undefined
        : undefined,
    redirectUri,
  });

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

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      console.warn('[Auth] Google sign-in failed', response.error);
      return;
    }
    if (response.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    void auth.signInWithGoogleIdToken(idToken).then(setUser).catch((error) => {
      console.warn('[Auth] Google token exchange failed', error);
    });
  }, [response]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      googleReady: Boolean(request && isGoogleAuthConfigured()),
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
        if (!isGoogleAuthConfigured()) {
          throw new Error('Google sign-in is not configured.');
        }
        const result = await promptAsync();
        if (result.type === 'success' && result.params.id_token) {
          setUser(await auth.signInWithGoogleIdToken(result.params.id_token));
        }
      },
    }),
    [loading, promptAsync, request, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
