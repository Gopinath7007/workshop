import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ROLE_LABELS } from '../../../src/config/architecture';
import { usePermissions } from '../../../src/hooks/usePermissions';
import {
  createWorkshopInvite,
  setActiveWorkshop,
} from '../../../src/services/sessionService';
import { useSessionStore } from '../../../src/store/sessionStore';
import type { SystemRole } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

const INVITE_ROLES: SystemRole[] = [
  'service_advisor',
  'technician',
  'accountant',
  'store_manager',
  'receptionist',
  'branch_manager',
  'customer',
];

export default function WorkshopSettingsScreen() {
  const { can } = usePermissions();
  const organizationId = useSessionStore((s) => s.organizationId);
  const organizationName = useSessionStore((s) => s.organizationName);
  const branchId = useSessionStore((s) => s.branchId);
  const memberships = useSessionStore((s) => s.memberships);
  const setContext = useSessionStore((s) => s.setContext);
  const [inviteRole, setInviteRole] = useState<SystemRole>('service_advisor');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generateInvite = async () => {
    setBusy(true);
    try {
      const invite = await createWorkshopInvite({ roleId: inviteRole });
      setLastCode(invite.code);
      Alert.alert('Invite ready', `Share code ${invite.code} with your team.`);
    } catch (error) {
      Alert.alert('Invite failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const switchOrg = async (orgId: string, nextBranchId: string | null) => {
    setBusy(true);
    try {
      const ctx = await setActiveWorkshop(orgId, nextBranchId);
      setContext({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        roles: ctx.roles,
        permissions: ctx.permissions,
        organizationName: ctx.organizationName,
        memberships: ctx.memberships,
        needsOnboarding: false,
      });
      Alert.alert('Switched', ctx.organizationName ?? 'Workshop');
    } catch (error) {
      Alert.alert('Switch failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Workshop</Text>
      <Text style={styles.body}>
        Multi-tenant SaaS: each workshop keeps its own users, vehicles, jobs, and invoices.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{organizationName ?? 'Current workshop'}</Text>
        <Text style={styles.meta}>Org {organizationId}</Text>
        <Text style={styles.meta}>Branch {branchId ?? '—'}</Text>
      </View>

      {can('rbac.manage') ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Invite staff</Text>
          <Text style={styles.meta}>
            Generate a code so advisors or technicians join this workshop only — they cannot see
            other tenants.
          </Text>
          <View style={styles.roles}>
            {INVITE_ROLES.map((role) => (
              <Button
                key={role}
                label={ROLE_LABELS[role]}
                variant={inviteRole === role ? 'primary' : 'ghost'}
                onPress={() => setInviteRole(role)}
              />
            ))}
          </View>
          <Button label="Generate invite code" onPress={() => void generateInvite()} loading={busy} />
          {lastCode ? (
            <Text style={styles.code}>Code: {lastCode}</Text>
          ) : null}
        </View>
      ) : null}

      {memberships.length > 1 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Your workshops</Text>
          {memberships.map((m) => (
            <Button
              key={`${m.organizationId}-${m.roleId}`}
              label={`${m.organizationName} (${ROLE_LABELS[m.roleId]})`}
              variant={m.organizationId === organizationId ? 'primary' : 'ghost'}
              onPress={() => void switchOrg(m.organizationId, m.branchId)}
              disabled={busy}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 13 },
  roles: { gap: space.xs },
  code: { color: colors.accent, fontWeight: '800', fontSize: 18, letterSpacing: 1 },
});
