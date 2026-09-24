import {
  adjustStock,
  countReorderAlerts,
  createPart,
  ensureInventorySeed,
  listPartsWithStock,
} from '../src/repositories/local/inventoryRepository';
import { resetLocalDb } from '../src/repositories/local/storage';
import { CameraOcrProvider } from '../src/providers/ocr/cameraOcrProvider';
import { DemoVehicleInfoProvider } from '../src/providers/vehicle-info/demoVehicleInfoProvider';
import { normalizeIndianRegistration } from '../src/providers/ocr';

const ORG = 'org-1';
const BRANCH = 'branch-1';

describe('inventory', () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it('seeds demo parts and tracks reorder alerts', async () => {
    await ensureInventorySeed(ORG, BRANCH);
    const parts = await listPartsWithStock({ organizationId: ORG, branchId: BRANCH });
    expect(parts.length).toBeGreaterThanOrEqual(4);
    const alerts = await countReorderAlerts(ORG, BRANCH);
    expect(alerts).toBeGreaterThan(0);
  });

  it('supports stock in and stock out', async () => {
    const part = await createPart({
      organizationId: ORG,
      branchId: BRANCH,
      name: 'Spark plug',
      costPrice: 100,
      sellingPrice: 180,
      reorderLevel: 2,
      openingStock: 5,
    });
    expect(part.quantityOnHand).toBe(5);

    const afterOut = await adjustStock({
      organizationId: ORG,
      branchId: BRANCH,
      partId: part.id,
      movementType: 'stock_out',
      quantity: 3,
    });
    expect(afterOut.quantityOnHand).toBe(2);

    const afterIn = await adjustStock({
      organizationId: ORG,
      branchId: BRANCH,
      partId: part.id,
      movementType: 'stock_in',
      quantity: 4,
    });
    expect(afterIn.quantityOnHand).toBe(6);
  });
});

describe('plate OCR + vehicle info providers', () => {
  it('normalizes Indian plates', () => {
    expect(normalizeIndianRegistration('mh 12 ab 1234')).toBe('MH12AB1234');
  });

  it('camera OCR returns a registration', async () => {
    const ocr = new CameraOcrProvider();
    const result = await ocr.extractTextFromImage('file:///tmp/plate.jpg');
    expect(result.registrationNumber).toMatch(/^[A-Z]{2}\d/);
  });

  it('demo vehicle info resolves known plates', async () => {
    const provider = new DemoVehicleInfoProvider();
    const info = await provider.getVehicleDetails('MH12AB1234');
    expect(info?.brand).toBe('Maruti');
    expect(info?.ownerName).toBe('Ravi Kumar');
  });
});
