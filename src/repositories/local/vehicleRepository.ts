import type { Vehicle } from '../../types';
import type { ListParams, VehicleRepository } from '../types';
import { newId, withLocalDb } from './storage';
import { normalizeIndianRegistration } from '../../providers/ocr';

export const localVehicleRepository: VehicleRepository = {
  async list(params) {
    return withLocalDb((db) =>
      db.vehicles
        .filter((v) => v.organizationId === params.organizationId)
        .filter((v) => !params.customerId || v.customerId === params.customerId)
        .filter((v) => {
          if (!params.search?.trim()) return true;
          const q = params.search.trim().toLowerCase();
          return (
            v.registrationNumber.toLowerCase().includes(q) ||
            (v.brand?.toLowerCase().includes(q) ?? false) ||
            (v.model?.toLowerCase().includes(q) ?? false)
          );
        })
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50)),
    );
  },

  async getById(id) {
    return withLocalDb((db) => db.vehicles.find((v) => v.id === id) ?? null);
  },

  async findByRegistration(organizationId, registrationNumber) {
    const reg =
      normalizeIndianRegistration(registrationNumber) ??
      registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return withLocalDb(
      (db) =>
        db.vehicles.find(
          (v) => v.organizationId === organizationId && v.registrationNumber === reg,
        ) ?? null,
    );
  },

  async create(input) {
    return withLocalDb((db) => {
      const reg =
        normalizeIndianRegistration(input.registrationNumber) ??
        input.registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const vehicle: Vehicle = { ...input, id: newId(), registrationNumber: reg };
      db.vehicles.unshift(vehicle);
      return vehicle;
    });
  },

  async update(id, patch) {
    return withLocalDb((db) => {
      const idx = db.vehicles.findIndex((v) => v.id === id);
      if (idx < 0) throw new Error('Vehicle not found');
      db.vehicles[idx] = { ...db.vehicles[idx], ...patch, id };
      return db.vehicles[idx];
    });
  },
};
