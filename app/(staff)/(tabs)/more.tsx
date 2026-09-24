import { StyleSheet, Text, View } from 'react-native';
import { ROLE_LABELS } from '../../../src/config/architecture';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { permissionsForRoles } from '../../../src/modules/rbac/permissions';
import { STAFF_MORE_LINKS } from '../../../src/navigation/staffNav';
import { getDataMode } from '../../../src/repositories';
import { useSessionStore } from '../../../src/store/sessionStore';
import type { SystemRole } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { MenuLink } from '../../../src/ui/MenuLink';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

const DEMO_ROLES: SystemRole[] = [
  'owner',
  'branch_manager',
  'service_advisor',
  'technician',
  'accountant',
  'store_manager',
  'hr_manager',
  'receptionist',
  'customer',
];

export default function MoreTabScreen() {
  const { canAny, roles } = usePermissions();
  const setContext = useSessionStore((s) => s.setContext);
  const organizationId = useSessionStore((s) => s.organizationId);
  const organizationName = useSessionStore((s) => s.organizationName);
  const branchId = useSessionStore((s) => s.branchId);
  const dataMode = getDataMode();

  const links = STAFF_MORE_LINKS.filter(
    (link) => link.gates.length === 0 || canAny(link.gates),
  );

  const switchRole = (role: SystemRole) => {
    if (!organizationId) return;
    setContext({
      organizationId,
      branchId,
      roles: [role],
      permissions: permissionsForRoles([role]),
      organizationName,
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>More</Text>
      <Text style={styles.meta}>
        Workshop: {organizationName ?? '—'}
      </Text>
      <Text style={styles.meta}>
        Active role: {roles.map((r) => ROLE_LABELS[r]).join(', ') || '—'}
      </Text>
      <Text style={styles.meta}>
        Data: {dataMode === 'supabase' ? 'Supabase Postgres (tenant-isolated)' : 'Local device'}
      </Text>
      {organizationId ? (
        <Text style={styles.hint}>
          Org {organizationId.slice(0, 8)}… · Branch {branchId?.slice(0, 8) ?? '—'}…
        </Text>
      ) : null}

      <View style={styles.list}>
        {links.map((link) => (
          <MenuLink
            key={String(link.href)}
            href={String(link.href)}
            title={link.title}
            subtitle={link.subtitle}
          />
        ))}
      </View>

      <Text style={styles.section}>Dev role switcher</Text>
      <Text style={styles.hint}>
        UI-only. Server RLS still uses your DB role (owner after bootstrap).
      </Text>
      <View style={styles.roles}>
        {DEMO_ROLES.map((role) => (
          <Button
            key={role}
            label={ROLE_LABELS[role]}
            variant={roles.includes(role) ? 'primary' : 'ghost'}
            onPress={() => switchRole(role)}
          />
        ))}
      </View>
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
  list: {
    gap: space.sm,
  },
  section: {
    color: colors.text,
    fontWeight: '700',
    marginTop: space.md,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
  roles: {
    gap: space.sm,
  },
});
