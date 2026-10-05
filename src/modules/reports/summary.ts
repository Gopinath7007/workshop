import type { Invoice, JobCard, JobCardStatus } from '../../types';

export type ReportRange = 'today' | '7d' | '30d' | 'all';

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

export type StatusCount = { id: JobCardStatus; status: JobCardStatus; count: number };

export type DailyRevenue = {
  id: string;
  date: string;
  invoices: number;
  billed: number;
  collected: number;
  gst: number;
};

export type ReportSummary = {
  jobsCreated: number;
  jobsDelivered: number;
  invoiceCount: number;
  billed: number;
  collected: number;
  outstanding: number;
  cgst: number;
  sgst: number;
  igst: number;
  averageTicket: number;
  jobsByStatus: StatusCount[];
  dailyRevenue: DailyRevenue[];
};

export function rangeStartDate(range: ReportRange, now: Date = new Date()): string | null {
  if (range === 'all') return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (range === '7d') d.setDate(d.getDate() - 6);
  if (range === '30d') d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildReportSummary(
  jobs: JobCard[],
  invoices: Invoice[],
  range: ReportRange,
  now: Date = new Date(),
): ReportSummary {
  const start = rangeStartDate(range, now);
  const inRange = (isoDate: string) => !start || isoDate.slice(0, 10) >= start;

  const rangedJobs = jobs.filter((j) => inRange(j.createdAt));
  const rangedInvoices = invoices.filter(
    (i) => i.status !== 'void' && i.status !== 'draft' && inRange(i.invoiceDate),
  );

  const statusMap = new Map<JobCardStatus, number>();
  for (const job of rangedJobs) {
    statusMap.set(job.status, (statusMap.get(job.status) ?? 0) + 1);
  }

  const dailyMap = new Map<string, DailyRevenue>();
  for (const inv of rangedInvoices) {
    const date = inv.invoiceDate.slice(0, 10);
    const row = dailyMap.get(date) ?? {
      id: date,
      date,
      invoices: 0,
      billed: 0,
      collected: 0,
      gst: 0,
    };
    row.invoices += 1;
    row.billed = round2(row.billed + inv.totalAmount);
    row.collected = round2(row.collected + inv.amountPaid);
    row.gst = round2(row.gst + inv.cgstAmount + inv.sgstAmount + inv.igstAmount);
    dailyMap.set(date, row);
  }

  const sum = (pick: (i: Invoice) => number) =>
    round2(rangedInvoices.reduce((total, inv) => total + pick(inv), 0));

  const billed = sum((i) => i.totalAmount);

  return {
    jobsCreated: rangedJobs.length,
    jobsDelivered: rangedJobs.filter((j) => j.status === 'delivered' || j.status === 'closed')
      .length,
    invoiceCount: rangedInvoices.length,
    billed,
    collected: sum((i) => i.amountPaid),
    outstanding: sum((i) => i.amountDue),
    cgst: sum((i) => i.cgstAmount),
    sgst: sum((i) => i.sgstAmount),
    igst: sum((i) => i.igstAmount),
    averageTicket: rangedInvoices.length ? round2(billed / rangedInvoices.length) : 0,
    jobsByStatus: [...statusMap.entries()]
      .map(([status, count]) => ({ id: status, status, count }))
      .sort((a, b) => b.count - a.count),
    dailyRevenue: [...dailyMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function dailyRevenueToCsv(rows: DailyRevenue[]): string {
  const header = 'Date,Invoices,Billed (INR),Collected (INR),GST (INR)';
  const lines = rows.map((r) => [r.date, r.invoices, r.billed, r.collected, r.gst].join(','));
  return [header, ...lines].join('\n');
}
