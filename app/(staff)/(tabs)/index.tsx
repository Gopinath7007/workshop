import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAuth } from '../../../src/auth';
import { ROLE_LABELS } from '../../../src/config/architecture';
import { usePermissions } from '../../../src/hooks/usePermissions';
import {
  buildDashboardInsights,
  chartPalette,
  jobStageColor as stageColor,
  type ChartSlice,
} from '../../../src/modules/dashboard/insights';
import { useAttendanceSummary } from '../../../src/modules/hr/hooks';
import { useReorderAlertCount } from '../../../src/modules/inventory/hooks';
import { useJobCards } from '../../../src/modules/job-cards/hooks';
import { getInvoiceRepository } from '../../../src/repositories';
import { useSessionStore } from '../../../src/store/sessionStore';
import { BarChart } from '../../../src/ui/charts/BarChart';
import { ChartCard } from '../../../src/ui/charts/ChartCard';
import { DonutChart } from '../../../src/ui/charts/DonutChart';
import { DashboardWidget } from '../../../src/ui/DashboardWidget';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const statusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { roles, can, organizationId, branchId } = usePermissions();
  const organizationName = useSessionStore((s) => s.organizationName);
  const roleLabel = roles.map((r) => ROLE_LABELS[r]).join(', ') || 'Staff';
  const jobsQuery = useJobCards();
  const alertsQuery = useReorderAlertCount();
  const attendanceQuery = useAttendanceSummary();
  const canBilling = can('billing.read');
  const canJobs = can('job_cards.read');
  const canAttendance = can('attendance.manage') || can('attendance.self');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'dashboard', organizationId, branchId],
    enabled: Boolean(organizationId) && canBilling,
    queryFn: () =>
      getInvoiceRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 500,
      }),
  });

  const now = new Date();
  const jobs = jobsQuery.data ?? [];
  const insights = useMemo(
    () => buildDashboardInsights(jobsQuery.data ?? [], invoicesQuery.data ?? []),
    [jobsQuery.data, invoicesQuery.data],
  );

  const attendanceSlices: ChartSlice[] = useMemo(() => {
    const a = attendanceQuery.data;
    return [
      { key: 'present', label: 'On time', value: Math.max(0, (a?.present ?? 0) - (a?.late ?? 0)), color: chartPalette.emerald },
      { key: 'late', label: 'Late', value: a?.late ?? 0, color: chartPalette.amber },
      { key: 'leave', label: 'On leave', value: a?.onLeave ?? 0, color: chartPalette.violet },
      { key: 'absent', label: 'Absent', value: a?.absent ?? 0, color: chartPalette.rose },
    ];
  }, [attendanceQuery.data]);

  const recentJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [jobs],
  );

  const loading = jobsQuery.isLoading || (canBilling && invoicesQuery.isLoading);
  const firstName = user?.displayName?.split(' ')[0];

  return (
    <Screen>
      <View style={styles.hero}>
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0EA5E9" stopOpacity="0.95" />
              <Stop offset="0.55" stopColor="#6366F1" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#A855F7" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#hero)" />
          <Circle cx="92" cy="8" r="28" fill="#FFFFFF" fillOpacity="0.08" />
          <Circle cx="78" cy="100" r="22" fill="#FFFFFF" fillOpacity="0.06" />
        </Svg>
        <View style={styles.heroBody}>
          <View style={styles.heroText}>
            <Text style={styles.heroKicker}>{organizationName ?? 'Workshop'}</Text>
            <Text style={styles.heroTitle}>
              {greeting(now)}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={styles.heroMeta}>
              {roleLabel} ·{' '}
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          {canBilling ? (
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Collected today</Text>
              <Text style={styles.heroStatValue}>{inr(insights.revenueToday)}</Text>
              <Text style={styles.heroStatHint}>This week {inr(insights.collectedThisWeek)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.quickActions}>
          {can('job_cards.create') ? (
            <QuickAction icon="add-circle-outline" label="New job card" onPress={() => router.push('/(staff)/job-cards/create')} />
          ) : null}
          {can('customers.create') ? (
            <QuickAction icon="person-add-outline" label="Add customer" onPress={() => router.push('/(staff)/customers/create')} />
          ) : null}
          {canBilling ? (
            <QuickAction icon="receipt-outline" label="Billing" onPress={() => router.push('/(staff)/billing')} />
          ) : null}
          {can('reports.view') ? (
            <QuickAction icon="stats-chart-outline" label="Reports" onPress={() => router.push('/(staff)/reports')} />
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.grid}>
            {canJobs ? (
              <DashboardWidget
                label="Today's bookings"
                value={String(insights.bookingsToday)}
                hint="New job cards"
                icon="calendar-outline"
                tone={chartPalette.sky}
                onPress={() => router.push('/(staff)/(tabs)/jobs')}
              />
            ) : null}
            {canJobs ? (
              <DashboardWidget
                label="In service"
                value={String(insights.openJobs)}
                hint={`${insights.readyForDelivery} ready for delivery`}
                icon="construct-outline"
                tone={chartPalette.violet}
                onPress={() => router.push('/(staff)/(tabs)/jobs')}
              />
            ) : null}
            {canBilling ? (
              <DashboardWidget
                label="Billed this week"
                value={inr(insights.billedThisWeek)}
                hint="vs previous 7 days"
                trend={insights.weekTrendPct}
                icon="trending-up-outline"
                tone={chartPalette.emerald}
                onPress={() => router.push('/(staff)/reports')}
              />
            ) : null}
            {canBilling ? (
              <DashboardWidget
                label="Outstanding"
                value={inr(insights.outstanding)}
                hint={`${insights.pendingInvoices} unpaid bills`}
                icon="wallet-outline"
                tone={chartPalette.rose}
                onPress={() => router.push('/(staff)/billing')}
              />
            ) : null}
            {canJobs ? (
              <DashboardWidget
                label="Delivered"
                value={String(insights.deliveredThisWeek)}
                hint="Last 7 days"
                icon="checkmark-done-outline"
                tone={chartPalette.teal}
              />
            ) : null}
            {canAttendance ? (
              <DashboardWidget
                label="Staff present"
                value={`${attendanceQuery.data?.present ?? 0}`}
                hint={`${attendanceQuery.data?.late ?? 0} late today`}
                icon="people-outline"
                tone={chartPalette.amber}
                onPress={() => router.push('/(staff)/attendance')}
              />
            ) : null}
            {can('inventory.read') ? (
              <DashboardWidget
                label="Stock alerts"
                value={String(alertsQuery.data ?? 0)}
                hint="Below reorder level"
                icon="cube-outline"
                tone={(alertsQuery.data ?? 0) > 0 ? chartPalette.orange : chartPalette.slate}
                onPress={() => router.push('/(staff)/inventory')}
              />
            ) : null}
            {canBilling ? (
              <DashboardWidget
                label="Collection rate"
                value={`${insights.collectionRate}%`}
                hint="Of all billed amount"
                icon="pie-chart-outline"
                tone={chartPalette.sky}
              />
            ) : null}
          </View>

          <View style={styles.grid}>
            {canBilling ? (
              <ChartCard
                wide
                title="Revenue · last 7 days"
                subtitle={`Billed ${inr(insights.billedThisWeek)} · Collected ${inr(insights.collectedThisWeek)}`}
                actionLabel="Reports"
                onAction={() => router.push('/(staff)/reports')}
              >
                <BarChart data={insights.last7Days} />
              </ChartCard>
            ) : null}

            {canJobs ? (
              <ChartCard
                title="Job pipeline"
                subtitle="All job cards by stage"
                actionLabel="Jobs"
                onAction={() => router.push('/(staff)/(tabs)/jobs')}
              >
                <DonutChart data={insights.jobStages} centerLabel="jobs" />
              </ChartCard>
            ) : null}

            {canBilling ? (
              <ChartCard title="Payment collection" subtitle="Collected vs outstanding">
                <DonutChart
                  data={insights.collection}
                  formatValue={inr}
                  centerValue={`${insights.collectionRate}%`}
                  centerLabel="collected"
                />
              </ChartCard>
            ) : null}

            {canBilling ? (
              <ChartCard
                title="Invoice status"
                subtitle="Issued invoices"
                actionLabel="Billing"
                onAction={() => router.push('/(staff)/billing')}
              >
                <DonutChart data={insights.invoiceStatus} centerLabel="invoices" />
              </ChartCard>
            ) : null}

            {canAttendance ? (
              <ChartCard
                title="Attendance today"
                subtitle={`${attendanceQuery.data?.total ?? 0} marked`}
                actionLabel="Attendance"
                onAction={() => router.push('/(staff)/attendance')}
              >
                <DonutChart data={attendanceSlices} centerLabel="staff" />
              </ChartCard>
            ) : null}

            {canJobs ? (
              <ChartCard
                title="Recent job cards"
                subtitle="Latest 5"
                actionLabel="All jobs"
                onAction={() => router.push('/(staff)/(tabs)/jobs')}
              >
                {recentJobs.length === 0 ? (
                  <Text style={styles.muted}>No job cards yet. Create one to get started.</Text>
                ) : (
                  recentJobs.map((job) => (
                    <Pressable
                      key={job.id}
                      onPress={() => router.push(`/(staff)/job-cards/${job.id}`)}
                      style={({ pressed }) => [styles.jobRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.jobDot, { backgroundColor: stageColor(job.status) }]} />
                      <View style={styles.jobText}>
                        <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                        <Text style={styles.muted} numberOfLines={1}>
                          {job.complaints || 'No complaint noted'}
                        </Text>
                      </View>
                      <View style={[styles.pill, { borderColor: stageColor(job.status) }]}>
                        <Text style={[styles.pillText, { color: stageColor(job.status) }]}>
                          {statusLabel(job.status)}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </ChartCard>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color="#FFFFFF" />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: space.lg,
    gap: space.md,
  },
  heroBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.md,
  },
  heroText: { gap: 4, flexShrink: 1 },
  heroKicker: {
    color: '#E0F2FE',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  heroMeta: { color: '#E0E7FF', fontSize: 13 },
  heroStat: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  heroStatLabel: { color: '#E0E7FF', fontSize: 12, fontWeight: '700' },
  heroStatValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  heroStatHint: { color: '#E0E7FF', fontSize: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  pressed: { opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  muted: { color: colors.muted, fontSize: 13 },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobDot: { width: 8, height: 8, borderRadius: 4 },
  jobText: { flex: 1, gap: 2 },
  jobNumber: { color: colors.text, fontWeight: '700' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
