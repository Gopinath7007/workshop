/**
 * India vehicle catalog (reference data).
 * Used by local mode directly; mirrored into Postgres via 016_vehicle_catalog.sql.
 */

export type VehicleFocus = 'two_wheeler' | 'four_wheeler' | 'both';

export type CatalogVehicleType = 'car' | 'suv' | 'bike' | 'scooter' | 'commercial' | 'other';

export type CatalogFuel = 'petrol' | 'diesel' | 'cng' | 'ev' | 'hybrid' | 'other';

export type CatalogMake = {
  name: string;
  category: VehicleFocus;
};

export type CatalogModel = {
  make: string;
  name: string;
  category: 'two_wheeler' | 'four_wheeler';
  vehicleType: CatalogVehicleType;
  defaultFuel?: CatalogFuel;
};

export const INDIAN_VEHICLE_MAKES: CatalogMake[] = [
  // Four wheelers
  { name: 'Maruti Suzuki', category: 'four_wheeler' },
  { name: 'Hyundai', category: 'four_wheeler' },
  { name: 'Tata', category: 'four_wheeler' },
  { name: 'Mahindra', category: 'four_wheeler' },
  { name: 'Toyota', category: 'four_wheeler' },
  { name: 'Kia', category: 'four_wheeler' },
  { name: 'Honda Cars', category: 'four_wheeler' },
  { name: 'MG Motor', category: 'four_wheeler' },
  { name: 'Skoda', category: 'four_wheeler' },
  { name: 'Volkswagen', category: 'four_wheeler' },
  { name: 'Renault', category: 'four_wheeler' },
  { name: 'Nissan', category: 'four_wheeler' },
  { name: 'Citroën', category: 'four_wheeler' },
  { name: 'Jeep', category: 'four_wheeler' },
  { name: 'BYD', category: 'four_wheeler' },
  { name: 'Force Motors', category: 'four_wheeler' },
  // Two wheelers
  { name: 'Hero', category: 'two_wheeler' },
  { name: 'Honda Motorcycle', category: 'two_wheeler' },
  { name: 'TVS', category: 'two_wheeler' },
  { name: 'Bajaj', category: 'two_wheeler' },
  { name: 'Royal Enfield', category: 'two_wheeler' },
  { name: 'Yamaha', category: 'two_wheeler' },
  { name: 'Suzuki Motorcycle', category: 'two_wheeler' },
  { name: 'KTM', category: 'two_wheeler' },
  { name: 'Ola Electric', category: 'two_wheeler' },
  { name: 'Ather', category: 'two_wheeler' },
  { name: 'Jawa', category: 'two_wheeler' },
  { name: 'Triumph', category: 'two_wheeler' },
  { name: 'Harley-Davidson', category: 'two_wheeler' },
];

