import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import {
  createVehicleSchema,
  type CreateVehicleForm,
} from '../../../src/modules/inventory/schemas';
import { useCreateVehicle } from '../../../src/modules/vehicles/createVehicle';
import { DEMO_PLATES } from '../../../src/providers/vehicle-info';
import {
  lookupVehicleByRegistration,
  scanPlateFromLibrary,
  scanPlateWithCamera,
} from '../../../src/services/plateScanService';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

export default function CreateVehicleScreen() {
  const router = useRouter();
  const { can } = usePermissions();
  const createVehicle = useCreateVehicle();
  const [scanning, setScanning] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateVehicleForm>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      registrationNumber: '',
      customerMobile: '',
      customerName: '',
      brand: '',
      model: '',
      fuelType: '',
      vehicleType: 'car',
      insuranceProvider: '',
      insuranceExpiry: '',
      ownerName: '',
    },
  });

  if (!can('vehicles.create') && !can('vehicles.scan')) {
    return <Redirect href="/(staff)/(tabs)/vehicles" />;
  }

  const applyVehicleInfo = (info: NonNullable<Awaited<ReturnType<typeof lookupVehicleByRegistration>>>) => {
    setValue('registrationNumber', info.registrationNumber);
    if (info.brand) setValue('brand', info.brand);
    if (info.model) setValue('model', info.model);
    if (info.fuelType) setValue('fuelType', info.fuelType);
    if (info.vehicleType) setValue('vehicleType', info.vehicleType);
    if (info.insuranceProvider) setValue('insuranceProvider', info.insuranceProvider);
    if (info.insuranceExpiry) setValue('insuranceExpiry', info.insuranceExpiry);
    if (info.ownerName) {
      setValue('ownerName', info.ownerName);
      if (!getValues('customerName')) setValue('customerName', info.ownerName);
    }
  };

  const runScan = async (mode: 'camera' | 'library') => {
    setScanning(true);
    setLookupNote(null);
    try {
      const outcome =
        mode === 'camera' ? await scanPlateWithCamera() : await scanPlateFromLibrary();
      if (!outcome) return;
      const reg = outcome.ocr.registrationNumber;
      if (!reg) {
        Alert.alert('OCR', 'Could not read a registration number. Enter it manually.');
        return;
      }
      setValue('registrationNumber', reg);
      if (outcome.vehicleInfo) {
        applyVehicleInfo(outcome.vehicleInfo);
        setLookupNote(
          `OCR ${Math.round(outcome.ocr.confidence * 100)}% via ${outcome.ocr.provider}` +
            (outcome.vehicleInfo.ownerName
              ? ` · Owner ${outcome.vehicleInfo.ownerName}`
              : ' · No registry match (demo plates: MH12AB1234, KA01MJ9087, TN09BC4455)'),
        );
      }
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : String(error));
    } finally {
      setScanning(false);
    }
  };

  const runLookup = async () => {
    const reg = getValues('registrationNumber');
    setScanning(true);
    try {
      const info = await lookupVehicleByRegistration(reg);
      if (!info) {
        Alert.alert('Invalid registration', 'Check the plate format (e.g. MH12AB1234).');
        return;
      }
      applyVehicleInfo(info);
      setLookupNote(
        info.ownerName
          ? `Registry hit: ${info.ownerName}`
          : `No demo match. Try ${DEMO_PLATES.join(', ')}`,
      );
    } catch (error) {
      Alert.alert('Lookup failed', error instanceof Error ? error.message : String(error));
    } finally {
      setScanning(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const vehicle = await createVehicle.mutateAsync(values);
      router.replace(`/(staff)/vehicles/${vehicle.id}`);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <Screen>
      <Text style={styles.title}>New Vehicle</Text>
      <Text style={styles.body}>
        Capture plate → OCR → validate → fetch vehicle details (swap OCR / VehicleInfo providers
        later).
      </Text>

      {can('vehicles.scan') ? (
        <View style={styles.scanRow}>
          <Button
            label="Scan with camera"
            onPress={() => void runScan('camera')}
            loading={scanning}
          />
          <Button
            label="Scan from gallery"
            variant="ghost"
            onPress={() => void runScan('library')}
            loading={scanning}
          />
        </View>
      ) : null}

      <Controller
        control={control}
        name="registrationNumber"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Registration"
            value={value}
            onChangeText={onChange}
            autoCapitalize="characters"
            placeholder="MH12AB1234"
            error={errors.registrationNumber?.message}
          />
        )}
      />
      <Button label="Lookup vehicle info" variant="ghost" onPress={() => void runLookup()} loading={scanning} />
      {lookupNote ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>{lookupNote}</Text>
        </View>
      ) : null}

      <Controller
        control={control}
        name="customerName"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Customer / owner name"
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
            label="Customer mobile"
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
            error={errors.customerMobile?.message}
          />
        )}
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
        name="fuelType"
        render={({ field: { value, onChange } }) => (
          <TextField label="Fuel type" value={value ?? ''} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="insuranceProvider"
        render={({ field: { value, onChange } }) => (
          <TextField label="Insurance provider" value={value ?? ''} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="insuranceExpiry"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Insurance expiry (YYYY-MM-DD)"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="2026-12-31"
          />
        )}
      />

      <Button
        label="Save vehicle"
        onPress={() => void onSubmit()}
        loading={createVehicle.isPending}
      />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  scanRow: { gap: space.sm },
  note: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  noteText: { color: colors.accent, fontSize: 13, lineHeight: 18 },
});
