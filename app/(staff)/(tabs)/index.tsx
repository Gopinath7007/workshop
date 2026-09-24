import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS } from '../../../src/config/architecture';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useAttendanceSummary } from '../../../src/modules/hr/hooks';
import { useReorderAlertCount } from '../../../src/modules/inventory/hooks';
import { useJobCards } from '../../../src/modules/job-cards/hooks';
import { getInvoiceRepository } from '../../../src/repositories';
import { DashboardWidget } from '../../../src/ui/DashboardWidget';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { roles, can, organizationId, branchId } = usePermissions();
  const roleLabel = roles.map((r) => ROLE_LABELS[r]).join(', ') || 'Staff';
  const jobsQuery = useJobCards();
  const jobs = jobsQuery.data ?? [];
  const today = startOfTodayIso();
  const alertsQuery = useReorderAlertCount();
  const attendanceSummaryQuery = useAttendanceSummary();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'dashboard', organizationId, branchId],
    enabled: Boolean(organizationId) && can('billing.read'),
    queryFn: () =>
      getInvoiceRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 100,
      }),
  });

  const bookingsToday = jobs.filter((j) => j.createdAt >= today).length;
  const inService = jobs.filter((j) =>
    ['inspection', 'waiting_approval', 'in_progress', 'parts_pending', 'qc'].includes(j.status),
  ).length;
  const deliveries = jobs.filter((j) =>
    ['ready_delivery', 'delivered'].includes(j.status),
  ).length;
  const pendingBills = (invoicesQuery.data ?? []).filter((i) => i.amountDue > 0);
  const pendingCount = pendingBills.length;
  const revenueToday = (invoicesQuery.data ?? [])
    .filter((i) => i.invoiceDate === new Date().toISOString().slice(0, 10))
    .reduce((sum, i) => sum + i.amountPaid, 0);

  return (
    <Screen>
      <Text style={styles.kicker}>Workshop</Text>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.meta}>{roleLabel} · Today</Text>

      <View style={styles.grid}>
        {can('job_cards.read') ? (
          <DashboardWidget
            label="Today's bookings"
            value={String(bookingsToday)}
            hint="Job cards"
            onPress={() => router.push('/(staff)/(tabs)/jobs')}
          />
        ) : null}
        {can('job_cards.read') ? (
          <DashboardWidget
            label="In service"
            value={String(inService)}
            hint="Open jobs"
            onPress={() => router.push('/(staff)/(tabs)/jobs')}
          />
        ) : null}
        {can('job_cards.read') ? (
          <DashboardWidget label="Deliveries" value={String(deliveries)} hint="Ready / delivered" />
        ) : null}
        {can('billing.read') ? (
          <DashboardWidget
            label="Pending bills"
            value={String(pendingCount)}
            hint="Amount due"
            onPress={() => router.push('/(staff)/billing')}
          />
        ) : null}
        {can('billing.read') ? (
          <DashboardWidget
            label="Revenue"
            value={`₹${revenueToday.toLocaleString('en-IN')}`}
            hint="Paid today"
          />
        ) : null}
        {can('employees.read') ? (
          <DashboardWidget label="Technician KPI" value="—" hint="Jobs closed" />
        ) : null}
        {can('attendance.manage') || can('attendance.self') ? (
          <DashboardWidget
            label="Attendance"
            value={String(attendanceSummaryQuery.data?.present ?? 0)}
            hint="Present today"
            onPress={() => router.push('/(staff)/attendance')}
          />
        ) : null}
        {can('inventory.read') ? (
          <DashboardWidget
            label="Stock alerts"
            value={String(alertsQuery.data ?? 0)}
            hint="Below reorder"
            onPress={() => router.push('/(staff)/inventory')}
          />
        ) : null}
        {can('reports.view') ? (
          <DashboardWidget
            label="Branch score"
            value="—"
            hint="Performance"
            onPress={() => router.push('/(staff)/reports')}
          />
        ) : null}
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
  meta: {
    color: colors.muted,
    marginBottom: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
