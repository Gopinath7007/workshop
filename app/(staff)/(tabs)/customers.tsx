import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useCustomers } from '../../../src/modules/customers/hooks';
import type { Customer } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors } from '../../../src/ui/theme';

export default function CustomersTabScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const customersQuery = useCustomers(search);

  const columns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        key: 'name',
        title: 'Name',
        minWidth: 180,
        render: (row) => <Text style={styles.cellPrimary}>{row.name}</Text>,
      },
      {
        key: 'mobile',
        title: 'Mobile',
        minWidth: 120,
        render: (row) => <Text style={styles.cellMuted}>{row.mobile}</Text>,
      },
      {
        key: 'gstin',
        title: 'GSTIN',
        minWidth: 140,
        render: (row) => <Text style={styles.cellMuted}>{row.gstin ?? '—'}</Text>,
      },
      {
        key: 'city',
        title: 'City',
        minWidth: 110,
        render: (row) => <Text style={styles.cellMuted}>{row.city ?? '—'}</Text>,
      },
      {
        key: 'due',
        title: 'Outstanding',
        width: 120,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellAccent}>₹{row.outstandingDue.toLocaleString('en-IN')}</Text>
        ),
      },
    ],
    [],
  );

  return (
    <Screen>
      <Text style={styles.title}>Customers</Text>
      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Name or mobile"
      />
      {can('customers.create') ? (
        <Button label="Add customer" onPress={() => router.push('/(staff)/customers/create')} />
      ) : null}

      {customersQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={customersQuery.data ?? []}
          emptyMessage="No customers yet. Create a job card or add one."
          onView={(row) => router.push(`/(staff)/customers/${row.id}`)}
          onEdit={
            can('customers.update')
              ? (row) => router.push(`/(staff)/customers/${row.id}`)
              : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
});
