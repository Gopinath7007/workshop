import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePortalInvoices } from '../../../src/modules/portal/hooks';
import type { Invoice } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

export default function CustomerInvoicesScreen() {
  const invoicesQuery = usePortalInvoices();
  const [viewing, setViewing] = useState<Invoice | null>(null);

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
        width: 110,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>₹{row.amountDue.toLocaleString('en-IN')}</Text>
        ),
      },
    ],
    [],
  );

  return (
    <Screen>
      <Text style={styles.title}>Invoices</Text>
      <Text style={styles.body}>GST invoices linked to your customer profile.</Text>

      {invoicesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={invoicesQuery.data ?? []}
          emptyMessage="No invoices yet. Ask the workshop after a completed job."
          onView={setViewing}
        />
      )}

      {viewing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{viewing.invoiceNumber}</Text>
          <Text style={styles.meta}>Date: {viewing.invoiceDate}</Text>
          <Text style={styles.meta}>Status: {viewing.status}</Text>
          <Text style={styles.meta}>
            Total ₹{viewing.totalAmount.toLocaleString('en-IN')} · Paid ₹
            {viewing.amountPaid.toLocaleString('en-IN')} · Due ₹
            {viewing.amountDue.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.meta}>
            CGST ₹{viewing.cgstAmount.toLocaleString('en-IN')} · SGST ₹
            {viewing.sgstAmount.toLocaleString('en-IN')}
          </Text>
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
});
