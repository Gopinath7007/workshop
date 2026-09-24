import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../src/auth';
import { ROLE_LABELS } from '../../../src/config/architecture';
import { permissionsForRoles } from '../../../src/modules/rbac/permissions';
import { useSessionStore } from '../../../src/store/sessionStore';
import type { SystemRole } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

export default function CustomerProfileScreen() {
  const { user, signOut } = useAuth();
  const setContext = useSessionStore((s) => s.setContext);
  const organizationId = useSessionStore((s) => s.organizationId);
  const branchId = useSessionStore((s) => s.branchId);

  const switchToStaff = () => {
    if (!organizationId) return;
    const role: SystemRole = 'service_advisor';
    setContext({
      organizationId,
      branchId,
      roles: [role],
      permissions: permissionsForRoles([role]),
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.meta}>{user?.email || 'No email'}</Text>
      <Text style={styles.meta}>Role: {ROLE_LABELS.customer}</Text>

      <View style={styles.block}>
        <Text style={styles.hint}>Dev only — exit customer portal</Text>
        <Button label="Switch to staff demo" variant="ghost" onPress={switchToStaff} />
      </View>

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
  },
  block: {
    gap: space.sm,
    marginTop: space.md,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
});
