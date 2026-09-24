import type { BranchStock, Part } from '../../types';
import type { LocalDb, LocalStockMovement, StockMovementType } from './types';
import { newId, withLocalDb } from './storage';

export type PartStockRow = Part & {
  quantityOnHand: number;
  quantityReserved: number;
  belowReorder: boolean;
};

export type CreatePartInput = {
  organizationId: string;
  branchId: string;
  sku?: string;
  partNumber?: string;
  name: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  gstPercent?: number;
  reorderLevel?: number;
  barcode?: string;
  openingStock?: number;
};

function ensureDemoInventory(db: LocalDb, organizationId: string, branchId: string) {
  if (db.seededDemoInventory || db.parts.length > 0) return;
  const samples: Array<Omit<Part, 'id'> & { qty: number }> = [
    {
      organizationId,
      sku: 'BRK-PAD-001',
      partNumber: 'BP-SWIFT',
      name: 'Front brake pads',
      brand: 'Bosch',
      costPrice: 650,
      sellingPrice: 980,
      gstPercent: 18,
      reorderLevel: 4,
      barcode: '8901001001001',
      qty: 2,
    },
    {
      organizationId,
      sku: 'OIL-5W30-4L',
      partNumber: 'EO-5W30',
      name: 'Engine oil 5W-30 4L',
      brand: 'Castrol',
      costPrice: 1200,
      sellingPrice: 1650,
      gstPercent: 18,
      reorderLevel: 6,
      barcode: '8901001001002',
      qty: 10,
    },
    {
      organizationId,
      sku: 'FIL-OIL-001',
      partNumber: 'OF-001',
      name: 'Oil filter',
      brand: 'Mann',
      costPrice: 180,
      sellingPrice: 320,
      gstPercent: 18,
      reorderLevel: 8,
      barcode: '8901001001003',
      qty: 5,
    },
    {
      organizationId,
      sku: 'WPR-BLD-22',
      partNumber: 'WB-22',
      name: 'Wiper blade 22"',
      brand: 'Bosch',
      costPrice: 220,
      sellingPrice: 399,
      gstPercent: 18,
      reorderLevel: 5,
      barcode: '8901001001004',
      qty: 1,
    },
  ];

  for (const sample of samples) {
    db.counters.part += 1;
    const { qty, ...partFields } = sample;
    const part: Part = { id: newId(), ...partFields };
    db.parts.push(part);
    const stock: BranchStock = {
      id: newId(),
      branchId,
      partId: part.id,
      quantityOnHand: qty,
      quantityReserved: 0,
    };
    db.branchStock.push(stock);
  }
  db.seededDemoInventory = true;
}

export async function ensureInventorySeed(organizationId: string, branchId: string) {
  return withLocalDb((db) => {
    ensureDemoInventory(db, organizationId, branchId);
  });
}

export async function listPartsWithStock(params: {
  organizationId: string;
  branchId: string;
  search?: string;
}): Promise<PartStockRow[]> {
  return withLocalDb((db) => {
    ensureDemoInventory(db, params.organizationId, params.branchId);
    return db.parts
      .filter((p) => p.organizationId === params.organizationId)
      .filter((p) => {
        if (!params.search?.trim()) return true;
        const q = params.search.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.partNumber?.toLowerCase().includes(q) ?? false) ||
          (p.barcode?.includes(q) ?? false)
        );
      })
      .map((part) => {
        const stock = db.branchStock.find(
          (s) => s.branchId === params.branchId && s.partId === part.id,
        );
        const quantityOnHand = stock?.quantityOnHand ?? 0;
        return {
          ...part,
          quantityOnHand,
          quantityReserved: stock?.quantityReserved ?? 0,
          belowReorder: quantityOnHand <= part.reorderLevel,
        };
      })
      .sort((a, b) => Number(b.belowReorder) - Number(a.belowReorder) || a.name.localeCompare(b.name));
  });
}

export async function countReorderAlerts(organizationId: string, branchId: string): Promise<number> {
  const rows = await listPartsWithStock({ organizationId, branchId });
  return rows.filter((r) => r.belowReorder).length;
}

export async function createPart(input: CreatePartInput): Promise<PartStockRow> {
  return withLocalDb((db) => {
    db.counters.part += 1;
    const part: Part = {
      id: newId(),
      organizationId: input.organizationId,
      sku: input.sku?.trim() || `SKU-${String(db.counters.part).padStart(4, '0')}`,
      partNumber: input.partNumber?.trim() || null,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      gstPercent: input.gstPercent ?? 18,
      reorderLevel: input.reorderLevel ?? 0,
      barcode: input.barcode?.trim() || null,
    };
    db.parts.unshift(part);
    const qty = input.openingStock ?? 0;
    db.branchStock.push({
      id: newId(),
      branchId: input.branchId,
      partId: part.id,
      quantityOnHand: qty,
      quantityReserved: 0,
    });
    if (qty > 0) {
      db.stockMovements.unshift({
        id: newId(),
        organizationId: input.organizationId,
        branchId: input.branchId,
        partId: part.id,
        movementType: 'stock_in',
        quantity: qty,
        unitCost: input.costPrice,
        notes: 'Opening stock',
        createdAt: new Date().toISOString(),
      });
    }
    return {
      ...part,
      quantityOnHand: qty,
      quantityReserved: 0,
      belowReorder: qty <= part.reorderLevel,
    };
  });
}

export async function adjustStock(input: {
  organizationId: string;
  branchId: string;
  partId: string;
  movementType: Extract<StockMovementType, 'stock_in' | 'stock_out' | 'adjustment'>;
  quantity: number;
  notes?: string;
  createdBy?: string;
}): Promise<PartStockRow> {
  if (input.quantity <= 0) throw new Error('Quantity must be greater than zero');

  return withLocalDb((db) => {
    const part = db.parts.find((p) => p.id === input.partId);
    if (!part) throw new Error('Part not found');

    let stock = db.branchStock.find(
      (s) => s.branchId === input.branchId && s.partId === input.partId,
    );
    if (!stock) {
      stock = {
        id: newId(),
        branchId: input.branchId,
        partId: input.partId,
        quantityOnHand: 0,
        quantityReserved: 0,
      };
      db.branchStock.push(stock);
    }

    const delta =
      input.movementType === 'stock_out' ? -input.quantity : input.quantity;
    const next = Math.round((stock.quantityOnHand + delta) * 1000) / 1000;
    if (next < 0) throw new Error('Insufficient stock');
    stock.quantityOnHand = next;

    const movement: LocalStockMovement = {
      id: newId(),
      organizationId: input.organizationId,
      branchId: input.branchId,
      partId: input.partId,
      movementType: input.movementType,
      quantity: input.quantity,
      notes: input.notes ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: new Date().toISOString(),
    };
    db.stockMovements.unshift(movement);

    return {
      ...part,
      quantityOnHand: stock.quantityOnHand,
      quantityReserved: stock.quantityReserved,
      belowReorder: stock.quantityOnHand <= part.reorderLevel,
    };
  });
}

export async function listRecentMovements(branchId: string, limit = 20) {
  return withLocalDb((db) =>
    db.stockMovements.filter((m) => m.branchId === branchId).slice(0, limit),
  );
}
