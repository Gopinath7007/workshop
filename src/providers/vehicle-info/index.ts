import { DemoVehicleInfoProvider } from './demoVehicleInfoProvider';
import type { VehicleInfoProvider } from './types';

let active: VehicleInfoProvider = new DemoVehicleInfoProvider();

export function getVehicleInfoProvider(): VehicleInfoProvider {
  return active;
}

export function setVehicleInfoProvider(provider: VehicleInfoProvider): void {
  active = provider;
}

export * from './types';
export { DemoVehicleInfoProvider, DEMO_PLATES } from './demoVehicleInfoProvider';
export { MockVehicleInfoProvider } from './mockVehicleInfoProvider';
