import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '../../hooks/usePermissions';
import { getEstimateRepository } from '../../repositories';

export const estimateKeys = {
  all: ['estimates'] as const,
  list: (orgId: string) => [...estimateKeys.all, 'list', orgId] as const,
};

export function useEstimates(search?: string) {
  const { organizationId, branchId, can } = usePermissions();
  return useQuery({
    queryKey: [...estimateKeys.list(organizationId ?? ''), search ?? ''],
    enabled: Boolean(organizationId) && (can('estimates.manage') || can('estimates.approve')),
    queryFn: () =>
      getEstimateRepository().list({
        organizationId: organizationId!,
        branchId,
        search,
        limit: 100,
      }),
  });
}
