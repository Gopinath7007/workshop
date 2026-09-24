import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import {
  createEstimate,
  getCustomerRepository,
  getEstimateRepository,
  getInvoiceRepository,
  getJobCardRepository,
  getVehicleRepository,
  listInvoicesByJob,
  listJobStatusHistory,
} from '../../repositories';
import type { CreateEstimateInput } from '../../repositories/local/estimateRepository';
import type { CreateJobCardInput } from '../../repositories/types';
import type { JobCardStatus, PaymentMode } from '../../types';
import { assertTransition } from './workflow';
import { usePermissions } from '../../hooks/usePermissions';

export const jobKeys = {
  all: ['job-cards'] as const,
  list: (orgId: string, branchId?: string | null) =>
    [...jobKeys.all, 'list', orgId, branchId ?? 'all'] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
  history: (id: string) => [...jobKeys.all, 'history', id] as const,
  estimates: (id: string) => [...jobKeys.all, 'estimates', id] as const,
  invoices: (id: string) => [...jobKeys.all, 'invoices', id] as const,
};

export function useJobCards() {
  const { organizationId, branchId } = usePermissions();
  return useQuery({
    queryKey: jobKeys.list(organizationId ?? '', branchId),
    enabled: Boolean(organizationId),
    queryFn: () =>
      getJobCardRepository().list({
        organizationId: organizationId!,
        branchId,
        limit: 100,
      }),
  });
}

export function useJobCard(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getJobCardRepository().getById(id!),
  });
}

export function useJobStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.history(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => listJobStatusHistory(id!),
  });
}

export function useJobEstimates(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.estimates(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getEstimateRepository().listByJobCard(id!),
  });
}

export function useJobInvoices(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.invoices(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => listInvoicesByJob(id!),
  });
}

export type CreateJobFlowInput = {
  customerName: string;
  customerMobile: string;
  customerGstin?: string;
  registrationNumber: string;
  brand?: string;
  model?: string;
  fuelType?: string;
  complaints: string;
  odometerIn?: number;
  estimatedCost?: number;
};

export function useCreateJobCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { organizationId, branchId } = usePermissions();

  return useMutation({
    mutationFn: async (input: CreateJobFlowInput) => {
      if (!organizationId || !branchId) throw new Error('Select an organization and branch first.');

      const customers = getCustomerRepository();
      const vehicles = getVehicleRepository();
      const jobs = getJobCardRepository();

      let customer = await customers.findByMobile(organizationId, input.customerMobile);
      if (!customer) {
        customer = await customers.create({
          organizationId,
          branchId,
          name: input.customerName.trim(),
          mobile: input.customerMobile.trim(),
          gstin: input.customerGstin?.trim() || null,
          email: null,
          alternateMobile: null,
          addressLine1: null,
          city: null,
          state: null,
          pincode: null,
          notes: null,
        });
      }

      let vehicle = await vehicles.findByRegistration(organizationId, input.registrationNumber);
      if (!vehicle) {
        vehicle = await vehicles.create({
          organizationId,
          customerId: customer.id,
          registrationNumber: input.registrationNumber,
          vehicleType: 'car',
          brand: input.brand?.trim() || null,
          model: input.model?.trim() || null,
          fuelType: (input.fuelType as never) || null,
          odometerReading: input.odometerIn ?? null,
        });
      } else if (input.odometerIn != null) {
        vehicle = await vehicles.update(vehicle.id, { odometerReading: input.odometerIn });
      }

      const payload: CreateJobCardInput = {
        organizationId,
        branchId,
        vehicleId: vehicle.id,
        customerId: customer.id,
        advisorId: user?.uid ?? null,
        complaints: input.complaints.trim(),
        odometerIn: input.odometerIn ?? null,
        estimatedCost: input.estimatedCost ?? 0,
        createdBy: user?.uid ?? null,
      };

      return jobs.create(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.all });
      await qc.invalidateQueries({ queryKey: ['customers'] });
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useTransitionJobCard(jobId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { permissions } = usePermissions();

  return useMutation({
    mutationFn: async ({ toStatus, note }: { toStatus: JobCardStatus; note?: string }) => {
      const jobs = getJobCardRepository();
      const current = await jobs.getById(jobId);
      if (!current) throw new Error('Job card not found');
      assertTransition(current.status, toStatus, permissions);
      return jobs.transition(jobId, toStatus, user?.uid ?? 'system', note);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      await qc.invalidateQueries({ queryKey: jobKeys.history(jobId) });
      await qc.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useCreateEstimate(jobId: string) {
  const qc = useQueryClient();
  const { organizationId, branchId } = usePermissions();

  return useMutation({
    mutationFn: async (input: {
      lines: CreateEstimateInput['lines'];
      discountAmount?: number;
    }) => {
      if (!organizationId || !branchId) throw new Error('Missing organization context');
      return createEstimate({
        organizationId,
        branchId,
        jobCardId: jobId,
        lines: input.lines,
        discountAmount: input.discountAmount ?? 0,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.estimates(jobId) });
    },
  });
}

export function useApproveEstimate(jobId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { permissions, can } = usePermissions();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      if (!can('estimates.approve') && !can('estimates.manage')) {
        throw new Error('Not allowed to approve estimates');
      }
      const estimate = await getEstimateRepository().updateStatus(estimateId, 'approved');
      const jobs = getJobCardRepository();
      const job = await jobs.getById(jobId);
      if (job?.status === 'waiting_approval') {
        assertTransition(job.status, 'in_progress', permissions);
        await jobs.transition(jobId, 'in_progress', user?.uid ?? 'system', 'Estimate approved');
      }
      return estimate;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.estimates(jobId) });
      await qc.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      await qc.invalidateQueries({ queryKey: jobKeys.history(jobId) });
      await qc.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useCreateInvoice(jobId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => getInvoiceRepository().createFromJobCard(jobId, user?.uid ?? 'system'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.invoices(jobId) });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRecordPayment(jobId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      amount: number;
      paymentMode: PaymentMode;
      referenceNumber?: string;
    }) =>
      getInvoiceRepository().recordPayment(input.invoiceId, {
        amount: input.amount,
        paymentMode: input.paymentMode,
        referenceNumber: input.referenceNumber ?? null,
        paidAt: new Date().toISOString(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: jobKeys.invoices(jobId) });
      await qc.invalidateQueries({ queryKey: ['customers'] });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
