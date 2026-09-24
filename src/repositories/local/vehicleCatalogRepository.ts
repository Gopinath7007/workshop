import {
  filterMakesForFocus,
  filterModelsForFocus,
  type VehicleFocus,
} from '../../data/indianVehicleCatalog';
import type { VehicleCatalogMake, VehicleCatalogModel, VehicleCatalogRepository } from '../vehicleCatalogTypes';

export const localVehicleCatalogRepository: VehicleCatalogRepository = {
  async listMakes(focus: VehicleFocus) {
    return filterMakesForFocus(focus).map((m, index) => ({
      id: `local-make-${index}-${m.name}`,
      name: m.name,
      category: m.category,
    }));
  },

  async listModels(focus: VehicleFocus, makeName?: string) {
    return filterModelsForFocus(focus, makeName).map((m, index) => ({
      id: `local-model-${index}-${m.make}-${m.name}`,
      makeId: `local-make-${m.make}`,
      makeName: m.make,
      name: m.name,
      category: m.category,
      vehicleType: m.vehicleType,
      defaultFuelType: m.defaultFuel ?? null,
    }));
  },
};
