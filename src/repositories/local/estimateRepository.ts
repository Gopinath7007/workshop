import type { Estimate, EstimateLine } from '../../types';
import type { EstimateRepository } from '../types';
import { calculateGst } from '../../utils/gst';
import { newId, todayStamp, withLocalDb } from './storage';
import type { LocalEstimate } from './types';

export type CreateEstimateInput = {
  organizationId: string;
  branchId: string;
  jobCardId: string;
  lines: Array<{
    lineType: EstimateLine['lineType'];
    description: string;
    quantity: number;
    unitPrice: number;
    gstPercent?: number;
  }>;
  discountAmount?: number;
  interState?: boolean;
  notes?: string;
};

export async function createLocalEstimate(input: CreateEstimateInput): Promise<LocalEstimate> {
  return withLocalDb((db) => {
    db.counters.estimate += 1;
    const lines: EstimateLine[] = input.lines.map((line, index) => {
      const gstPercent = line.gstPercent ?? 18;
      const gross = line.quantity * line.unitPrice;
      const lineTotal = Math.round((gross + Number.EPSILON) * 100) / 100;
      return {
        id: newId(),
        estimateId: '',
        lineType: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        gstPercent,
        lineTotal,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const discountAmount = input.discountAmount ?? 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const avgGst =
      lines.length > 0
        ? lines.reduce((s, l) => s + l.gstPercent, 0) / lines.length
        : 18;
    const gst = calculateGst({
      taxableAmount: taxable,
      gstPercent: avgGst,
      interState: input.interState,
    });

    const estimateId = newId();
    lines.forEach((l) => {
      l.estimateId = estimateId;
    });

    const estimate: LocalEstimate = {
      id: estimateId,
      organizationId: input.organizationId,
      branchId: input.branchId,
      jobCardId: input.jobCardId,
      estimateNumber: `EST-${todayStamp()}-${String(db.counters.estimate).padStart(4, '0')}`,
      status: 'draft',
      subtotal,
      discountAmount,
      cgstAmount: gst.cgst,
      sgstAmount: gst.sgst,
      igstAmount: gst.igst,
      totalAmount: gst.total,
      lines,
    };
    db.estimates.unshift(estimate);
    return estimate;
  });
}

export const localEstimateRepository: EstimateRepository = {
  async list(params) {
    return withLocalDb((db) =>
      db.estimates
        .filter((e) => e.organizationId === params.organizationId)
        .filter((e) => !params.branchId || e.branchId === params.branchId)
        .filter((e) => {
          if (!params.status) return true;
          return Array.isArray(params.status)
            ? params.status.includes(e.status)
            : e.status === params.status;
        })
        .filter((e) => {
          if (!params.search?.trim()) return true;
          const q = params.search.trim().toLowerCase();
          return e.estimateNumber.toLowerCase().includes(q) || e.jobCardId.includes(q);
        })
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100)),
    );
  },

  async listByJobCard(jobCardId) {
    return withLocalDb((db) => db.estimates.filter((e) => e.jobCardId === jobCardId));
  },

  async getById(id) {
    return withLocalDb((db) => db.estimates.find((e) => e.id === id) ?? null);
  },

  async create(input) {
    const lines = (input.lines as CreateEstimateInput['lines']) ?? [];
    return createLocalEstimate({
      organizationId: input.organizationId,
      branchId: input.branchId,
      jobCardId: input.jobCardId,
      lines,
      discountAmount: input.discountAmount,
    });
  },

  async updateStatus(id, status) {
    return withLocalDb((db) => {
      const idx = db.estimates.findIndex((e) => e.id === id);
      if (idx < 0) throw new Error('Estimate not found');
      db.estimates[idx] = { ...db.estimates[idx], status };
      return db.estimates[idx];
    });
  },
};

export async function getLocalEstimate(id: string): Promise<LocalEstimate | null> {
  return withLocalDb((db) => db.estimates.find((e) => e.id === id) ?? null);
}
