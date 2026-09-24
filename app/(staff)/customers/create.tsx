import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useCreateCustomer } from '../../../src/modules/customers/hooks';
import {
  createCustomerSchema,
  type CreateCustomerForm,
} from '../../../src/modules/customers/schemas';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors } from '../../../src/ui/theme';

export default function CreateCustomerScreen() {
  const { can } = usePermissions();
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerForm>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      gstin: '',
      city: '',
      state: '',
      addressLine1: '',
      notes: '',
    },
  });

  if (!can('customers.create')) {
    return <Redirect href="/(staff)/(tabs)/customers" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const customer = await createCustomer.mutateAsync(values);
      router.replace(`/(staff)/customers/${customer.id}`);
    } catch (error) {
      Alert.alert('Could not create', error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <Screen>
      <Text style={styles.title}>New Customer</Text>
      <Text style={styles.body}>Name, mobile, GSTIN, and address for India GST billing.</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Full name"
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="mobile"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Mobile"
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
            placeholder="10-digit mobile"
            error={errors.mobile?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Email (optional)"
            value={value ?? ''}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="gstin"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="GSTIN (optional)"
            value={value ?? ''}
            onChangeText={onChange}
            autoCapitalize="characters"
            error={errors.gstin?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="addressLine1"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Address"
            value={value ?? ''}
            onChangeText={onChange}
            error={errors.addressLine1?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field: { value, onChange } }) => (
          <TextField label="City" value={value ?? ''} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="state"
        render={({ field: { value, onChange } }) => (
          <TextField label="State" value={value ?? ''} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange } }) => (
          <TextField label="Notes" value={value ?? ''} onChangeText={onChange} />
        )}
      />

      <Button label="Save customer" onPress={() => void onSubmit()} loading={createCustomer.isPending} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
});
