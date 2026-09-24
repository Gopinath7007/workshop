import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { useIsCustomerPortal, useSessionBootstrap } from '../../src/hooks/useSessionBootstrap';
import { getDataMode } from '../../src/repositories';
import { useSessionStore } from '../../src/store/sessionStore';
import { colors } from '../../src/ui/theme';

export default function StaffLayout() {
  const { user, loading } = useAuth();
  const sessionReady = useSessionBootstrap();
  const roles = useSessionStore((s) => s.roles);
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

  if (isCustomer) {
    return <Redirect href="/(customer)" />;
  }

  if (roles.length === 0) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job-cards/create" options={{ headerShown: true, title: 'New Job Card' }} />
      <Stack.Screen name="job-cards/[id]" options={{ headerShown: true, title: 'Job Card' }} />
      <Stack.Screen
        name="customers/create"
        options={{ headerShown: true, title: 'New Customer' }}
      />
      <Stack.Screen name="customers/[id]" options={{ headerShown: true, title: 'Customer' }} />
      <Stack.Screen name="vehicles/create" options={{ headerShown: true, title: 'New Vehicle' }} />
      <Stack.Screen name="vehicles/[id]" options={{ headerShown: true, title: 'Vehicle' }} />
      <Stack.Screen name="estimates/index" options={{ headerShown: true, title: 'Estimates' }} />
      <Stack.Screen name="inventory/index" options={{ headerShown: true, title: 'Inventory' }} />
      <Stack.Screen name="billing/index" options={{ headerShown: true, title: 'Billing' }} />
      <Stack.Screen name="employees/index" options={{ headerShown: true, title: 'Employees' }} />
      <Stack.Screen name="attendance/index" options={{ headerShown: true, title: 'Attendance' }} />
      <Stack.Screen name="payroll/index" options={{ headerShown: true, title: 'Payroll' }} />
      <Stack.Screen name="reports/index" options={{ headerShown: true, title: 'Reports' }} />
      <Stack.Screen name="workshop/index" options={{ headerShown: true, title: 'Workshop' }} />
      <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profile' }} />
    </Stack>
  );
}
