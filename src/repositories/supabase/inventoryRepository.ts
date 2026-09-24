import type { Part } from '../../types';
import type { CreatePartInput, PartStockRow } from '../local/inventoryRepository';
import type { StockMovementType } from '../local/types';
import { requireSupabase, throwIfError } from './client';

type PartRow = {
  id: string;
  organization_id: string;
  sku: string;
  part_number: string | null;
  name: string;
  brand: string | null;
  cost_price: number;
  selling_price: number;
  gst_percent: number;
  reorder_level: number;
  barcode: string | null;
};

function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sku: row.sku,
    partNumber: row.part_number,
    name: row.name,
    brand: row.brand,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    gstPercent: Number(row.gst_percent),
    reorderLevel: Number(row.reorder_level),
    barcode: row.barcode,
  };
}

export async function ensureSupabaseInventorySeed(
  organizationId: string,
  branchId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('seed_demo_inventory', {
    p_organization_id: organizationId,
    p_branch_id: branchId,
  });
  // Function may not exist yet if 014 not applied — ignore gracefully
  if (error && !/seed_demo_inventory|function/i.test(error.message)) {
    throwIfError(error, 'Could not seed inventory');
  }
}

export async function listSupabasePartsWithStock(params: {
  organizationId: string;
  branchId: string;
  search?: string;
}): Promise<PartStockRow[]> {
  const sb = requireSupabase();
  await ensureSupabaseInventorySeed(params.organizationId, params.branchId);

  let q = sb
    .from('parts')
    .select('*')
    .eq('organization_id', params.organizationId)
    .order('name');

  if (params.search?.trim()) {
    const s = params.search.trim();
    q = q.or(
      `name.ilike.%${s}%,sku.ilike.%${s}%,part_number.ilike.%${s}%,barcode.ilike.%${s}%`,
    );
  }

  const { data: parts, error } = await q;
  throwIfError(error, 'Could not load parts');

  const { data: stock, error: stockError } = await sb
    .from('branch_stock')
    .select('*')
    .eq('branch_id', params.branchId);
  throwIfError(stockError, 'Could not load stock');

  const stockByPart = new Map(
    (stock ?? []).map((s) => [s.part_id as string, s]),
  );

  return (parts ?? [])
    .map((row) => {
      const part = mapPart(row as PartRow);
      const s = stockByPart.get(part.id);
      const quantityOnHand = Number(s?.quantity_on_hand ?? 0);
      return {
        ...part,
        quantityOnHand,
        quantityReserved: Number(s?.quantity_reserved ?? 0),
        belowReorder: quantityOnHand <= part.reorderLevel,
      };
    })
    .sort(
      (a, b) =>
        Number(b.belowReorder) - Number(a.belowReorder) || a.name.localeCompare(b.name),
    );
}

export async function countSupabaseReorderAlerts(
  organizationId: string,
  branchId: string,
): Promise<number> {
  const rows = await listSupabasePartsWithStock({ organizationId, branchId });
  return rows.filter((r) => r.belowReorder).length;
}

export async function createSupabasePart(input: CreatePartInput): Promise<PartStockRow> {
  const sb = requireSupabase();
  const sku =
    input.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;

  const { data: part, error } = await sb
    .from('parts')
    .insert({
      organization_id: input.organizationId,
      sku,
      part_number: input.partNumber?.trim() || null,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      cost_price: input.costPrice,
      selling_price: input.sellingPrice,
      gst_percent: input.gstPercent ?? 18,
      reorder_level: input.reorderLevel ?? 0,
      barcode: input.barcode?.trim() || null,
    })
    .select('*')
    .single();
  throwIfError(error, 'Could not create part');

  const qty = input.openingStock ?? 0;
  const { error: stockError } = await sb.from('branch_stock').insert({
    branch_id: input.branchId,
    part_id: part.id,
    quantity_on_hand: qty,
    quantity_reserved: 0,
  });
  throwIfError(stockError, 'Could not create branch stock');

  if (qty > 0) {
    await sb.from('stock_movements').insert({
      organization_id: input.organizationId,
      branch_id: input.branchId,
      part_id: part.id,
      movement_type: 'stock_in',
      quantity: qty,
      unit_cost: input.costPrice,
      notes: 'Opening stock',
    });
  }

  const mapped = mapPart(part as PartRow);
  return {
    ...mapped,
    quantityOnHand: qty,
    quantityReserved: 0,
    belowReorder: qty <= mapped.reorderLevel,
  };
}

export async function adjustSupabaseStock(input: {
  organizationId: string;
  branchId: string;
  partId: string;
  movementType: Extract<StockMovementType, 'stock_in' | 'stock_out' | 'adjustment'>;
  quantity: number;
  notes?: string;
  createdBy?: string;
}): Promise<PartStockRow> {
  if (input.quantity <= 0) throw new Error('Quantity must be greater than zero');
  const sb = requireSupabase();

  const { data: part, error: partError } = await sb
    .from('parts')
    .select('*')
    .eq('id', input.partId)
    .single();
  throwIfError(partError, 'Part not found');

  let { data: stock } = await sb
    .from('branch_stock')
    .select('*')
    .eq('branch_id', input.branchId)
    .eq('part_id', input.partId)
    .maybeSingle();

  if (!stock) {
    const { data: created, error } = await sb
      .from('branch_stock')
      .insert({
        branch_id: input.branchId,
        part_id: input.partId,
        quantity_on_hand: 0,
        quantity_reserved: 0,
      })
      .select('*')
      .single();
    throwIfError(error, 'Could not create stock row');
    stock = created;
  }

  const delta = input.movementType === 'stock_out' ? -input.quantity : input.quantity;
  const next = Math.round((Number(stock.quantity_on_hand) + delta) * 1000) / 1000;
  if (next < 0) throw new Error('Insufficient stock');

  const { error: updError } = await sb
    .from('branch_stock')
    .update({ quantity_on_hand: next })
    .eq('id', stock.id);
  throwIfError(updError, 'Could not update stock');

  const { error: movError } = await sb.from('stock_movements').insert({
    organization_id: input.organizationId,
    branch_id: input.branchId,
    part_id: input.partId,
    movement_type: input.movementType,
    quantity: input.quantity,
    notes: input.notes ?? null,
    created_by: input.createdBy ?? null,
  });
  throwIfError(movError, 'Could not record stock movement');

  const mapped = mapPart(part as PartRow);
  return {
    ...mapped,
    quantityOnHand: next,
    quantityReserved: Number(stock.quantity_reserved ?? 0),
    belowReorder: next <= mapped.reorderLevel,
  };
}

export async function listSupabaseRecentMovements(branchId: string, limit = 20) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('stock_movements')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwIfError(error, 'Could not load movements');
  return (data ?? []).map((m) => ({
    id: m.id as string,
    organizationId: m.organization_id as string,
    branchId: m.branch_id as string,
    partId: m.part_id as string,
    movementType: m.movement_type as StockMovementType,
    quantity: Number(m.quantity),
    unitCost: m.unit_cost != null ? Number(m.unit_cost) : null,
    notes: (m.notes as string) ?? null,
    createdBy: (m.created_by as string) ?? null,
    createdAt: m.created_at as string,
  }));
}
