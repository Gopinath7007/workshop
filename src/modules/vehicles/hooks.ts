import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '../../hooks/usePermissions';
import { getVehicleRepository } from '../../repositories';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (orgId: string) => [...vehicleKeys.all, 'list', orgId] as const,
  detail: (id: string) => [...vehicleKeys.all, 'detail', id] as const,
};

export function useVehicles(search?: string) {
  const { organizationId } = usePermissions();
  return useQuery({
    queryKey: [...vehicleKeys.list(organizationId ?? ''), search ?? ''],
    enabled: Boolean(organizationId),
    queryFn: () =>
      getVehicleRepository().list({
        organizationId: organizationId!,
        search,
        limit: 100,
      }),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getVehicleRepository().getById(id!),
  });
}
