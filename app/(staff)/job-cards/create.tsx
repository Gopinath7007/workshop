import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { useCreateJobCard } from '../../../src/modules/job-cards/hooks';
import {
  createJobCardSchema,
  type CreateJobCardForm,
} from '../../../src/modules/job-cards/schemas';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { VehicleCatalogPicker } from '../../../src/ui/VehicleCatalogPicker';
import { colors } from '../../../src/ui/theme';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { Redirect } from 'expo-router';

export default function CreateJobCardScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const createJob = useCreateJobCard();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateJobCardForm>({
    resolver: zodResolver(createJobCardSchema),
    defaultValues: {
      customerName: '',
      customerMobile: '',
      customerGstin: '',
      registrationNumber: '',
      brand: '',
      model: '',
      fuelType: 'petrol',
      complaints: '',
      odometerIn: undefined,
      estimatedCost: undefined,
    },
  });

  if (!can('job_cards.create')) {
    return <Redirect href="/(staff)/(tabs)/jobs" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const job = await createJob.mutateAsync({
        customerName: values.customerName,
        customerMobile: values.customerMobile,
        customerGstin: values.customerGstin || undefined,
        registrationNumber: values.registrationNumber,
        brand: values.brand,
        model: values.model,
        fuelType: values.fuelType,
        complaints: values.complaints,
        odometerIn: values.odometerIn,
        estimatedCost: values.estimatedCost,
      });
      router.replace(`/(staff)/job-cards/${job.id}`);
    } catch (error) {
      Alert.alert('Could not create job', error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <Screen>
      <Text style={styles.title}>New Job Card</Text>
      <Text style={styles.body}>
        Customer and vehicle are created or reused from mobile / registration.
      </Text>

      <Controller
        control={control}
        name="customerName"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Customer name"
            value={value}
            onChangeText={onChange}
            autoCapitalize="words"
            error={errors.customerName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="customerMobile"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Mobile"
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
            placeholder="10-digit mobile"
            error={errors.customerMobile?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="customerGstin"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="GSTIN (optional)"
            value={value ?? ''}
            onChangeText={onChange}
            autoCapitalize="characters"
            error={errors.customerGstin?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="registrationNumber"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Vehicle registration"
            value={value}
            onChangeText={onChange}
            autoCapitalize="characters"
            placeholder="MH12AB1234"
            error={errors.registrationNumber?.message}
          />
        )}
      />

      <VehicleCatalogPicker
        onSelect={(sel) => {
          setValue('brand', sel.brand);
          setValue('model', sel.model);
          setValue('fuelType', sel.fuelType);
        }}
      />

      <Controller
        control={control}
        name="brand"
        render={({ field: { value, onChange } }) => (
          <TextField label="Brand" value={value ?? ''} onChangeText={onChange} autoCapitalize="words" />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field: { value, onChange } }) => (
          <TextField label="Model" value={value ?? ''} onChangeText={onChange} autoCapitalize="words" />
        )}
      />
      <Controller
        control={control}
        name="complaints"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Complaints"
            value={value}
            onChangeText={onChange}
            multiline
            autoCapitalize="sentences"
            error={errors.complaints?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="odometerIn"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Odometer (km)"
            value={value == null ? '' : String(value)}
            onChangeText={(t) => onChange(t ? Number(t) : undefined)}
            keyboardType="number-pad"
            error={errors.odometerIn?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="estimatedCost"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Estimated cost (₹)"
            value={value == null ? '' : String(value)}
            onChangeText={(t) => onChange(t ? Number(t) : undefined)}
            keyboardType="numeric"
            error={errors.estimatedCost?.message}
          />
        )}
      />

      <Button label="Create job card" onPress={() => void onSubmit()} loading={createJob.isPending} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
});