export const INDIAN_VEHICLE_MODELS: CatalogModel[] = [
  // Maruti
  { make: 'Maruti Suzuki', name: 'Alto K10', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'WagonR', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Celerio', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Swift', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Dzire', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Baleno', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Brezza', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Fronx', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Grand Vitara', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'hybrid' },
  { make: 'Maruti Suzuki', name: 'Ertiga', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'XL6', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Jimny', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Maruti Suzuki', name: 'Invicto', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'hybrid' },
  // Hyundai
  { make: 'Hyundai', name: 'Grand i10 Nios', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'i20', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Aura', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Verna', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Exter', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Venue', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Creta', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Alcazar', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Tucson', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Hyundai', name: 'Ioniq 5', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  // Tata
  { make: 'Tata', name: 'Tiago', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Tigor', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Altroz', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Punch', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Nexon', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Nexon EV', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  { make: 'Tata', name: 'Curvv', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Tata', name: 'Harrier', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Tata', name: 'Safari', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  // Mahindra
  { make: 'Mahindra', name: 'Bolero', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Mahindra', name: 'Bolero Neo', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Mahindra', name: 'Thar', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Mahindra', name: 'Scorpio Classic', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Mahindra', name: 'Scorpio-N', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Mahindra', name: 'XUV3XO', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Mahindra', name: 'XUV700', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Mahindra', name: 'XUV400', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  { make: 'Mahindra', name: 'BE 6e', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  { make: 'Mahindra', name: 'XEV 9e', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  // Toyota
  { make: 'Toyota', name: 'Glanza', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Toyota', name: 'Urban Cruiser Taisor', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Toyota', name: 'Innova Crysta', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Toyota', name: 'Innova Hycross', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'hybrid' },
  { make: 'Toyota', name: 'Fortuner', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Toyota', name: 'Hilux', category: 'four_wheeler', vehicleType: 'commercial', defaultFuel: 'diesel' },
  { make: 'Toyota', name: 'Camry', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'hybrid' },
  // Kia
  { make: 'Kia', name: 'Sonet', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Kia', name: 'Seltos', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Kia', name: 'Syros', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Kia', name: 'Carens', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Kia', name: 'Carnival', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Kia', name: 'EV6', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  // Honda Cars
  { make: 'Honda Cars', name: 'Amaze', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Honda Cars', name: 'City', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Honda Cars', name: 'Elevate', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  // MG
  { make: 'MG Motor', name: 'Comet EV', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'ev' },
  { make: 'MG Motor', name: 'Astor', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'MG Motor', name: 'Hector', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'MG Motor', name: 'ZS EV', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  { make: 'MG Motor', name: 'Windsor EV', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  // Skoda / VW / Renault / Nissan / Citroen / Jeep / BYD / Force
  { make: 'Skoda', name: 'Kylaq', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Skoda', name: 'Kushaq', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Skoda', name: 'Slavia', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Volkswagen', name: 'Taigun', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Volkswagen', name: 'Virtus', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Renault', name: 'Kwid', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Renault', name: 'Triber', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Renault', name: 'Kiger', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Nissan', name: 'Magnite', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Citroën', name: 'C3', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'petrol' },
  { make: 'Citroën', name: 'Basalt', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Citroën', name: 'Aircross', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Jeep', name: 'Compass', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'petrol' },
  { make: 'Jeep', name: 'Meridian', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'BYD', name: 'Atto 3', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'ev' },
  { make: 'BYD', name: 'Seal', category: 'four_wheeler', vehicleType: 'car', defaultFuel: 'ev' },
  { make: 'Force Motors', name: 'Gurkha', category: 'four_wheeler', vehicleType: 'suv', defaultFuel: 'diesel' },
  { make: 'Force Motors', name: 'Traveller', category: 'four_wheeler', vehicleType: 'commercial', defaultFuel: 'diesel' },

  // Hero
  { make: 'Hero', name: 'HF Deluxe', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Splendor Plus', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Passion Pro', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Glamour', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Xtreme 160R', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Xpulse 200', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Pleasure+', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Hero', name: 'Destini 125', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  // Honda 2W
  { make: 'Honda Motorcycle', name: 'Shine', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'SP 125', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'Unicorn', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'Hornet 2.0', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'CB350', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'Activa 6G', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'Activa 125', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Honda Motorcycle', name: 'Dio', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  // TVS
  { make: 'TVS', name: 'Raider 125', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Apache RTR 160', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Apache RTR 200', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Apache RR 310', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Ronin', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Jupiter', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'Ntorq 125', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'TVS', name: 'iQube', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  // Bajaj
  { make: 'Bajaj', name: 'CT 100', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Platina', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Pulsar 150', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Pulsar N160', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Pulsar NS200', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Dominar 400', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Avenger', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Bajaj', name: 'Chetak', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  // RE
  { make: 'Royal Enfield', name: 'Hunter 350', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Classic 350', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Meteor 350', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Bullet 350', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Himalayan 450', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Guerrilla 450', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Super Meteor 650', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Royal Enfield', name: 'Interceptor 650', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  // Yamaha / Suzuki / KTM
  { make: 'Yamaha', name: 'FZ-S', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Yamaha', name: 'MT-15', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Yamaha', name: 'R15 V4', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Yamaha', name: 'Fascino 125', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Yamaha', name: 'Aerox 155', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Suzuki Motorcycle', name: 'Gixxer SF', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Suzuki Motorcycle', name: 'Access 125', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Suzuki Motorcycle', name: 'Avenis', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'Suzuki Motorcycle', name: 'Burgman Street', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'petrol' },
  { make: 'KTM', name: '200 Duke', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'KTM', name: '250 Duke', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'KTM', name: '390 Duke', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'KTM', name: '390 Adventure', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  // EV / premium 2W
  { make: 'Ola Electric', name: 'S1 Air', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  { make: 'Ola Electric', name: 'S1 Pro', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  { make: 'Ola Electric', name: 'Roadster', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'ev' },
  { make: 'Ather', name: '450X', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  { make: 'Ather', name: 'Rizta', category: 'two_wheeler', vehicleType: 'scooter', defaultFuel: 'ev' },
  { make: 'Jawa', name: '42', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Jawa', name: 'Perak', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Triumph', name: 'Speed 400', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Triumph', name: 'Scrambler 400 X', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
  { make: 'Harley-Davidson', name: 'X440', category: 'two_wheeler', vehicleType: 'bike', defaultFuel: 'petrol' },
];

export function filterMakesForFocus(focus: VehicleFocus): CatalogMake[] {
  if (focus === 'both') return INDIAN_VEHICLE_MAKES;
  return INDIAN_VEHICLE_MAKES.filter((m) => m.category === focus || m.category === 'both');
}

export function filterModelsForFocus(
  focus: VehicleFocus,
  make?: string,
): CatalogModel[] {
  return INDIAN_VEHICLE_MODELS.filter((m) => {
    if (focus !== 'both' && m.category !== focus) return false;
    if (make && m.make !== make) return false;
    return true;
  });
}

export function categoriesForFocus(focus: VehicleFocus): Array<'two_wheeler' | 'four_wheeler'> {
  if (focus === 'both') return ['two_wheeler', 'four_wheeler'];
  return [focus];
}
