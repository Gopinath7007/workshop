import { calculateGst } from '../../utils/gst';
import type { Estimate, EstimateLine } from '../../types';
import type { EstimateRepository } from '../types';
import type { CreateEstimateInput } from '../local/estimateRepository';
import { requireSupabase, throwIfError } from './client';
import { mapEstimate } from './mappers';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function createSupabaseEstimate(input: CreateEstimateInput): Promise<Estimate & { lines: EstimateLine[] }> {
  const sb = requireSupabase();
  const linesInput = input.lines;
  const computed = linesInput.map((line) => {
    const lineTotal = Math.round(line.quantity * line.unitPrice * 100) / 100;
    return { ...line, gstPercent: line.gstPercent ?? 18, lineTotal };
  });
  const subtotal = computed.reduce((s, l) => s + l.lineTotal, 0);
  const discountAmount = input.discountAmount ?? 0;
  const taxable = Math.max(0, subtotal - discountAmount);
  const avgGst =
    computed.length > 0 ? computed.reduce((s, l) => s + l.gstPercent, 0) / computed.length : 18;
  const gst = calculateGst({
    taxableAmount: taxable,
    gstPercent: avgGst,
    interState: input.interState,
  });

  const estimateNumber = `EST-${todayStamp()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const { data: estimate, error } = await sb
    .from('estimates')
    .insert({
      organization_id: input.organizationId,
      branch_id: input.branchId,
      job_card_id: input.jobCardId,
      estimate_number: estimateNumber,
      status: 'draft',
      subtotal,
      discount_amount: discountAmount,
      taxable_amount: taxable,
      cgst_amount: gst.cgst,
      sgst_amount: gst.sgst,
      igst_amount: gst.igst,
      total_amount: gst.total,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  throwIfError(error, 'Could not create estimate');

  const lineRows = computed.map((line, index) => ({
    estimate_id: estimate.id,
    line_type: line.lineType,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    gst_percent: line.gstPercent,
    line_total: line.lineTotal,
    sort_order: index,
  }));

  const { data: lines, error: lineError } = await sb
    .from('estimate_lines')
    .insert(lineRows)
    .select('*');
  throwIfError(lineError, 'Could not create estimate lines');

  return {
    ...mapEstimate(estimate),
    lines: (lines ?? []).map((l) => ({
      id: l.id,
      estimateId: l.estimate_id,
      lineType: l.line_type,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      gstPercent: Number(l.gst_percent),
      lineTotal: Number(l.line_total),
    })),
  };
}

export const supabaseEstimateRepository: EstimateRepository = {
  async listByJobCard(jobCardId) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('estimates')
      .select('*')
      .eq('job_card_id', jobCardId)
      .order('created_at', { ascending: false });
    throwIfError(error, 'Could not load estimates');
    return (data ?? []).map(mapEstimate);
  },

  async getById(id) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('estimates').select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'Could not load estimate');
    return data ? mapEstimate(data) : null;
  },

  async create(input) {
    return createSupabaseEstimate({
      organizationId: input.organizationId,
      branchId: input.branchId,
      jobCardId: input.jobCardId,
      lines: (input.lines as CreateEstimateInput['lines']) ?? [],
      discountAmount: input.discountAmount,
    });
  },

  async updateStatus(id, status) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('estimates')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(error, 'Could not update estimate');
    return mapEstimate(data);
  },
};
