import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../hooks/usePermissions';
import { getCustomerRepository } from '../../repositories';
import type { CreateCustomerForm } from './schemas';

export const customerKeys = {
  all: ['customers'] as const,
  list: (orgId: string) => [...customerKeys.all, 'list', orgId] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};

export function useCustomers(search?: string) {
  const { organizationId, branchId } = usePermissions();
  return useQuery({
    queryKey: [...customerKeys.list(organizationId ?? ''), search ?? ''],
    enabled: Boolean(organizationId),
    queryFn: () =>
      getCustomerRepository().list({
        organizationId: organizationId!,
        branchId,
        search,
        limit: 100,
      }),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getCustomerRepository().getById(id!),
  });
}

export function useCreateCustomer() {
  const { organizationId, branchId, can } = usePermissions();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerForm) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!can('customers.create')) throw new Error('Not allowed to create customers');
      const existing = await getCustomerRepository().findByMobile(organizationId, input.mobile);
      if (existing) {
        throw new Error(`Customer already exists: ${existing.name} (${existing.mobile})`);
      }
      return getCustomerRepository().create({
        organizationId,
        branchId: branchId ?? null,
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        gstin: input.gstin || null,
        city: input.city || null,
        state: input.state || null,
        addressLine1: input.addressLine1 || null,
        notes: input.notes || null,
        alternateMobile: null,
        pincode: null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
