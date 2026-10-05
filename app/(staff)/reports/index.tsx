import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useJobCards } from '../../../src/modules/job-cards/hooks';
import {
  buildReportSummary,
  dailyRevenueToCsv,
  REPORT_RANGE_LABELS,
  type DailyRevenue,
  type ReportRange,
  type StatusCount,
} from '../../../src/modules/reports/summary';
import { getInvoiceRepository } from '../../../src/repositories';
import { Button } from '../../../src/ui/Button';
import { DashboardWidget } from '../../../src/ui/DashboardWidget';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

const RANGES: ReportRange[] = ['today', '7d', '30d', 'all'];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const statusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function ReportsScreen() {
  const { can, organizationId, branchId } = usePermissions();
  const [range, setRange] = useState<ReportRange>('30d');
  const jobsQuery = useJobCards();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'reports', organizationId, branchId],
    enabled: Boolean(organizationId) && can('billing.read'),
    queryFn: () =>
      getInvoiceRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 500,
      }),
  });

  const summary = useMemo(
    () => buildReportSummary(jobsQuery.data ?? [], invoicesQuery.data ?? [], range),
    [jobsQuery.data, invoicesQuery.data, range],
  );

  const statusColumns = useMemo<DataTableColumn<StatusCount>[]>(
    () => [
      {
        key: 'status',
        title: 'Status',
        minWidth: 160,
        render: (row) => <Text style={styles.cellPrimary}>{statusLabel(row.status)}</Text>,
      },
      {
        key: 'count',
        title: 'Jobs',
        width: 90,
        align: 'right',
        render: (row) => <Text style={styles.cellAccent}>{row.count}</Text>,
      },
    ],
    [],
  );

  const revenueColumns = useMemo<DataTableColumn<DailyRevenue>[]>(
    () => [
      {
        key: 'date',
        title: 'Date',
        minWidth: 110,
        render: (row) => <Text style={styles.cellPrimary}>{row.date}</Text>,
      },
      {
        key: 'invoices',
        title: 'Invoices',
        width: 90,
        align: 'right',
        render: (row) => <Text style={styles.cellMuted}>{row.invoices}</Text>,
      },
      {
        key: 'billed',
        title: 'Billed',
        width: 120,
        align: 'right',
        render: (row) => <Text style={styles.cellPrimary}>{inr(row.billed)}</Text>,
      },
      {
        key: 'collected',
        title: 'Collected',
        width: 120,
        align: 'right',
        render: (row) => <Text style={styles.cellAccent}>{inr(row.collected)}</Text>,
      },
      {
        key: 'gst',
        title: 'GST',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellMuted}>{inr(row.gst)}</Text>,
      },
    ],
    [],
  );

  if (!can('reports.view')) {
    return <Redirect href="/(staff)/(tabs)" />;
  }

  const exportCsv = () => {
    const csv = dailyRevenueToCsv(summary.dailyRevenue);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    Alert.alert('CSV export', 'CSV download is available on the web dashboard.');
  };

  const loading = jobsQuery.isLoading || invoicesQuery.isLoading;

  return (
    <Screen>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.body}>Revenue, GST, and job throughput for this workshop.</Text>

      <View style={styles.ranges}>
        {RANGES.map((r) => (
          <Button
            key={r}
            label={REPORT_RANGE_LABELS[r]}
            variant={range === r ? 'primary' : 'ghost'}
            onPress={() => setRange(r)}
          />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.grid}>
            <DashboardWidget label="Billed" value={inr(summary.billed)} hint={`${summary.invoiceCount} invoices`} />
            <DashboardWidget label="Collected" value={inr(summary.collected)} hint="Payments received" />
            <DashboardWidget label="Outstanding" value={inr(summary.outstanding)} hint="Amount due" />
            <DashboardWidget label="Avg ticket" value={inr(summary.averageTicket)} hint="Per invoice" />
            <DashboardWidget label="Jobs created" value={String(summary.jobsCreated)} hint={`${summary.jobsDelivered} delivered`} />
            <DashboardWidget
              label="GST collected"
              value={inr(summary.cgst + summary.sgst + summary.igst)}
              hint={`CGST ${inr(summary.cgst)} · SGST ${inr(summary.sgst)} · IGST ${inr(summary.igst)}`}
            />
          </View>

          <Text style={styles.section}>Daily revenue</Text>
          {can('reports.export') ? (
            <Button label="Export CSV" variant="ghost" onPress={exportCsv} />
          ) : null}
          <DataTable
            columns={revenueColumns}
            rows={summary.dailyRevenue}
            emptyMessage="No invoices in this range."
          />

          <Text style={styles.section}>Jobs by status</Text>
          <DataTable
            columns={statusColumns}
            rows={summary.jobsByStatus}
            emptyMessage="No job cards in this range."
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: space.md },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
});
