import type { JobCard, JobCardStatus } from '../../types';
import type { CreateJobCardInput, JobCardRepository, ListParams } from '../types';
import { requireSupabase, throwIfError } from './client';
import { mapJobCard } from './mappers';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export const supabaseJobCardRepository: JobCardRepository = {
  async list(params: ListParams & { status?: JobCardStatus | JobCardStatus[] }) {
    const sb = requireSupabase();
    let q = sb
      .from('job_cards')
      .select('*')
      .eq('organization_id', params.organizationId)
      .order('created_at', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

    if (params.branchId) q = q.eq('branch_id', params.branchId);
    if (params.status) {
      if (Array.isArray(params.status)) q = q.in('status', params.status);
      else q = q.eq('status', params.status);
    }
    if (params.search?.trim()) {
      q = q.ilike('job_number', `%${params.search.trim()}%`);
    }

    const { data, error } = await q;
    throwIfError(error, 'Could not load job cards');
    return (data ?? []).map(mapJobCard);
  },

  async getById(id) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('job_cards').select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'Could not load job card');
    return data ? mapJobCard(data) : null;
  },

  async create(input: CreateJobCardInput) {
    const sb = requireSupabase();
    const jobNumber = `JC-${todayStamp()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const { data, error } = await sb
      .from('job_cards')
      .insert({
        organization_id: input.organizationId,
        branch_id: input.branchId,
        job_number: jobNumber,
        vehicle_id: input.vehicleId,
        customer_id: input.customerId,
        advisor_id: input.advisorId ?? null,
        complaints: input.complaints ?? null,
        odometer_in: input.odometerIn ?? null,
        estimated_cost: input.estimatedCost ?? 0,
        estimated_delivery_at: input.estimatedDeliveryAt ?? null,
        created_by: input.createdBy ?? null,
        status: 'open',
      })
      .select('*')
      .single();
    throwIfError(error, 'Could not create job card');

    await sb.from('job_status_history').insert({
      job_card_id: data.id,
      from_status: null,
      to_status: 'open',
      changed_by: input.createdBy ?? null,
      note: 'Job card created',
    });

    return mapJobCard(data);
  },

  async update(id, patch) {
    const sb = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.complaints !== undefined) payload.complaints = patch.complaints;
    if (patch.estimatedCost != null) payload.estimated_cost = patch.estimatedCost;
    if (patch.technicianId !== undefined) payload.technician_id = patch.technicianId;
    if (patch.advisorId !== undefined) payload.advisor_id = patch.advisorId;
    if (patch.status != null) payload.status = patch.status;

    const { data, error } = await sb
      .from('job_cards')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(error, 'Could not update job card');
    return mapJobCard(data);
  },

  async transition(id, toStatus, changedBy, note) {
    const sb = requireSupabase();
    const current = await this.getById(id);
    if (!current) throw new Error('Job card not found');

    const { data, error } = await sb
      .from('job_cards')
      .update({ status: toStatus })
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(error, 'Could not transition job card');

    await sb.from('job_status_history').insert({
      job_card_id: id,
      from_status: current.status,
      to_status: toStatus,
      changed_by: changedBy,
      note: note ?? null,
    });

    return mapJobCard(data);
  },
};

export async function listSupabaseJobStatusHistory(jobCardId: string) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('job_status_history')
    .select('*')
    .eq('job_card_id', jobCardId)
    .order('created_at', { ascending: false });
  throwIfError(error, 'Could not load status history');
  return (data ?? []).map((h) => ({
    id: h.id as string,
    jobCardId: h.job_card_id as string,
    fromStatus: h.from_status as JobCardStatus | null,
    toStatus: h.to_status as JobCardStatus,
    changedBy: (h.changed_by as string) ?? 'system',
    note: (h.note as string) ?? undefined,
    createdAt: h.created_at as string,
  }));
}
