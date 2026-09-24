import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth';
import {
  acceptWorkshopInvite,
  createWorkshop,
} from '../../src/services/sessionService';
import { useSessionStore } from '../../src/store/sessionStore';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors, radius, space } from '../../src/ui/theme';
import { z } from 'zod';

const createSchema = z.object({
  orgName: z.string().trim().min(2, 'Workshop name required'),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  gstin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      'Invalid GSTIN',
    ),
});

type CreateForm = z.infer<typeof createSchema>;

export default function OnboardingScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const setContext = useSessionStore((s) => s.setContext);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { orgName: '', phone: '', city: '', state: '', gstin: '' },
  });

  const applySession = (ctx: Awaited<ReturnType<typeof createWorkshop>>) => {
    setContext({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      roles: ctx.roles,
      permissions: ctx.permissions,
      organizationName: ctx.organizationName,
      memberships: ctx.memberships,
      needsOnboarding: false,
    });
    router.replace('/');
  };

  const onCreate = handleSubmit(async (values) => {
    setBusy(true);
    try {
      const ctx = await createWorkshop({
        orgName: values.orgName,
        phone: values.phone,
        city: values.city,
        state: values.state,
        gstin: values.gstin || undefined,
      });
      applySession(ctx);
    } catch (error) {
      Alert.alert('Could not create workshop', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  });

  const onJoin = async () => {
    if (inviteCode.trim().length < 4) {
      Alert.alert('Invite code', 'Enter the code from your workshop owner.');
      return;
    }
    setBusy(true);
    try {
      const ctx = await acceptWorkshopInvite(inviteCode);
      applySession(ctx);
    } catch (error) {
      Alert.alert('Could not join', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.brand}>Workshop MMS</Text>
      <Text style={styles.title}>Set up your workspace</Text>
      <Text style={styles.body}>
        Each workshop is a separate tenant — your customers, vehicles, jobs, and bills stay private
        to your organization.
      </Text>

      <View style={styles.tabs}>
        <Button
          label="Register workshop"
          variant={mode === 'create' ? 'primary' : 'ghost'}
          onPress={() => setMode('create')}
        />
        <Button
          label="Join with invite"
          variant={mode === 'join' ? 'primary' : 'ghost'}
          onPress={() => setMode('join')}
        />
      </View>

      {mode === 'create' ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Sell-ready workshop profile</Text>
          <Controller
            control={control}
            name="orgName"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Workshop name"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                placeholder="e.g. Sai Auto Care"
                error={errors.orgName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Phone"
                value={value ?? ''}
                onChangeText={onChange}
                keyboardType="phone-pad"
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
          <Button label="Create my workshop" onPress={() => void onCreate()} loading={busy} />
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Staff / team join</Text>
          <Text style={styles.meta}>
            Ask the workshop owner for an invite code from More → Workshop.
          </Text>
          <TextField
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="WK-XXXXXXXX"
          />
          <Button label="Join workshop" onPress={() => void onJoin()} loading={busy} />
        </View>
      )}

      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.accent, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  tabs: { gap: space.sm },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
