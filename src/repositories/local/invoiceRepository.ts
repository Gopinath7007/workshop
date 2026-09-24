import type { Invoice, Payment } from '../../types';
import type { InvoiceRepository, ListParams } from '../types';
import { newId, todayStamp, withLocalDb } from './storage';

export const localInvoiceRepository: InvoiceRepository = {
  async list(params: ListParams & { status?: Invoice['status'] | Invoice['status'][] }) {
    return withLocalDb((db) =>
      db.invoices
        .filter((i) => i.organizationId === params.organizationId)
        .filter((i) => !params.branchId || i.branchId === params.branchId)
        .filter((i) => {
          if (!params.status) return true;
          return Array.isArray(params.status)
            ? params.status.includes(i.status)
            : i.status === params.status;
        })
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50)),
    );
  },

  async getById(id) {
    return withLocalDb((db) => db.invoices.find((i) => i.id === id) ?? null);
  },

  async createFromJobCard(jobCardId, createdBy) {
    return withLocalDb((db) => {
      const job = db.jobCards.find((j) => j.id === jobCardId);
      if (!job) throw new Error('Job card not found');

      const estimate =
        db.estimates.find((e) => e.jobCardId === jobCardId && e.status === 'approved') ??
        db.estimates.find((e) => e.jobCardId === jobCardId);

      const total = estimate?.totalAmount ?? job.estimatedCost;
      const cgst = estimate?.cgstAmount ?? 0;
      const sgst = estimate?.sgstAmount ?? 0;
      const igst = estimate?.igstAmount ?? 0;
      const subtotal = estimate?.subtotal ?? total;

      db.counters.invoice += 1;
      const invoiceDate = new Date().toISOString().slice(0, 10);
      const invoice: Invoice = {
        id: newId(),
        organizationId: job.organizationId,
        branchId: job.branchId,
        jobCardId: job.id,
        customerId: job.customerId,
        invoiceNumber: `INV-${todayStamp()}-${String(db.counters.invoice).padStart(4, '0')}`,
        status: 'issued',
        invoiceDate,
        subtotal,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
        amountPaid: 0,
        amountDue: total,
      };
      db.invoices.unshift(invoice);

      const customer = db.customers.find((c) => c.id === job.customerId);
      if (customer) {
        customer.outstandingDue =
          Math.round((customer.outstandingDue + total) * 100) / 100;
      }

      void createdBy;
      return invoice;
    });
  },

  async recordPayment(invoiceId, paymentInput) {
    return withLocalDb((db) => {
      const idx = db.invoices.findIndex((i) => i.id === invoiceId);
      if (idx < 0) throw new Error('Invoice not found');

      const payment: Payment = {
        id: newId(),
        invoiceId,
        amount: paymentInput.amount,
        paymentMode: paymentInput.paymentMode,
        referenceNumber: paymentInput.referenceNumber ?? null,
        paidAt: paymentInput.paidAt,
      };
      db.payments.unshift(payment);

      const invoice = db.invoices[idx];
      const amountPaid = Math.round((invoice.amountPaid + payment.amount) * 100) / 100;
      const amountDue = Math.max(0, Math.round((invoice.totalAmount - amountPaid) * 100) / 100);
      const status =
        amountDue <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : invoice.status;

      db.invoices[idx] = { ...invoice, amountPaid, amountDue, status };

      const customer = db.customers.find((c) => c.id === invoice.customerId);
      if (customer) {
        customer.outstandingDue = Math.max(
          0,
          Math.round((customer.outstandingDue - payment.amount) * 100) / 100,
        );
        if (amountDue <= 0) {
          customer.totalRevenue =
            Math.round((customer.totalRevenue + invoice.totalAmount) * 100) / 100;
        }
      }

      return { invoice: db.invoices[idx], payment };
    });
  },
};

export async function listInvoicesByJob(jobCardId: string) {
  return withLocalDb((db) => db.invoices.filter((i) => i.jobCardId === jobCardId));
}
