import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePortalJobs } from '../../../src/modules/portal/hooks';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';
import type { JobCardStatus } from '../../../src/types';

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: 'Open',
  inspection: 'Inspection',
  waiting_approval: 'Waiting approval',
  in_progress: 'In progress',
  parts_pending: 'Parts pending',
  qc: 'Quality check',
  ready_delivery: 'Ready for delivery',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export default function CustomerJobsScreen() {
  const jobsQuery = usePortalJobs();

  return (
    <Screen>
      <Text style={styles.title}>Service status</Text>
      <Text style={styles.body}>Jobs linked to your customer profile (matched by email).</Text>

      {jobsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (jobsQuery.data ?? []).length === 0 ? (
        <Text style={styles.meta}>
          No jobs yet. Ask the workshop to use the same email on your customer record.
        </Text>
      ) : (
        <View style={styles.list}>
          {(jobsQuery.data ?? []).map((job) => (
            <View key={job.id} style={styles.card}>
              <Text style={styles.cardTitle}>{job.jobNumber}</Text>
              <Text style={styles.status}>{STATUS_LABEL[job.status]}</Text>
              {job.complaints ? <Text style={styles.meta}>{job.complaints}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  meta: { color: colors.muted },
  list: { gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
  status: { color: colors.accent, fontWeight: '700' },
});
