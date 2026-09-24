import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  adjustStock,
  countReorderAlerts,
  createPart,
  ensureInventorySeed,
  listPartsWithStock,
  listRecentMovements,
  type CreatePartInput,
} from '../../repositories';

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (orgId: string, branchId: string, search = '') =>
    [...inventoryKeys.all, 'list', orgId, branchId, search] as const,
  alerts: (orgId: string, branchId: string) =>
    [...inventoryKeys.all, 'alerts', orgId, branchId] as const,
  movements: (branchId: string) => [...inventoryKeys.all, 'movements', branchId] as const,
};

export function useInventoryParts(search?: string) {
  const { organizationId, branchId } = usePermissions();
  return useQuery({
    queryKey: inventoryKeys.list(organizationId ?? '', branchId ?? '', search ?? ''),
    enabled: Boolean(organizationId && branchId),
    queryFn: async () => {
      await ensureInventorySeed(organizationId!, branchId!);
      return listPartsWithStock({
        organizationId: organizationId!,
        branchId: branchId!,
        search,
      });
    },
  });
}

export function useReorderAlertCount() {
  const { organizationId, branchId } = usePermissions();
  return useQuery({
    queryKey: inventoryKeys.alerts(organizationId ?? '', branchId ?? ''),
    enabled: Boolean(organizationId && branchId),
    queryFn: async () => {
      await ensureInventorySeed(organizationId!, branchId!);
      return countReorderAlerts(organizationId!, branchId!);
    },
  });
}

export function useStockMovements() {
  const { branchId } = usePermissions();
  return useQuery({
    queryKey: inventoryKeys.movements(branchId ?? ''),
    enabled: Boolean(branchId),
    queryFn: () => listRecentMovements(branchId!),
  });
}

export function useCreatePart() {
  const qc = useQueryClient();
  const { organizationId, branchId } = usePermissions();

  return useMutation({
    mutationFn: async (input: Omit<CreatePartInput, 'organizationId' | 'branchId'>) => {
      if (!organizationId || !branchId) throw new Error('Missing branch context');
      return createPart({ ...input, organizationId, branchId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { organizationId, branchId } = usePermissions();

  return useMutation({
    mutationFn: async (input: {
      partId: string;
      movementType: 'stock_in' | 'stock_out' | 'adjustment';
      quantity: number;
      notes?: string;
    }) => {
      if (!organizationId || !branchId) throw new Error('Missing branch context');
      return adjustStock({
        organizationId,
        branchId,
        partId: input.partId,
        movementType: input.movementType,
        quantity: input.quantity,
        notes: input.notes,
        createdBy: user?.uid,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
