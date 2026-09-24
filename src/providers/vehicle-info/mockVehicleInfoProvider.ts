import type { VehicleInfo, VehicleInfoProvider } from './types';

/** Returns empty/null until a real India vehicle API is configured. */
export class MockVehicleInfoProvider implements VehicleInfoProvider {
  readonly name = 'mock';

  async validateVehicle(registrationNumber: string): Promise<boolean> {
    return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(registrationNumber.toUpperCase());
  }

  async getVehicleDetails(registrationNumber: string): Promise<VehicleInfo | null> {
    const valid = await this.validateVehicle(registrationNumber);
    if (!valid) return null;
    return {
      registrationNumber: registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      ownerName: null,
      vehicleType: 'car',
      brand: null,
      model: null,
      fuelType: null,
      registrationDate: null,
      insuranceProvider: null,
      insuranceExpiry: null,
      raw: { source: this.name },
    };
  }
}
