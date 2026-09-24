import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useCustomer } from '../../../src/modules/customers/hooks';
import { useVehicles } from '../../../src/modules/vehicles/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, space } from '../../../src/ui/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const customerQuery = useCustomer(id);
  const vehiclesQuery = useVehicles();
  const vehicles = (vehiclesQuery.data ?? []).filter((v) => v.customerId === id);

  if (customerQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const customer = customerQuery.data;
  if (!customer) {
    return (
      <Screen>
        <Text style={styles.title}>Customer not found</Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{customer.name}</Text>
      <Text style={styles.meta}>{customer.mobile}</Text>
      {customer.gstin ? <Text style={styles.meta}>GSTIN {customer.gstin}</Text> : null}
      <Text style={styles.meta}>
        Outstanding ₹{customer.outstandingDue.toLocaleString('en-IN')} · Revenue ₹
        {customer.totalRevenue.toLocaleString('en-IN')}
      </Text>

      <Text style={styles.section}>Vehicles</Text>
      {vehicles.length === 0 ? (
        <Text style={styles.meta}>No vehicles linked.</Text>
      ) : (
        vehicles.map((v) => (
          <Text key={v.id} style={styles.meta}>
            {v.registrationNumber} · {[v.brand, v.model].filter(Boolean).join(' ')}
          </Text>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  meta: { color: colors.muted },
  section: { color: colors.text, fontWeight: '700', marginTop: space.md },
});
