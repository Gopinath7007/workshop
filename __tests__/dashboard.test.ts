import { buildDashboardInsights } from '../src/modules/dashboard/insights';
import type { Invoice, JobCard } from '../src/types';

const now = new Date(2026, 9, 5, 12, 0, 0);
const iso = (daysBack: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString();
};
const date = (daysBack: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const job = (id: string, status: JobCard['status'], daysBack = 0): JobCard => ({
  id,
  organizationId: 'o',
  branchId: 'b',
  jobNumber: id,
  vehicleId: 'v',
  customerId: 'c',
  status,
  estimatedCost: 0,
  createdAt: iso(daysBack),
  updatedAt: iso(daysBack),
});

const invoice = (id: string, daysBack: number, total: number, paid: number, status: Invoice['status']): Invoice => ({
  id,
  organizationId: 'o',
  branchId: 'b',
  customerId: 'c',
  invoiceNumber: id,
  status,
  invoiceDate: date(daysBack),
  subtotal: total,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  totalAmount: total,
  amountPaid: paid,
  amountDue: total - paid,
});

describe('buildDashboardInsights', () => {
  const jobs = [job('J1', 'open'), job('J2', 'in_progress', 2), job('J3', 'delivered', 1), job('J4', 'ready_delivery', 3)];
  const invoices = [
    invoice('I1', 0, 1000, 1000, 'paid'),
    invoice('I2', 2, 2000, 500, 'partially_paid'),
    invoice('I3', 10, 1500, 0, 'issued'),
    invoice('I4', 1, 9999, 0, 'void'),
  ];
  const insights = buildDashboardInsights(jobs, invoices, now);

  it('counts job KPIs', () => {
    expect(insights.bookingsToday).toBe(1);
    expect(insights.openJobs).toBe(2);
    expect(insights.readyForDelivery).toBe(1);
    expect(insights.deliveredThisWeek).toBe(1);
  });

  it('builds money KPIs excluding void invoices', () => {
    expect(insights.revenueToday).toBe(1000);
    expect(insights.billedThisWeek).toBe(3000);
    expect(insights.outstanding).toBe(3000);
    expect(insights.collectionRate).toBe(33);
    expect(insights.weekTrendPct).toBe(100);
  });

  it('fills all 7 days including empty ones', () => {
    expect(insights.last7Days).toHaveLength(7);
    expect(insights.last7Days[6]).toMatchObject({ key: date(0), billed: 1000 });
    expect(insights.last7Days[5].billed).toBe(0);
  });

  it('groups jobs into pipeline stages', () => {
    const byKey = Object.fromEntries(insights.jobStages.map((s) => [s.key, s.value]));
    expect(byKey).toMatchObject({ open: 1, work: 1, ready: 1, done: 1, cancelled: 0 });
  });
});
