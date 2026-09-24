import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { getInvoiceRepository } from '../../../src/repositories';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';

export default function BillingScreen() {
  const { organizationId, branchId, can } = usePermissions();
  const invoicesQuery = useQuery({
    queryKey: ['invoices', organizationId, branchId],
    enabled: Boolean(organizationId) && can('billing.read'),
    queryFn: () =>
      getInvoiceRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 100,
      }),
  });

  const invoices = invoicesQuery.data ?? [];

  return (
    <Screen>
      <Text style={styles.title}>Billing</Text>
      <Text style={styles.body}>GST invoices and payments from job cards.</Text>

      {invoices.length === 0 ? (
        <Text style={styles.meta}>No invoices yet. Complete a job and generate one.</Text>
      ) : (
        <View style={styles.list}>
          {invoices.map((inv) => (
            <View key={inv.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {inv.invoiceNumber} · {inv.status}
              </Text>
              <Text style={styles.meta}>
                Total ₹{inv.totalAmount.toLocaleString('en-IN')} · Due ₹
                {inv.amountDue.toLocaleString('en-IN')}
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
    gap: 4,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
});
