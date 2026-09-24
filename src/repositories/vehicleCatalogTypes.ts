import type { VehicleFocus } from '../data/indianVehicleCatalog';
import type { CatalogFuel, CatalogVehicleType } from '../data/indianVehicleCatalog';

export type VehicleCatalogMake = {
  id: string;
  name: string;
  category: VehicleFocus;
};

export type VehicleCatalogModel = {
  id: string;
  makeId: string;
  makeName: string;
  name: string;
  category: 'two_wheeler' | 'four_wheeler';
  vehicleType: CatalogVehicleType;
  defaultFuelType: CatalogFuel | null;
};

export interface VehicleCatalogRepository {
  listMakes(focus: VehicleFocus): Promise<VehicleCatalogMake[]>;
  listModels(focus: VehicleFocus, makeName?: string): Promise<VehicleCatalogModel[]>;
}
