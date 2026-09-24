import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { STAFF_TABS } from '../../../src/navigation/staffNav';
import { colors } from '../../../src/ui/theme';

export default function StaffTabsLayout() {
  const { canAny } = usePermissions();

  if (!canAny(['dashboard.view', 'job_cards.read', 'customers.read', 'vehicles.read'])) {
    return <Redirect href="/(staff)/profile" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      {STAFF_TABS.map((tab) => {
        const visible = tab.gates.length === 0 || canAny(tab.gates);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: visible ? undefined : null,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={tab.icon} color={color} size={size} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
