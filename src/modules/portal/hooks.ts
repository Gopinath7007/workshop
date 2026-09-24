import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  getCustomerRepository,
  getEstimateRepository,
  getInvoiceRepository,
  getJobCardRepository,
  getVehicleRepository,
} from '../../repositories';
import { jobKeys } from '../job-cards/hooks';

export const portalKeys = {
  all: ['portal'] as const,
  customer: (email: string) => [...portalKeys.all, 'customer', email] as const,
  jobs: (customerId: string) => [...portalKeys.all, 'jobs', customerId] as const,
  estimates: (customerId: string) => [...portalKeys.all, 'estimates', customerId] as const,
  vehicles: (customerId: string) => [...portalKeys.all, 'vehicles', customerId] as const,
  invoices: (customerId: string) => [...portalKeys.all, 'invoices', customerId] as const,
};

export function usePortalCustomer() {
  const { user } = useAuth();
  const { organizationId } = usePermissions();
  const email = user?.email ?? '';

  return useQuery({
    queryKey: portalKeys.customer(email),
    enabled: Boolean(email && organizationId),
    queryFn: async () => {
      const customers = await getCustomerRepository().list({
        organizationId: organizationId!,
        search: email,
        limit: 50,
      });
      return (
        customers.find((c) => c.email?.toLowerCase() === email.toLowerCase()) ??
        customers[0] ??
        null
      );
    },
  });
}

export function usePortalJobs() {
  const customerQuery = usePortalCustomer();
  const customerId = customerQuery.data?.id;
  const { organizationId } = usePermissions();

  return useQuery({
    queryKey: portalKeys.jobs(customerId ?? ''),
    enabled: Boolean(customerId && organizationId),
    queryFn: async () => {
      const jobs = await getJobCardRepository().list({
        organizationId: organizationId!,
        limit: 100,
      });
      return jobs.filter((j) => j.customerId === customerId);
    },
  });
}

export function usePortalVehicles() {
  const customerQuery = usePortalCustomer();
  const customerId = customerQuery.data?.id;
  const { organizationId } = usePermissions();

  return useQuery({
    queryKey: portalKeys.vehicles(customerId ?? ''),
    enabled: Boolean(customerId && organizationId),
    queryFn: () =>
      getVehicleRepository().list({
        organizationId: organizationId!,
        customerId,
        limit: 50,
      }),
  });
}

export function usePortalPendingEstimates() {
  const jobsQuery = usePortalJobs();
  const jobIds = (jobsQuery.data ?? []).map((j) => j.id);

  return useQuery({
    queryKey: portalKeys.estimates(jobIds.join(',')),
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const all = await Promise.all(
        jobIds.map(async (jobId) => {
          const estimates = await getEstimateRepository().listByJobCard(jobId);
          return estimates
            .filter((e) => e.status === 'draft' || e.status === 'sent')
            .map((e) => ({ ...e, jobId }));
        }),
      );
      return all.flat();
    },
  });
}

export function usePortalApproveEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (estimateId: string) =>
      getEstimateRepository().updateStatus(estimateId, 'approved'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: portalKeys.all });
      await qc.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function usePortalInvoices() {
  const customerQuery = usePortalCustomer();
  const customerId = customerQuery.data?.id;
  const { organizationId } = usePermissions();

  return useQuery({
    queryKey: portalKeys.invoices(customerId ?? ''),
    enabled: Boolean(customerId && organizationId),
    queryFn: async () => {
      const invoices = await getInvoiceRepository().list({
        organizationId: organizationId!,
        limit: 100,
      });
      return invoices.filter((inv) => inv.customerId === customerId);
    },
  });
}
