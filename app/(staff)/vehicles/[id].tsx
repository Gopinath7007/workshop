import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useCustomer } from '../../../src/modules/customers/hooks';
import { useVehicle } from '../../../src/modules/vehicles/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors } from '../../../src/ui/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const vehicleQuery = useVehicle(id);
  const customerQuery = useCustomer(vehicleQuery.data?.customerId);

  if (vehicleQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const vehicle = vehicleQuery.data;
  if (!vehicle) {
    return (
      <Screen>
        <Text style={styles.title}>Vehicle not found</Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{vehicle.registrationNumber}</Text>
      <Text style={styles.meta}>
        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.vehicleType}
      </Text>
      <Text style={styles.meta}>Owner: {customerQuery.data?.name ?? '—'}</Text>
      <Text style={styles.meta}>
        Odometer: {vehicle.odometerReading != null ? `${vehicle.odometerReading} km` : '—'}
      </Text>
      <Text style={styles.meta}>Fuel: {vehicle.fuelType ?? '—'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  meta: { color: colors.muted },
});
