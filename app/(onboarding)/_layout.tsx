import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { useSessionBootstrap } from '../../src/hooks/useSessionBootstrap';
import { useSessionStore } from '../../src/store/sessionStore';
import { colors } from '../../src/ui/theme';

export default function OnboardingLayout() {
  const { user, loading } = useAuth();
  const sessionReady = useSessionBootstrap();
  const organizationId = useSessionStore((s) => s.organizationId);
  const needsOnboarding = useSessionStore((s) => s.needsOnboarding);

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

  if (organizationId && !needsOnboarding) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
