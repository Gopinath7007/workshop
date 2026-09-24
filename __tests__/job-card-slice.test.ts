import { createLocalEstimate } from '../src/repositories/local/estimateRepository';
import { localCustomerRepository } from '../src/repositories/local/customerRepository';
import { localJobCardRepository } from '../src/repositories/local/jobCardRepository';
import { localVehicleRepository } from '../src/repositories/local/vehicleRepository';
import { localInvoiceRepository } from '../src/repositories/local/invoiceRepository';
import { resetLocalDb } from '../src/repositories/local/storage';
import { canTransition } from '../src/modules/job-cards/workflow';
import { permissionsForRoles } from '../src/modules/rbac/permissions';

const ORG = 'org-1';
const BRANCH = 'branch-1';

describe('job card vertical slice (local)', () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it('creates customer, vehicle, job, estimate, invoice, and payment', async () => {
    const customer = await localCustomerRepository.create({
      organizationId: ORG,
      branchId: BRANCH,
      name: 'Ravi Kumar',
      mobile: '9876543210',
      email: null,
      alternateMobile: null,
      addressLine1: null,
      city: null,
      state: null,
      pincode: null,
      gstin: null,
      notes: null,
    });

    const vehicle = await localVehicleRepository.create({
      organizationId: ORG,
      customerId: customer.id,
      registrationNumber: 'MH12AB1234',
      vehicleType: 'car',
      brand: 'Maruti',
      model: 'Swift',
    });

    const job = await localJobCardRepository.create({
      organizationId: ORG,
      branchId: BRANCH,
      vehicleId: vehicle.id,
      customerId: customer.id,
      complaints: 'Strange noise while braking',
      estimatedCost: 2500,
      createdBy: 'user-1',
    });

    expect(job.jobNumber).toMatch(/^JC-/);
    expect(job.status).toBe('open');

    const perms = permissionsForRoles(['service_advisor']);
    expect(canTransition('open', 'inspection', perms)).toBe(true);
    await localJobCardRepository.transition(job.id, 'inspection', 'user-1');
    await localJobCardRepository.transition(job.id, 'waiting_approval', 'user-1');

    const estimate = await createLocalEstimate({
      organizationId: ORG,
      branchId: BRANCH,
      jobCardId: job.id,
      lines: [
        { lineType: 'labor', description: 'Brake service', quantity: 1, unitPrice: 1000 },
        { lineType: 'part', description: 'Brake pads', quantity: 1, unitPrice: 800 },
      ],
    });

    expect(estimate.totalAmount).toBeGreaterThan(estimate.subtotal);
    await localJobCardRepository.transition(job.id, 'in_progress', 'user-1');
    await localJobCardRepository.transition(job.id, 'qc', 'user-1');
    await localJobCardRepository.transition(job.id, 'ready_delivery', 'user-1');

    const invoice = await localInvoiceRepository.createFromJobCard(job.id, 'user-1');
    expect(invoice.amountDue).toBe(invoice.totalAmount);

    const { invoice: paid } = await localInvoiceRepository.recordPayment(invoice.id, {
      amount: invoice.amountDue,
      paymentMode: 'upi',
      referenceNumber: 'UPI123',
      paidAt: new Date().toISOString(),
    });

    expect(paid.status).toBe('paid');
    expect(paid.amountDue).toBe(0);
  });
});
