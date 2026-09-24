import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../src/auth';
import {
  usePortalJobs,
  usePortalPendingEstimates,
  usePortalVehicles,
} from '../../../src/modules/portal/hooks';
import { DashboardWidget } from '../../../src/ui/DashboardWidget';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const jobsQuery = usePortalJobs();
  const vehiclesQuery = usePortalVehicles();
  const estimatesQuery = usePortalPendingEstimates();

  const activeJobs = (jobsQuery.data ?? []).filter(
    (j) => !['delivered', 'closed', 'cancelled'].includes(j.status),
  ).length;

  return (
    <Screen>
      <Text style={styles.kicker}>Customer portal</Text>
      <Text style={styles.title}>
        Hello{user?.displayName ? `, ${user.displayName}` : ''}
      </Text>
      <Text style={styles.body}>Track service status, approve estimates, and view vehicles.</Text>

      <View style={styles.grid}>
        <DashboardWidget label="Active jobs" value={String(activeJobs)} hint="In workshop" />
        <DashboardWidget
          label="Pending approvals"
          value={String(estimatesQuery.data?.length ?? 0)}
          hint="Estimates"
        />
        <DashboardWidget
          label="Vehicles"
          value={String(vehiclesQuery.data?.length ?? 0)}
          hint="Registered"
        />
        <DashboardWidget label="Invoices due" value="—" hint="Coming soon" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.accent,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
    marginBottom: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
