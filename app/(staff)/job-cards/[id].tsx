import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useCustomer } from '../../../src/modules/customers/hooks';
import {
  useApproveEstimate,
  useCreateEstimate,
  useCreateInvoice,
  useJobCard,
  useJobEstimates,
  useJobInvoices,
  useJobStatusHistory,
  useRecordPayment,
  useTransitionJobCard,
} from '../../../src/modules/job-cards/hooks';
import {
  estimateQuickSchema,
  type EstimateQuickForm,
} from '../../../src/modules/job-cards/schemas';
import { getAvailableTransitions } from '../../../src/modules/job-cards/workflow';
import { useVehicle } from '../../../src/modules/vehicles/hooks';
import { usePermissions } from '../../../src/hooks/usePermissions';
import type { JobCardStatus } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: 'Open',
  inspection: 'Inspection',
  waiting_approval: 'Waiting approval',
  in_progress: 'In progress',
  parts_pending: 'Parts pending',
  qc: 'QC',
  ready_delivery: 'Ready delivery',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function JobCardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { permissions, can } = usePermissions();

  const jobQuery = useJobCard(id);
  const historyQuery = useJobStatusHistory(id);
  const estimatesQuery = useJobEstimates(id);
  const invoicesQuery = useJobInvoices(id);
  const customerQuery = useCustomer(jobQuery.data?.customerId);
  const vehicleQuery = useVehicle(jobQuery.data?.vehicleId);

  const transition = useTransitionJobCard(id!);
  const createEstimate = useCreateEstimate(id!);
  const approveEstimate = useApproveEstimate(id!);
  const createInvoice = useCreateInvoice(id!);
  const recordPayment = useRecordPayment(id!);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstimateQuickForm>({
    resolver: zodResolver(estimateQuickSchema),
    defaultValues: {
      laborDescription: 'General labour',
      laborAmount: 1500,
      partDescription: '',
      partAmount: 0,
      discountAmount: 0,
    },
  });

  if (jobQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const job = jobQuery.data;
  if (!job) {
    return (
      <Screen>
        <Text style={styles.title}>Job not found</Text>
        <Button label="Back to jobs" onPress={() => router.replace('/(staff)/(tabs)/jobs')} />
      </Screen>
    );
  }

  const transitions = getAvailableTransitions(job.status, permissions);
  const latestEstimate = estimatesQuery.data?.[0];
  const latestInvoice = invoicesQuery.data?.[0];

  const runTransition = (toStatus: JobCardStatus) => {
    void transition.mutateAsync({ toStatus }).catch((error) => {
      Alert.alert('Transition failed', error instanceof Error ? error.message : String(error));
    });
  };

  const onCreateEstimate = handleSubmit(async (values) => {
    try {
      const lines: Array<{
        lineType: 'labor' | 'part';
        description: string;
        quantity: number;
        unitPrice: number;
        gstPercent: number;
      }> = [
        {
          lineType: 'labor',
          description: values.laborDescription,
          quantity: 1,
          unitPrice: values.laborAmount,
          gstPercent: 18,
        },
      ];
      if (values.partDescription && values.partAmount && values.partAmount > 0) {
        lines.push({
          lineType: 'part',
          description: values.partDescription,
          quantity: 1,
          unitPrice: values.partAmount,
          gstPercent: 18,
        });
      }
      await createEstimate.mutateAsync({
        lines,
        discountAmount: values.discountAmount ?? 0,
      });
      reset();
      Alert.alert('Estimate created', 'Send for approval when ready.');
    } catch (error) {
      Alert.alert('Estimate failed', error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <Screen>
      <Text style={styles.kicker}>{job.jobNumber}</Text>
      <Text style={styles.title}>{STATUS_LABEL[job.status]}</Text>
      <Text style={styles.meta}>
        {vehicleQuery.data?.registrationNumber ?? 'Vehicle'} ·{' '}
        {customerQuery.data?.name ?? 'Customer'} · {customerQuery.data?.mobile ?? ''}
      </Text>
      {job.complaints ? <Text style={styles.body}>{job.complaints}</Text> : null}
      <Text style={styles.meta}>Est. cost {formatInr(job.estimatedCost)}</Text>

      {transitions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow</Text>
          {transitions.map((t) => (
            <Button
              key={`${t.from}-${t.to}`}
              label={t.label}
              onPress={() => runTransition(t.to)}
              loading={transition.isPending}
            />
          ))}
        </View>
      ) : null}

      {can('estimates.manage') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick estimate</Text>
          <Controller
            control={control}
            name="laborDescription"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Labor"
                value={value}
                onChangeText={onChange}
                error={errors.laborDescription?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="laborAmount"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Labor amount (₹)"
                value={String(value ?? '')}
                onChangeText={(t) => onChange(Number(t) || 0)}
                keyboardType="numeric"
                error={errors.laborAmount?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="partDescription"
            render={({ field: { value, onChange } }) => (
              <TextField label="Part (optional)" value={value ?? ''} onChangeText={onChange} />
            )}
          />
          <Controller
            control={control}
            name="partAmount"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Part amount (₹)"
                value={value == null ? '' : String(value)}
                onChangeText={(t) => onChange(t ? Number(t) : 0)}
                keyboardType="numeric"
              />
            )}
          />
          <Button
            label="Create estimate"
            onPress={() => void onCreateEstimate()}
            loading={createEstimate.isPending}
          />
        </View>
      ) : null}

      {latestEstimate ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {latestEstimate.estimateNumber} · {latestEstimate.status}
          </Text>
          <Text style={styles.meta}>
            Subtotal {formatInr(latestEstimate.subtotal)} · GST{' '}
            {formatInr(
              latestEstimate.cgstAmount + latestEstimate.sgstAmount + latestEstimate.igstAmount,
            )}
          </Text>
          <Text style={styles.amount}>{formatInr(latestEstimate.totalAmount)}</Text>
          {latestEstimate.status !== 'approved' &&
          (can('estimates.approve') || can('estimates.manage')) ? (
            <Button
              label="Approve estimate"
              onPress={() =>
                void approveEstimate.mutateAsync(latestEstimate.id).catch((error) =>
                  Alert.alert(
                    'Approve failed',
                    error instanceof Error ? error.message : String(error),
                  ),
                )
              }
              loading={approveEstimate.isPending}
            />
          ) : null}
          {latestEstimate.status === 'draft' && can('job_cards.transition') ? (
            <Button
              label="Mark waiting approval"
              variant="ghost"
              onPress={() => {
                if (job.status === 'inspection' || job.status === 'open') {
                  const next =
                    job.status === 'open' ? 'inspection' : 'waiting_approval';
                  if (job.status === 'open') {
                    void transition
                      .mutateAsync({ toStatus: 'inspection' })
                      .then(() => transition.mutateAsync({ toStatus: 'waiting_approval' }))
                      .catch((error) =>
                        Alert.alert(
                          'Update failed',
                          error instanceof Error ? error.message : String(error),
                        ),
                      );
                  } else {
                    runTransition(next as JobCardStatus);
                  }
                } else if (job.status !== 'waiting_approval') {
                  Alert.alert(
                    'Workflow',
                    'Move the job to Inspection first, then Waiting approval.',
                  );
                }
              }}
            />
          ) : null}
        </View>
      ) : null}

      {can('billing.manage') && (job.status === 'ready_delivery' || job.status === 'delivered') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          {!latestInvoice ? (
            <Button
              label="Generate GST invoice"
              onPress={() =>
                void createInvoice.mutateAsync().catch((error) =>
                  Alert.alert(
                    'Invoice failed',
                    error instanceof Error ? error.message : String(error),
                  ),
                )
              }
              loading={createInvoice.isPending}
            />
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {latestInvoice.invoiceNumber} · {latestInvoice.status}
              </Text>
              <Text style={styles.amount}>{formatInr(latestInvoice.totalAmount)}</Text>
              <Text style={styles.meta}>
                Paid {formatInr(latestInvoice.amountPaid)} · Due{' '}
                {formatInr(latestInvoice.amountDue)}
              </Text>
              {latestInvoice.amountDue > 0 ? (
                <View style={styles.payRow}>
                  <Button
                    label="Pay UPI (full)"
                    onPress={() =>
                      void recordPayment
                        .mutateAsync({
                          invoiceId: latestInvoice.id,
                          amount: latestInvoice.amountDue,
                          paymentMode: 'upi',
                        })
                        .catch((error) =>
                          Alert.alert(
                            'Payment failed',
                            error instanceof Error ? error.message : String(error),
                          ),
                        )
                    }
                    loading={recordPayment.isPending}
                  />
                  <Button
                    label="Pay cash (full)"
                    variant="ghost"
                    onPress={() =>
                      void recordPayment
                        .mutateAsync({
                          invoiceId: latestInvoice.id,
                          amount: latestInvoice.amountDue,
                          paymentMode: 'cash',
                        })
                        .catch((error) =>
                          Alert.alert(
                            'Payment failed',
                            error instanceof Error ? error.message : String(error),
                          ),
                        )
                    }
                    loading={recordPayment.isPending}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {(historyQuery.data ?? []).map((h) => (
          <View key={h.id} style={styles.timelineRow}>
            <Text style={styles.timelineStatus}>{STATUS_LABEL[h.toStatus]}</Text>
            <Text style={styles.timelineMeta}>
              {new Date(h.createdAt).toLocaleString('en-IN')}
              {h.note ? ` · ${h.note}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  kicker: {
    color: colors.accent,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
  },
  body: {
    color: colors.text,
    lineHeight: 22,
  },
  section: {
    gap: space.sm,
    marginTop: space.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  amount: {
    color: colors.success,
    fontSize: 22,
    fontWeight: '800',
  },
  payRow: {
    gap: space.sm,
  },
  timelineRow: {
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineStatus: {
    color: colors.text,
    fontWeight: '700',
  },
  timelineMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});
