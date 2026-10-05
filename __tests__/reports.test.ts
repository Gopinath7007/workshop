import { buildReportSummary, dailyRevenueToCsv, rangeStartDate } from '../src/modules/reports/summary';
import type { Invoice, JobCard } from '../src/types';

const now = new Date('2026-10-05T10:00:00');

const job = (id: string, status: JobCard['status'], createdAt: string): JobCard => ({
  id,
  organizationId: 'org',
  branchId: 'br',
  jobNumber: id,
  vehicleId: 'v',
  customerId: 'c',
  status,
  estimatedCost: 0,
  createdAt,
  updatedAt: createdAt,
});

const invoice = (id: string, date: string, total: number, paid: number, status: Invoice['status'] = 'issued'): Invoice => ({
  id,
  organizationId: 'org',
  branchId: 'br',
  customerId: 'c',
  invoiceNumber: id,
  status,
  invoiceDate: date,
  subtotal: total / 1.18,
  cgstAmount: 9,
  sgstAmount: 9,
  igstAmount: 0,
  totalAmount: total,
  amountPaid: paid,
  amountDue: total - paid,
});

describe('reports summary', () => {
  it('computes range start dates', () => {
    expect(rangeStartDate('today', now)).toBe('2026-10-05');
    expect(rangeStartDate('7d', now)).toBe('2026-09-29');
    expect(rangeStartDate('all', now)).toBeNull();
  });

  it('aggregates revenue, GST, and job status within range', () => {
    const summary = buildReportSummary(
      [
        job('j1', 'delivered', '2026-10-04T09:00:00Z'),
        job('j2', 'in_progress', '2026-10-05T09:00:00Z'),
        job('j3', 'open', '2026-08-01T09:00:00Z'),
      ],
      [
        invoice('i1', '2026-10-04', 1180, 1180),
        invoice('i2', '2026-10-05', 590, 0),
        invoice('i3', '2026-10-05', 999, 0, 'void'),
        invoice('i4', '2026-08-01', 5000, 5000),
      ],
      '7d',
      now,
    );

    expect(summary.jobsCreated).toBe(2);
    expect(summary.jobsDelivered).toBe(1);
    expect(summary.invoiceCount).toBe(2);
    expect(summary.billed).toBe(1770);
    expect(summary.collected).toBe(1180);
    expect(summary.outstanding).toBe(590);
    expect(summary.cgst).toBe(18);
    expect(summary.dailyRevenue.map((d) => d.date)).toEqual(['2026-10-05', '2026-10-04']);
  });

  it('exports CSV with a header row', () => {
    const csv = dailyRevenueToCsv([
      { id: '2026-10-05', date: '2026-10-05', invoices: 1, billed: 590, collected: 0, gst: 18 },
    ]);
    expect(csv.split('\n')).toEqual([
      'Date,Invoices,Billed (INR),Collected (INR),GST (INR)',
      '2026-10-05,1,590,0,18',
    ]);
  });
});
