import { useQuery } from '@tanstack/react-query';
import type { VehicleFocus } from '../../data/indianVehicleCatalog';
import { getVehicleCatalogRepository } from '../../repositories';
import { useSessionStore } from '../../store/sessionStore';

export const catalogKeys = {
  all: ['vehicle-catalog'] as const,
  makes: (focus: VehicleFocus) => [...catalogKeys.all, 'makes', focus] as const,
  models: (focus: VehicleFocus, make?: string) =>
    [...catalogKeys.all, 'models', focus, make ?? ''] as const,
};

export function useWorkshopVehicleFocus(): VehicleFocus {
  return useSessionStore((s) => s.vehicleFocus) ?? 'both';
}

export function useVehicleMakes(focus?: VehicleFocus) {
  const workshopFocus = useWorkshopVehicleFocus();
  const effective = focus ?? workshopFocus;
  return useQuery({
    queryKey: catalogKeys.makes(effective),
    queryFn: () => getVehicleCatalogRepository().listMakes(effective),
  });
}

export function useVehicleModels(makeName?: string, focus?: VehicleFocus) {
  const workshopFocus = useWorkshopVehicleFocus();
  const effective = focus ?? workshopFocus;
  return useQuery({
    queryKey: catalogKeys.models(effective, makeName),
    enabled: Boolean(makeName),
    queryFn: () => getVehicleCatalogRepository().listModels(effective, makeName),
  });
}
