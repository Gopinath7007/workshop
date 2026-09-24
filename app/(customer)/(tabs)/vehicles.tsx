import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePortalVehicles } from '../../../src/modules/portal/hooks';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

export default function CustomerVehiclesScreen() {
  const vehiclesQuery = usePortalVehicles();

  return (
    <Screen>
      <Text style={styles.title}>My Vehicles</Text>
      <Text style={styles.body}>Vehicles linked to your customer profile.</Text>

      {vehiclesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (vehiclesQuery.data ?? []).length === 0 ? (
        <Text style={styles.meta}>No vehicles found for your email yet.</Text>
      ) : (
        <View style={styles.list}>
          {(vehiclesQuery.data ?? []).map((v) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.cardTitle}>{v.registrationNumber}</Text>
              <Text style={styles.meta}>
                {[v.brand, v.model].filter(Boolean).join(' ') || v.vehicleType}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  meta: { color: colors.muted },
  list: { gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
});
