import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth';
import { useIsCustomerPortal, useSessionBootstrap } from '../hooks/useSessionBootstrap';
import { useSessionStore } from '../store/sessionStore';
import { colors } from '../ui/theme';

/** Resolves staff vs customer home after auth + session bootstrap. */
export function HomeRedirect() {
  const { user, loading } = useAuth();
  const sessionReady = useSessionBootstrap();
  const roles = useSessionStore((s) => s.roles);
  const isCustomer = useIsCustomerPortal();

  if (loading || (user && (!sessionReady || roles.length === 0))) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={isCustomer ? '/(customer)' : '/(staff)'} />;
}
