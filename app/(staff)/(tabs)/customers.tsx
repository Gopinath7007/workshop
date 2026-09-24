import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useCustomers } from '../../../src/modules/customers/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

export default function CustomersTabScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const customersQuery = useCustomers(search);
  const customers = customersQuery.data ?? [];

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
      ) : customers.length === 0 ? (
        <Text style={styles.empty}>No customers yet. Create a job card to add one.</Text>
      ) : (
        <View style={styles.list}>
          {customers.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/(staff)/customers/${c.id}`)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowMeta}>
                  {c.mobile}
                  {c.gstin ? ` · ${c.gstin}` : ''}
                </Text>
              </View>
              <Text style={styles.due}>
                ₹{c.outstandingDue.toLocaleString('en-IN')}
              </Text>
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
  due: { color: colors.accent, fontWeight: '700' },
});
