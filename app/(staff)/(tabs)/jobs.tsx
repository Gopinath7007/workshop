import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useJobCards } from '../../../src/modules/job-cards/hooks';
import type { JobCard, JobCardStatus } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
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

  const columns = useMemo<DataTableColumn<JobCard>[]>(
    () => [
      {
        key: 'number',
        title: 'Job #',
        minWidth: 130,
        render: (row) => <Text style={styles.cellAccent}>{row.jobNumber}</Text>,
      },
      {
        key: 'status',
        title: 'Status',
        minWidth: 140,
        render: (row) => <Text style={styles.cellPrimary}>{STATUS_LABEL[row.status]}</Text>,
      },
      {
        key: 'complaints',
        title: 'Complaint',
        minWidth: 220,
        render: (row) => (
          <Text style={styles.cellMuted} numberOfLines={1}>
            {row.complaints ?? '—'}
          </Text>
        ),
      },
      {
        key: 'est',
        title: 'Est. cost',
        width: 110,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>₹{row.estimatedCost.toLocaleString('en-IN')}</Text>
        ),
      },
      {
        key: 'updated',
        title: 'Updated',
        minWidth: 110,
        render: (row) => (
          <Text style={styles.cellMuted}>{row.updatedAt.slice(0, 10)}</Text>
        ),
      },
    ],
    [],
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
      ) : (
        <DataTable
          columns={columns}
          rows={jobs}
          emptyMessage="No open jobs yet. Create a job card to start."
          onView={(row) => router.push(`/(staff)/job-cards/${row.id}`)}
          onEdit={
            can('job_cards.update')
              ? (row) => router.push(`/(staff)/job-cards/${row.id}`)
              : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  section: { color: colors.text, fontWeight: '700', marginTop: space.sm },
  pipeline: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    minWidth: 100,
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  chipCount: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
});
