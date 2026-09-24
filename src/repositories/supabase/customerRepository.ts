import type { Customer } from '../../types';
import type { CustomerRepository, ListParams } from '../types';
import { requireSupabase, throwIfError } from './client';
import { mapCustomer } from './mappers';

export const supabaseCustomerRepository: CustomerRepository = {
  async list(params) {
    const sb = requireSupabase();
    let q = sb
      .from('customers')
      .select('*')
      .eq('organization_id', params.organizationId)
      .order('created_at', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

    if (params.branchId) q = q.or(`branch_id.eq.${params.branchId},branch_id.is.null`);
    if (params.search?.trim()) {
      const s = params.search.trim();
      q = q.or(`name.ilike.%${s}%,mobile.ilike.%${s}%`);
    }

    const { data, error } = await q;
    throwIfError(error, 'Could not load customers');
    return (data ?? []).map(mapCustomer);
  },

  async getById(id) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('customers').select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'Could not load customer');
    return data ? mapCustomer(data) : null;
  },

  async findByMobile(organizationId, mobile) {
    const sb = requireSupabase();
    const normalized = mobile.replace(/\D/g, '');
    const { data, error } = await sb
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('mobile', normalized)
      .maybeSingle();
    throwIfError(error, 'Could not find customer');
    return data ? mapCustomer(data) : null;
  },

  async create(input) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('customers')
      .insert({
        organization_id: input.organizationId,
        branch_id: input.branchId ?? null,
        name: input.name,
        mobile: input.mobile.replace(/\D/g, ''),
        alternate_mobile: input.alternateMobile ?? null,
        email: input.email ?? null,
        address_line1: input.addressLine1 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        pincode: input.pincode ?? null,
        gstin: input.gstin ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    throwIfError(error, 'Could not create customer');
    return mapCustomer(data);
  },

  async update(id, patch) {
    const sb = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.name != null) payload.name = patch.name;
    if (patch.mobile != null) payload.mobile = patch.mobile.replace(/\D/g, '');
    if (patch.alternateMobile !== undefined) payload.alternate_mobile = patch.alternateMobile;
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.gstin !== undefined) payload.gstin = patch.gstin;
    if (patch.notes !== undefined) payload.notes = patch.notes;
    if (patch.city !== undefined) payload.city = patch.city;
    if (patch.state !== undefined) payload.state = patch.state;
    if (patch.pincode !== undefined) payload.pincode = patch.pincode;
    if (patch.addressLine1 !== undefined) payload.address_line1 = patch.addressLine1;
    if (patch.outstandingDue != null) payload.outstanding_due = patch.outstandingDue;
    if (patch.totalRevenue != null) payload.total_revenue = patch.totalRevenue;

    const { data, error } = await sb
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    throwIfError(error, 'Could not update customer');
    return mapCustomer(data);
  },
};
