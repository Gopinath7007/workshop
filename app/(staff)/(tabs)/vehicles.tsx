import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useVehicles } from '../../../src/modules/vehicles/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

export default function VehiclesTabScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const vehiclesQuery = useVehicles(search);
  const vehicles = vehiclesQuery.data ?? [];

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
      ) : vehicles.length === 0 ? (
        <Text style={styles.empty}>No vehicles yet. Create a job card to add one.</Text>
      ) : (
        <View style={styles.list}>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/(staff)/vehicles/${v.id}`)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{v.registrationNumber}</Text>
                <Text style={styles.rowMeta}>
                  {[v.brand, v.model].filter(Boolean).join(' ') || v.vehicleType}
                </Text>
              </View>
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
  empty: {
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
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 13 },
});
