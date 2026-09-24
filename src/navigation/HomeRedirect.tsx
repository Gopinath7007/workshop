import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth';
import { useIsCustomerPortal, useSessionBootstrap } from '../hooks/useSessionBootstrap';
import { getDataMode } from '../repositories';
import { useSessionStore } from '../store/sessionStore';
import { colors } from '../ui/theme';

/** Resolves staff vs customer home after auth + session bootstrap. */
export function HomeRedirect() {
  const { user, loading } = useAuth();
  const sessionReady = useSessionBootstrap();
  const organizationId = useSessionStore((s) => s.organizationId);
  const needsOnboarding = useSessionStore((s) => s.needsOnboarding);
  const isCustomer = useIsCustomerPortal();
  const dataMode = getDataMode();

  if (loading || (user && !sessionReady)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (dataMode === 'supabase' && (needsOnboarding || !organizationId)) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href={isCustomer ? '/(customer)' : '/(staff)'} />;
}
