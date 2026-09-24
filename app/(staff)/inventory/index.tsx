import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import {
  createPartSchema,
  stockAdjustSchema,
  type CreatePartForm,
  type StockAdjustForm,
} from '../../../src/modules/inventory/schemas';
import {
  useAdjustStock,
  useCreatePart,
  useInventoryParts,
  useStockMovements,
} from '../../../src/modules/inventory/hooks';
import type { PartStockRow } from '../../../src/repositories';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

function formatInr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function InventoryScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<PartStockRow | null>(null);
  const [adjusting, setAdjusting] = useState<PartStockRow | null>(null);
  const [adjustMode, setAdjustMode] = useState<'stock_in' | 'stock_out'>('stock_in');

  const partsQuery = useInventoryParts(search);
  const movementsQuery = useStockMovements();
  const createPart = useCreatePart();
  const adjustStock = useAdjustStock();

  const createForm = useForm<CreatePartForm>({
    resolver: zodResolver(createPartSchema),
    defaultValues: {
      name: '',
      sku: '',
      partNumber: '',
      barcode: '',
      costPrice: 0,
      sellingPrice: 0,
      reorderLevel: 5,
      openingStock: 0,
      gstPercent: 18,
    },
  });

  const adjustForm = useForm<StockAdjustForm>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { quantity: 1, notes: '' },
  });

  const columns = useMemo<DataTableColumn<PartStockRow>[]>(
    () => [
      {
        key: 'sku',
        title: 'SKU',
        minWidth: 120,
        render: (row) => <Text style={styles.cellMono}>{row.sku}</Text>,
      },
      {
        key: 'name',
        title: 'Part',
        minWidth: 200,
        render: (row) => (
          <View>
            <Text style={styles.cellPrimary}>{row.name}</Text>
            {row.partNumber ? <Text style={styles.cellMuted}>{row.partNumber}</Text> : null}
          </View>
        ),
      },
      {
        key: 'qty',
        title: 'Qty',
        width: 88,
        align: 'right',
        render: (row) => (
          <Text style={[styles.cellPrimary, row.belowReorder && styles.cellDanger]}>
            {row.quantityOnHand}
          </Text>
        ),
      },
      {
        key: 'reorder',
        title: 'Reorder',
        width: 88,
        align: 'right',
        render: (row) => <Text style={styles.cellMuted}>{row.reorderLevel}</Text>,
      },
      {
        key: 'cost',
        title: 'Cost',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellMuted}>{formatInr(row.costPrice)}</Text>,
      },
      {
        key: 'sell',
        title: 'Sell',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellPrimary}>{formatInr(row.sellingPrice)}</Text>,
      },
      {
        key: 'status',
        title: 'Status',
        minWidth: 110,
        render: (row) => (
          <Text style={row.belowReorder ? styles.badgeDanger : styles.badgeOk}>
            {row.belowReorder ? 'Reorder' : 'OK'}
          </Text>
        ),
      },
    ],
    [],
  );

  if (!can('inventory.read') && !can('inventory.manage')) {
    return <Redirect href="/(staff)/(tabs)" />;
  }

  const onCreate = createForm.handleSubmit(async (values) => {
    try {
      await createPart.mutateAsync(values);
      createForm.reset();
      setShowCreate(false);
      Alert.alert('Part added', values.name);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : String(error));
    }
  });

  const onAdjust = adjustForm.handleSubmit(async (values) => {
    if (!adjusting) return;
    try {
      await adjustStock.mutateAsync({
        partId: adjusting.id,
        movementType: adjustMode,
        quantity: values.quantity,
        notes: values.notes,
      });
      setAdjusting(null);
      adjustForm.reset({ quantity: 1, notes: '' });
    } catch (error) {
      Alert.alert('Stock update failed', error instanceof Error ? error.message : String(error));
    }
  });

  const openEdit = (part: PartStockRow) => {
    setViewing(null);
    setAdjusting(part);
    setAdjustMode('stock_in');
  };

  const openView = (part: PartStockRow) => {
    setAdjusting(null);
    setViewing(part);
  };

  const parts = partsQuery.data ?? [];

  return (
    <Screen>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.body}>
        Branch stock in table view on web. Use view / edit actions on each row.
      </Text>

      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="SKU, name, barcode"
      />

      {can('inventory.manage') ? (
        <Button
          label={showCreate ? 'Hide add part' : 'Add part'}
          variant={showCreate ? 'ghost' : 'primary'}
          onPress={() => setShowCreate((v) => !v)}
        />
      ) : null}

      {showCreate ? (
        <View style={styles.panel}>
          <Controller
            control={createForm.control}
            name="name"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Part name"
                value={value}
                onChangeText={onChange}
                error={createForm.formState.errors.name?.message}
              />
            )}
          />
          <Controller
            control={createForm.control}
            name="sku"
            render={({ field: { value, onChange } }) => (
              <TextField label="SKU" value={value ?? ''} onChangeText={onChange} />
            )}
          />
          <Controller
            control={createForm.control}
            name="costPrice"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Cost (₹)"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="numeric"
              />
            )}
          />
          <Controller
            control={createForm.control}
            name="sellingPrice"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Sell (₹)"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="numeric"
              />
            )}
          />
          <Controller
            control={createForm.control}
            name="openingStock"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Opening stock"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="number-pad"
              />
            )}
          />
          <Controller
            control={createForm.control}
            name="reorderLevel"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Reorder level"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="number-pad"
              />
            )}
          />
          <Button label="Save part" onPress={() => void onCreate()} loading={createPart.isPending} />
        </View>
      ) : null}

      {partsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={parts}
          emptyMessage="No parts yet"
          getRowHighlight={(row) => row.belowReorder}
          onView={openView}
          onEdit={can('inventory.manage') ? openEdit : undefined}
        />
      )}

      {viewing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>View · {viewing.name}</Text>
          <Text style={styles.meta}>SKU {viewing.sku}</Text>
          <Text style={styles.meta}>Part no. {viewing.partNumber ?? '—'}</Text>
          <Text style={styles.meta}>Barcode {viewing.barcode ?? '—'}</Text>
          <Text style={styles.meta}>
            Qty {viewing.quantityOnHand} · Reorder at {viewing.reorderLevel}
          </Text>
          <Text style={styles.meta}>
            Cost {formatInr(viewing.costPrice)} · Sell {formatInr(viewing.sellingPrice)}
          </Text>
          {can('inventory.manage') ? (
            <View style={styles.rowActions}>
              <Button
                label="Stock in"
                onPress={() => {
                  setViewing(null);
                  setAdjusting(viewing);
                  setAdjustMode('stock_in');
                }}
              />
              <Button
                label="Stock out"
                variant="ghost"
                onPress={() => {
                  setViewing(null);
                  setAdjusting(viewing);
                  setAdjustMode('stock_out');
                }}
              />
            </View>
          ) : null}
          <Button label="Close" variant="ghost" onPress={() => setViewing(null)} />
        </View>
      ) : null}

      {adjusting ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {adjustMode === 'stock_in' ? 'Stock in' : 'Stock out'} · {adjusting.name}
          </Text>
          <View style={styles.rowActions}>
            <Button
              label="Stock in"
              variant={adjustMode === 'stock_in' ? 'primary' : 'ghost'}
              onPress={() => setAdjustMode('stock_in')}
            />
            <Button
              label="Stock out"
              variant={adjustMode === 'stock_out' ? 'primary' : 'ghost'}
              onPress={() => setAdjustMode('stock_out')}
            />
          </View>
          <Controller
            control={adjustForm.control}
            name="quantity"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Quantity"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="number-pad"
                error={adjustForm.formState.errors.quantity?.message}
              />
            )}
          />
          <Controller
            control={adjustForm.control}
            name="notes"
            render={({ field: { value, onChange } }) => (
              <TextField label="Notes" value={value ?? ''} onChangeText={onChange} />
            )}
          />
          <Button
            label="Confirm"
            onPress={() => void onAdjust()}
            loading={adjustStock.isPending}
          />
          <Button label="Cancel" variant="ghost" onPress={() => setAdjusting(null)} />
        </View>
      ) : null}

      <Text style={styles.section}>Recent movements</Text>
      {(movementsQuery.data ?? []).slice(0, 8).map((m) => (
        <Text key={m.id} style={styles.meta}>
          {m.movementType} · qty {m.quantity} · {new Date(m.createdAt).toLocaleString('en-IN')}
        </Text>
      ))}

      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  section: { color: colors.text, fontWeight: '700', marginTop: space.md },
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
  rowActions: { gap: space.sm },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted, fontSize: 12 },
  cellMono: { color: colors.accent, fontWeight: '700' },
  cellDanger: { color: colors.danger },
  badgeOk: { color: colors.success, fontWeight: '700', fontSize: 12 },
  badgeDanger: { color: colors.danger, fontWeight: '700', fontSize: 12 },
});
