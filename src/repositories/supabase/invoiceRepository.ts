import type { Invoice, Payment } from '../../types';
import type { InvoiceRepository, ListParams } from '../types';
import { requireSupabase, throwIfError } from './client';
import { mapInvoice, mapPayment } from './mappers';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export const supabaseInvoiceRepository: InvoiceRepository = {
  async list(params: ListParams & { status?: Invoice['status'] | Invoice['status'][] }) {
    const sb = requireSupabase();
    let q = sb
      .from('invoices')
      .select('*')
      .eq('organization_id', params.organizationId)
      .order('created_at', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

    if (params.branchId) q = q.eq('branch_id', params.branchId);
    if (params.status) {
      if (Array.isArray(params.status)) q = q.in('status', params.status);
      else q = q.eq('status', params.status);
    }

    const { data, error } = await q;
    throwIfError(error, 'Could not load invoices');
    return (data ?? []).map(mapInvoice);
  },

  async getById(id) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('invoices').select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'Could not load invoice');
    return data ? mapInvoice(data) : null;
  },

  async createFromJobCard(jobCardId, createdBy) {
    const sb = requireSupabase();
    const { data: job, error: jobError } = await sb
      .from('job_cards')
      .select('*')
      .eq('id', jobCardId)
      .single();
    throwIfError(jobError, 'Job card not found');

    const { data: estimates } = await sb
      .from('estimates')
      .select('*')
      .eq('job_card_id', jobCardId)
      .order('created_at', { ascending: false });

    const estimate =
      (estimates ?? []).find((e) => e.status === 'approved') ?? (estimates ?? [])[0];

    const total = Number(estimate?.total_amount ?? job.estimated_cost ?? 0);
    const cgst = Number(estimate?.cgst_amount ?? 0);
    const sgst = Number(estimate?.sgst_amount ?? 0);
    const igst = Number(estimate?.igst_amount ?? 0);
    const subtotal = Number(estimate?.subtotal ?? total);
    const invoiceNumber = `INV-${todayStamp()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const invoiceDate = new Date().toISOString().slice(0, 10);

    const { data, error } = await sb
      .from('invoices')
      .insert({
        organization_id: job.organization_id,
        branch_id: job.branch_id,
        job_card_id: job.id,
        estimate_id: estimate?.id ?? null,
        customer_id: job.customer_id,
        vehicle_id: job.vehicle_id,
        invoice_number: invoiceNumber,
        status: 'issued',
        invoice_date: invoiceDate,
        subtotal,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: total,
        amount_paid: 0,
        amount_due: total,
        created_by: createdBy,
      })
      .select('*')
      .single();
    throwIfError(error, 'Could not create invoice');

    const { data: customer } = await sb
      .from('customers')
      .select('outstanding_due')
      .eq('id', job.customer_id)
      .single();
    if (customer) {
      await sb
        .from('customers')
        .update({
          outstanding_due: Number(customer.outstanding_due) + total,
        })
        .eq('id', job.customer_id);
    }

    return mapInvoice(data);
  },

  async recordPayment(invoiceId, paymentInput) {
    const sb = requireSupabase();
    const { data: invoiceRow, error: invError } = await sb
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    throwIfError(invError, 'Invoice not found');

    const { data: paymentRow, error: payError } = await sb
      .from('payments')
      .insert({
        organization_id: invoiceRow.organization_id,
        branch_id: invoiceRow.branch_id,
        invoice_id: invoiceId,
        amount: paymentInput.amount,
        payment_mode: paymentInput.paymentMode,
        reference_number: paymentInput.referenceNumber ?? null,
        paid_at: paymentInput.paidAt,
      })
      .select('*')
      .single();
    throwIfError(payError, 'Could not record payment');

    const amountPaid =
      Math.round((Number(invoiceRow.amount_paid) + paymentInput.amount) * 100) / 100;
    const amountDue = Math.max(
      0,
      Math.round((Number(invoiceRow.total_amount) - amountPaid) * 100) / 100,
    );
    const status =
      amountDue <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : invoiceRow.status;

    const { data: updated, error: updError } = await sb
      .from('invoices')
      .update({ amount_paid: amountPaid, amount_due: amountDue, status })
      .eq('id', invoiceId)
      .select('*')
      .single();
    throwIfError(updError, 'Could not update invoice');

    const { data: customer } = await sb
      .from('customers')
      .select('outstanding_due, total_revenue')
      .eq('id', invoiceRow.customer_id)
      .single();
    if (customer) {
      const outstanding = Math.max(
        0,
        Math.round((Number(customer.outstanding_due) - paymentInput.amount) * 100) / 100,
      );
      const totalRevenue =
        amountDue <= 0
          ? Math.round((Number(customer.total_revenue) + Number(invoiceRow.total_amount)) * 100) /
            100
          : Number(customer.total_revenue);
      await sb
        .from('customers')
        .update({ outstanding_due: outstanding, total_revenue: totalRevenue })
        .eq('id', invoiceRow.customer_id);
    }

    return { invoice: mapInvoice(updated), payment: mapPayment(paymentRow) };
  },
};

export async function listSupabaseInvoicesByJob(jobCardId: string) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('invoices')
    .select('*')
    .eq('job_card_id', jobCardId)
    .order('created_at', { ascending: false });
  throwIfError(error, 'Could not load invoices');
  return (data ?? []).map(mapInvoice);
}
