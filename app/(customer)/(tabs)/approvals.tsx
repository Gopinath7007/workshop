import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import {
  usePortalApproveEstimate,
  usePortalPendingEstimates,
} from '../../../src/modules/portal/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

export default function CustomerApprovalsScreen() {
  const estimatesQuery = usePortalPendingEstimates();
  const approve = usePortalApproveEstimate();

  return (
    <Screen>
      <Text style={styles.title}>Approvals</Text>
      <Text style={styles.body}>Approve estimates pending for your vehicles.</Text>

      {estimatesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (estimatesQuery.data ?? []).length === 0 ? (
        <Text style={styles.meta}>No pending estimates.</Text>
      ) : (
        <View style={styles.list}>
          {(estimatesQuery.data ?? []).map((est) => (
            <View key={est.id} style={styles.card}>
              <Text style={styles.cardTitle}>{est.estimateNumber}</Text>
              <Text style={styles.amount}>
                ₹{est.totalAmount.toLocaleString('en-IN')} · {est.status}
              </Text>
              <Button
                label="Approve"
                onPress={() =>
                  void approve.mutateAsync(est.id).catch((error) =>
                    Alert.alert(
                      'Approve failed',
                      error instanceof Error ? error.message : String(error),
                    ),
                  )
                }
                loading={approve.isPending}
              />
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
    gap: space.sm,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
  amount: { color: colors.success, fontWeight: '800', fontSize: 18 },
});
