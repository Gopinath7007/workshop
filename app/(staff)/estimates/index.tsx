import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useEstimates } from '../../../src/modules/estimates/hooks';
import type { Estimate } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

export default function EstimatesScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<Estimate | null>(null);
  const estimatesQuery = useEstimates(search);

  const columns = useMemo<DataTableColumn<Estimate>[]>(
    () => [
      {
        key: 'number',
        title: 'Estimate #',
        minWidth: 140,
        render: (row) => <Text style={styles.cellAccent}>{row.estimateNumber}</Text>,
      },
      {
        key: 'status',
        title: 'Status',
        minWidth: 110,
        render: (row) => <Text style={styles.cellPrimary}>{row.status}</Text>,
      },
      {
        key: 'subtotal',
        title: 'Subtotal',
        width: 110,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>₹{row.subtotal.toLocaleString('en-IN')}</Text>
        ),
      },
      {
        key: 'gst',
        title: 'GST',
        width: 110,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>
            ₹{(row.cgstAmount + row.sgstAmount + row.igstAmount).toLocaleString('en-IN')}
          </Text>
        ),
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
    ],
    [],
  );

  return (
    <Screen>
      <Text style={styles.title}>Estimates</Text>
      <Text style={styles.body}>
        Labor, parts, and GST totals. Create estimates from a job card.
      </Text>
      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Estimate number"
      />

      {estimatesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={estimatesQuery.data ?? []}
          emptyMessage="No estimates yet. Open a job card and add one."
          onView={setViewing}
          onEdit={
            can('estimates.manage')
              ? (row) => router.push(`/(staff)/job-cards/${row.jobCardId}`)
              : undefined
          }
        />
      )}

      {viewing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{viewing.estimateNumber}</Text>
          <Text style={styles.meta}>Status: {viewing.status}</Text>
          <Text style={styles.meta}>
            Subtotal ₹{viewing.subtotal.toLocaleString('en-IN')} · Discount ₹
            {viewing.discountAmount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.meta}>
            CGST ₹{viewing.cgstAmount.toLocaleString('en-IN')} · SGST ₹
            {viewing.sgstAmount.toLocaleString('en-IN')} · IGST ₹
            {viewing.igstAmount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.meta}>
            Total ₹{viewing.totalAmount.toLocaleString('en-IN')}
          </Text>
          <Button
            label="Open job card"
            onPress={() => router.push(`/(staff)/job-cards/${viewing.jobCardId}`)}
          />
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
