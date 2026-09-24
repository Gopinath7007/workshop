import { normalizeIndianRegistration } from '../../providers/ocr';
import type { Vehicle } from '../../types';
import type { ListParams, VehicleRepository } from '../types';
import { requireSupabase, throwIfError } from './client';
import { mapVehicle } from './mappers';

export const supabaseVehicleRepository: VehicleRepository = {
  async list(params) {
    const sb = requireSupabase();
    let q = sb
      .from('vehicles')
      .select('*')
      .eq('organization_id', params.organizationId)
      .order('created_at', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

    if (params.customerId) q = q.eq('customer_id', params.customerId);
    if (params.search?.trim()) {
      const s = params.search.trim();
      q = q.or(
        `registration_number.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`,
      );
    }

    const { data, error } = await q;
    throwIfError(error, 'Could not load vehicles');
    return (data ?? []).map(mapVehicle);
  },

  async getById(id) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('vehicles').select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'Could not load vehicle');
    return data ? mapVehicle(data) : null;
  },

  async findByRegistration(organizationId, registrationNumber) {
    const sb = requireSupabase();
    const reg =
      normalizeIndianRegistration(registrationNumber) ??
      registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { data, error } = await sb
      .from('vehicles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('registration_number', reg)
      .maybeSingle();
    throwIfError(error, 'Could not find vehicle');
    return data ? mapVehicle(data) : null;
  },

  async create(input) {
    const sb = requireSupabase();
    const reg =
      normalizeIndianRegistration(input.registrationNumber) ??
      input.registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { data, error } = await sb
      .from('vehicles')
      .insert({
        organization_id: input.organizationId,
        customer_id: input.customerId,
        registration_number: reg,
        vehicle_type: input.vehicleType,
        brand: input.brand ?? null,
        model: input.model ?? null,
        variant: input.variant ?? null,
        fuel_type: input.fuelType ?? null,
        color: input.color ?? null,
        chassis_number: input.chassisNumber ?? null,
        engine_number: input.engineNumber ?? null,
        manufacture_year: input.manufactureYear ?? null,
        odometer_reading: input.odometerReading ?? null,
        registration_date: input.registrationDate ?? null,
        insurance_provider: input.insuranceProvider ?? null,
        insurance_policy_number: input.insurancePolicyNumber ?? null,
        insurance_expiry: input.insuranceExpiry ?? null,
        warranty_expiry: input.warrantyExpiry ?? null,
      })
      .select('*')
      .single();
    throwIfError(error, 'Could not create vehicle');
    return mapVehicle(data);
  },

  async update(id, patch) {
    const sb = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.brand !== undefined) payload.brand = patch.brand;
    if (patch.model !== undefined) payload.model = patch.model;
    if (patch.fuelType !== undefined) payload.fuel_type = patch.fuelType;
    if (patch.odometerReading !== undefined) payload.odometer_reading = patch.odometerReading;
    if (patch.insuranceProvider !== undefined) payload.insurance_provider = patch.insuranceProvider;
    if (patch.insuranceExpiry !== undefined) payload.insurance_expiry = patch.insuranceExpiry;

    const { data, error } = await sb
      .from('vehicles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(error, 'Could not update vehicle');
    return mapVehicle(data);
  },
};
