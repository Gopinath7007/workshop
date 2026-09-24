/**
 * Third-party / government vehicle info abstraction (India Vahan-style later).
 */
export interface VehicleInfo {
  registrationNumber: string;
  ownerName?: string | null;
  vehicleType?: string | null;
  brand?: string | null;
  model?: string | null;
  fuelType?: string | null;
  registrationDate?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  insuranceProvider?: string | null;
  insuranceExpiry?: string | null;
  raw?: Record<string, unknown>;
}

export interface VehicleInfoProvider {
  readonly name: string;
  validateVehicle(registrationNumber: string): Promise<boolean>;
  getVehicleDetails(registrationNumber: string): Promise<VehicleInfo | null>;
}
