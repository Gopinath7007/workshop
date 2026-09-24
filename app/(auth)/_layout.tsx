import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { useIsCustomerPortal, useSessionBootstrap } from '../../src/hooks/useSessionBootstrap';
import { useSessionStore } from '../../src/store/sessionStore';
import { colors } from '../../src/ui/theme';

export default function AuthLayout() {
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

  if (user) {
    return <Redirect href={isCustomer ? '/(customer)' : '/(staff)'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
