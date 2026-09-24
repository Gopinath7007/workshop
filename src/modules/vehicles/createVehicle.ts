import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../hooks/usePermissions';
import { getCustomerRepository, getVehicleRepository } from '../../repositories';
import { customerKeys } from '../customers/hooks';
import { vehicleKeys } from '../vehicles/hooks';
import type { FuelType, VehicleType } from '../../types';

export type CreateVehicleFlowInput = {
  registrationNumber: string;
  customerMobile: string;
  customerName: string;
  brand?: string;
  model?: string;
  fuelType?: string;
  vehicleType?: string;
  insuranceProvider?: string;
  insuranceExpiry?: string;
};

export function useCreateVehicle() {
  const qc = useQueryClient();
  const { organizationId, branchId } = usePermissions();

  return useMutation({
    mutationFn: async (input: CreateVehicleFlowInput) => {
      if (!organizationId) throw new Error('Missing organization');
      const customers = getCustomerRepository();
      const vehicles = getVehicleRepository();

      let customer = await customers.findByMobile(organizationId, input.customerMobile);
      if (!customer) {
        customer = await customers.create({
          organizationId,
          branchId,
          name: input.customerName.trim(),
          mobile: input.customerMobile.trim(),
          email: null,
          alternateMobile: null,
          addressLine1: null,
          city: null,
          state: null,
          pincode: null,
          gstin: null,
          notes: null,
        });
      }

      const existing = await vehicles.findByRegistration(
        organizationId,
        input.registrationNumber,
      );
      if (existing) {
        throw new Error('Vehicle with this registration already exists');
      }

      return vehicles.create({
        organizationId,
        customerId: customer.id,
        registrationNumber: input.registrationNumber,
        vehicleType: (input.vehicleType as VehicleType) || 'car',
        brand: input.brand?.trim() || null,
        model: input.model?.trim() || null,
        fuelType: (input.fuelType as FuelType) || null,
        insuranceProvider: input.insuranceProvider?.trim() || null,
        insuranceExpiry: input.insuranceExpiry?.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: vehicleKeys.all });
      await qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
