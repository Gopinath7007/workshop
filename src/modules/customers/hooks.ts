import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '../../hooks/usePermissions';
import { getCustomerRepository } from '../../repositories';

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
