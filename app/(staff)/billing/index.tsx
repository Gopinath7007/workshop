import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { getInvoiceRepository } from '../../../src/repositories';
import type { Invoice } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

export default function BillingScreen() {
  const router = useRouter();
  const { organizationId, branchId, can } = usePermissions();
  const [viewing, setViewing] = useState<Invoice | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', organizationId, branchId],
    enabled: Boolean(organizationId) && can('billing.read'),
    queryFn: () =>
      getInvoiceRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 100,
      }),
  });

  const columns = useMemo<DataTableColumn<Invoice>[]>(
    () => [
      {
        key: 'number',
        title: 'Invoice #',
        minWidth: 140,
        render: (row) => <Text style={styles.cellAccent}>{row.invoiceNumber}</Text>,
      },
      {
        key: 'date',
        title: 'Date',
        minWidth: 110,
        render: (row) => <Text style={styles.cellMuted}>{row.invoiceDate}</Text>,
      },
      {
        key: 'status',
        title: 'Status',
        minWidth: 100,
        render: (row) => <Text style={styles.cellPrimary}>{row.status}</Text>,
      },
      {
        key: 'total',
        title: 'Total',
        width: 120,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellPrimary}>₹{row.totalAmount.toLocaleString('en-IN')}</Text>
        ),
      },
      {
        key: 'due',
        title: 'Due',
        width: 120,
        align: 'right',
        render: (row) => (
          <Text style={row.amountDue > 0 ? styles.cellDanger : styles.cellMuted}>
            ₹{row.amountDue.toLocaleString('en-IN')}
          </Text>
        ),
      },
    ],
    [],
  );

  return (
    <Screen>
      <Text style={styles.title}>Billing</Text>
      <Text style={styles.body}>GST invoices and payments from job cards.</Text>

      {invoicesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={invoicesQuery.data ?? []}
          emptyMessage="No invoices yet. Complete a job and generate one."
          onView={setViewing}
          onEdit={
            can('billing.manage')
              ? (row) => {
                  if (row.jobCardId) {
                    router.push(`/(staff)/job-cards/${row.jobCardId}`);
                  } else {
                    Alert.alert('Invoice', row.invoiceNumber);
                  }
                }
              : undefined
          }
        />
      )}

      {viewing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{viewing.invoiceNumber}</Text>
          <Text style={styles.meta}>Status: {viewing.status}</Text>
          <Text style={styles.meta}>Date: {viewing.invoiceDate}</Text>
          <Text style={styles.meta}>
            Subtotal ₹{viewing.subtotal.toLocaleString('en-IN')} · CGST ₹
            {viewing.cgstAmount.toLocaleString('en-IN')} · SGST ₹
            {viewing.sgstAmount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.meta}>
            Total ₹{viewing.totalAmount.toLocaleString('en-IN')} · Paid ₹
            {viewing.amountPaid.toLocaleString('en-IN')} · Due ₹
            {viewing.amountDue.toLocaleString('en-IN')}
          </Text>
          {viewing.jobCardId ? (
            <Button
              label="Open job card"
              onPress={() => router.push(`/(staff)/job-cards/${viewing.jobCardId}`)}
            />
          ) : null}
          <Button label="Close" variant="ghost" onPress={() => setViewing(null)} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  meta: { color: colors.muted, fontSize: 13 },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
  cellDanger: { color: colors.danger, fontWeight: '700' },
});
