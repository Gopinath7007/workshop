import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useJobCards } from '../../../src/modules/job-cards/hooks';
import type { JobCardStatus } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: 'Open',
  inspection: 'Inspection',
  waiting_approval: 'Waiting approval',
  in_progress: 'In progress',
  parts_pending: 'Parts pending',
  qc: 'QC',
  ready_delivery: 'Ready delivery',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const PIPELINE: JobCardStatus[] = [
  'open',
  'inspection',
  'waiting_approval',
  'in_progress',
  'parts_pending',
  'qc',
  'ready_delivery',
  'delivered',
];

export default function JobsTabScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const jobsQuery = useJobCards();
  const jobs = jobsQuery.data ?? [];

  const counts = PIPELINE.reduce(
    (acc, status) => {
      acc[status] = jobs.filter((j) => j.status === status).length;
      return acc;
    },
    {} as Record<JobCardStatus, number>,
  );

  return (
    <Screen>
      <Text style={styles.title}>Job Cards</Text>
      <Text style={styles.body}>Vehicle entry → delivery workflow</Text>

      {can('job_cards.create') ? (
        <Button label="Create job card" onPress={() => router.push('/(staff)/job-cards/create')} />
      ) : null}

      <Text style={styles.section}>Pipeline</Text>
      <View style={styles.pipeline}>
        {PIPELINE.map((status) => (
          <View key={status} style={styles.chip}>
            <Text style={styles.chipText}>{STATUS_LABEL[status]}</Text>
            <Text style={styles.chipCount}>{counts[status] ?? 0}</Text>
          </View>
        ))}
      </View>

      {jobsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : jobs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No open jobs yet</Text>
          <Text style={styles.emptyBody}>Create a job card to start the vertical slice.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {jobs.map((job) => (
            <Pressable
              key={job.id}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/(staff)/job-cards/${job.id}`)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{job.jobNumber}</Text>
                <Text style={styles.rowMeta}>
                  {STATUS_LABEL[job.status]}
                  {job.complaints ? ` · ${job.complaints.slice(0, 40)}` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  section: {
    color: colors.text,
    fontWeight: '700',
    marginTop: space.sm,
  },
  pipeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    minWidth: 100,
  },
  chipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  chipCount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  empty: {
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: space.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.muted,
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  pressed: {
    opacity: 0.85,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
  },
});
