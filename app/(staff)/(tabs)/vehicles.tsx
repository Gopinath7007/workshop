import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useVehicles } from '../../../src/modules/vehicles/hooks';
import type { Vehicle } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors } from '../../../src/ui/theme';

export default function VehiclesTabScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const vehiclesQuery = useVehicles(search);

  const columns = useMemo<DataTableColumn<Vehicle>[]>(
    () => [
      {
        key: 'reg',
        title: 'Registration',
        minWidth: 140,
        render: (row) => <Text style={styles.cellAccent}>{row.registrationNumber}</Text>,
      },
      {
        key: 'vehicle',
        title: 'Vehicle',
        minWidth: 180,
        render: (row) => (
          <Text style={styles.cellPrimary}>
            {[row.brand, row.model].filter(Boolean).join(' ') || row.vehicleType}
          </Text>
        ),
      },
      {
        key: 'fuel',
        title: 'Fuel',
        minWidth: 90,
        render: (row) => <Text style={styles.cellMuted}>{row.fuelType ?? '—'}</Text>,
      },
      {
        key: 'year',
        title: 'Year',
        width: 80,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>{row.manufactureYear ?? '—'}</Text>
        ),
      },
      {
        key: 'type',
        title: 'Type',
        minWidth: 100,
        render: (row) => <Text style={styles.cellMuted}>{row.vehicleType}</Text>,
      },
    ],
    [],
  );

  return (
    <Screen>
      <Text style={styles.title}>Vehicles</Text>
      <TextField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Registration / brand"
        autoCapitalize="characters"
      />
      {can('vehicles.create') ? (
        <Button label="Add vehicle" onPress={() => router.push('/(staff)/vehicles/create')} />
      ) : null}

      {vehiclesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={vehiclesQuery.data ?? []}
          emptyMessage="No vehicles yet. Create a job card or add one."
          onView={(row) => router.push(`/(staff)/vehicles/${row.id}`)}
          onEdit={
            can('vehicles.update')
              ? (row) => router.push(`/(staff)/vehicles/${row.id}`)
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
