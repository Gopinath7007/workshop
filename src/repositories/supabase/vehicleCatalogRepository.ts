import type { VehicleFocus } from '../../data/indianVehicleCatalog';
import type { CatalogFuel, CatalogVehicleType } from '../../data/indianVehicleCatalog';
import type { VehicleCatalogMake, VehicleCatalogModel, VehicleCatalogRepository } from '../vehicleCatalogTypes';
import { requireSupabase, throwIfError } from './client';

export const supabaseVehicleCatalogRepository: VehicleCatalogRepository = {
  async listMakes(focus: VehicleFocus) {
    const sb = requireSupabase();
    let query = sb
      .from('vehicle_catalog_makes')
      .select('id, name, category')
      .eq('is_active', true)
      .order('name');
    if (focus !== 'both') {
      query = query.or(`category.eq.${focus},category.eq.both`);
    }
    const { data, error } = await query;
    throwIfError(error, 'Could not load vehicle makes');
    return (data ?? []).map(
      (row): VehicleCatalogMake => ({
        id: row.id,
        name: row.name,
        category: row.category as VehicleFocus,
      }),
    );
  },

  async listModels(focus: VehicleFocus, makeName?: string) {
    const sb = requireSupabase();
    let makeId: string | undefined;
    if (makeName) {
      const { data: make, error: makeError } = await sb
        .from('vehicle_catalog_makes')
        .select('id, name')
        .eq('name', makeName)
        .maybeSingle();
      throwIfError(makeError, 'Could not load make');
      makeId = make?.id;
      if (!makeId) return [];
    }

    let query = sb
      .from('vehicle_catalog_models')
      .select('id, make_id, name, category, vehicle_type, default_fuel_type')
      .eq('is_active', true)
      .order('name');
    if (focus !== 'both') {
      query = query.eq('category', focus);
    }
    if (makeId) {
      query = query.eq('make_id', makeId);
    }
    const { data, error } = await query;
    throwIfError(error, 'Could not load vehicle models');
    return (data ?? []).map(
      (row): VehicleCatalogModel => ({
        id: row.id,
        makeId: row.make_id,
        makeName: makeName ?? '',
        name: row.name,
        category: row.category as 'two_wheeler' | 'four_wheeler',
        vehicleType: row.vehicle_type as CatalogVehicleType,
        defaultFuelType: (row.default_fuel_type as CatalogFuel | null) ?? null,
      }),
    );
  },
};
