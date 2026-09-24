import type { VehicleInfo, VehicleInfoProvider } from './types';
import { normalizeIndianRegistration } from '../ocr';

/** Demo India plates for VehicleInfoProvider until a real Vahan API is wired. */
const DEMO_REGISTRY: Record<string, VehicleInfo> = {
  MH12AB1234: {
    registrationNumber: 'MH12AB1234',
    ownerName: 'Ravi Kumar',
    vehicleType: 'car',
    brand: 'Maruti',
    model: 'Swift',
    fuelType: 'petrol',
    registrationDate: '2019-06-14',
    chassisNumber: 'MA3EJLF1S00123456',
    engineNumber: 'K12MN1234567',
    insuranceProvider: 'ICICI Lombard',
    insuranceExpiry: '2026-12-31',
    raw: { source: 'demo' },
  },
  KA01MJ9087: {
    registrationNumber: 'KA01MJ9087',
    ownerName: 'Priya Sharma',
    vehicleType: 'suv',
    brand: 'Hyundai',
    model: 'Creta',
    fuelType: 'diesel',
    registrationDate: '2021-03-02',
    insuranceProvider: 'Bajaj Allianz',
    insuranceExpiry: '2027-03-01',
    raw: { source: 'demo' },
  },
  TN09BC4455: {
    registrationNumber: 'TN09BC4455',
    ownerName: 'Arun R',
    vehicleType: 'bike',
    brand: 'Honda',
    model: 'Activa',
    fuelType: 'petrol',
    registrationDate: '2020-11-20',
    insuranceProvider: 'New India Assurance',
    insuranceExpiry: '2026-11-19',
    raw: { source: 'demo' },
  },
};

export class DemoVehicleInfoProvider implements VehicleInfoProvider {
  readonly name = 'demo-india';

  async validateVehicle(registrationNumber: string): Promise<boolean> {
    const reg = normalizeIndianRegistration(registrationNumber);
    return Boolean(reg);
  }

  async getVehicleDetails(registrationNumber: string): Promise<VehicleInfo | null> {
    const reg = normalizeIndianRegistration(registrationNumber);
    if (!reg) return null;
    if (DEMO_REGISTRY[reg]) return { ...DEMO_REGISTRY[reg] };
    return {
      registrationNumber: reg,
      ownerName: null,
      vehicleType: 'car',
      brand: null,
      model: null,
      fuelType: null,
      registrationDate: null,
      insuranceProvider: null,
      insuranceExpiry: null,
      raw: { source: this.name, matched: false },
    };
  }
}

export const DEMO_PLATES = Object.keys(DEMO_REGISTRY);
