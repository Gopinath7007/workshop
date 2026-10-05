import type { Invoice, JobCard, JobCardStatus } from '../../types';

export type ChartSlice = { key: string; label: string; value: number; color: string };
export type DayBar = { key: string; label: string; billed: number; collected: number };

export const chartPalette = {
  sky: '#38BDF8',
  violet: '#A78BFA',
  amber: '#FBBF24',
  emerald: '#34D399',
  rose: '#FB7185',
  slate: '#64748B',
  orange: '#FB923C',
  teal: '#2DD4BF',
};

const JOB_STAGES: Array<{ key: string; label: string; color: string; statuses: JobCardStatus[] }> = [
  { key: 'open', label: 'New', color: chartPalette.sky, statuses: ['open', 'inspection'] },
  { key: 'approval', label: 'Awaiting approval', color: chartPalette.amber, statuses: ['waiting_approval'] },
  { key: 'work', label: 'In progress', color: chartPalette.violet, statuses: ['in_progress', 'qc'] },
  { key: 'parts', label: 'Parts pending', color: chartPalette.orange, statuses: ['parts_pending'] },
  { key: 'ready', label: 'Ready', color: chartPalette.teal, statuses: ['ready_delivery'] },
  { key: 'done', label: 'Delivered', color: chartPalette.emerald, statuses: ['delivered', 'closed'] },
  { key: 'cancelled', label: 'Cancelled', color: chartPalette.slate, statuses: ['cancelled'] },
];

export function jobStageColor(status: JobCardStatus): string {
  return JOB_STAGES.find((s) => s.statuses.includes(status))?.color ?? chartPalette.slate;
}

const OPEN_STATUSES: JobCardStatus[] = [
  'open',
  'inspection',
  'waiting_approval',
  'in_progress',
  'parts_pending',
  'qc',
];

export type DashboardInsights = {
  bookingsToday: number;
  openJobs: number;
  readyForDelivery: number;
  deliveredThisWeek: number;
  revenueToday: number;
  billedThisWeek: number;
  collectedThisWeek: number;
  outstanding: number;
  pendingInvoices: number;
  collectionRate: number;
  weekTrendPct: number | null;
  jobStages: ChartSlice[];
  collection: ChartSlice[];
  invoiceStatus: ChartSlice[];
  last7Days: DayBar[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function localDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysAgo(now: Date, n: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function buildDashboardInsights(
  jobs: JobCard[],
  invoices: Invoice[],
  now: Date = new Date(),
): DashboardInsights {
  const today = localDate(now);
  const weekStart = localDate(daysAgo(now, 6));
  const prevWeekStart = localDate(daysAgo(now, 13));
  const billable = invoices.filter((i) => i.status !== 'void' && i.status !== 'draft');
  const weekInvoices = billable.filter((i) => i.invoiceDate >= weekStart);
  const prevWeekInvoices = billable.filter(
    (i) => i.invoiceDate >= prevWeekStart && i.invoiceDate < weekStart,
  );
  const sum = (rows: Invoice[], pick: (i: Invoice) => number) =>
    round2(rows.reduce((t, i) => t + pick(i), 0));

  const last7Days: DayBar[] = [];
  for (let n = 6; n >= 0; n -= 1) {
    const d = daysAgo(now, n);
    const key = localDate(d);
    const dayInvoices = billable.filter((i) => i.invoiceDate.slice(0, 10) === key);
    last7Days.push({
      key,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      billed: sum(dayInvoices, (i) => i.totalAmount),
      collected: sum(dayInvoices, (i) => i.amountPaid),
    });
  }

  const billedThisWeek = sum(weekInvoices, (i) => i.totalAmount);
  const collectedThisWeek = sum(weekInvoices, (i) => i.amountPaid);
  const prevBilled = sum(prevWeekInvoices, (i) => i.totalAmount);
  const totalBilled = sum(billable, (i) => i.totalAmount);
  const totalCollected = sum(billable, (i) => i.amountPaid);
  const outstanding = sum(billable, (i) => i.amountDue);

  const statusCount = (statuses: Invoice['status'][]) =>
    billable.filter((i) => statuses.includes(i.status)).length;

  return {
    bookingsToday: jobs.filter((j) => localDate(new Date(j.createdAt)) === today).length,
    openJobs: jobs.filter((j) => OPEN_STATUSES.includes(j.status)).length,
    readyForDelivery: jobs.filter((j) => j.status === 'ready_delivery').length,
    deliveredThisWeek: jobs.filter(
      (j) =>
        (j.status === 'delivered' || j.status === 'closed') &&
        localDate(new Date(j.updatedAt)) >= weekStart,
    ).length,
    revenueToday: sum(
      billable.filter((i) => i.invoiceDate.slice(0, 10) === today),
      (i) => i.amountPaid,
    ),
    billedThisWeek,
    collectedThisWeek,
    outstanding,
    pendingInvoices: billable.filter((i) => i.amountDue > 0).length,
    collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
    weekTrendPct: prevBilled > 0 ? Math.round(((billedThisWeek - prevBilled) / prevBilled) * 100) : null,
    jobStages: JOB_STAGES.map((stage) => ({
      key: stage.key,
      label: stage.label,
      color: stage.color,
      value: jobs.filter((j) => stage.statuses.includes(j.status)).length,
    })),
    collection: [
      { key: 'collected', label: 'Collected', value: totalCollected, color: chartPalette.emerald },
      { key: 'outstanding', label: 'Outstanding', value: outstanding, color: chartPalette.rose },
    ],
    invoiceStatus: [
      { key: 'paid', label: 'Paid', value: statusCount(['paid']), color: chartPalette.emerald },
      { key: 'partial', label: 'Partially paid', value: statusCount(['partially_paid']), color: chartPalette.amber },
      { key: 'issued', label: 'Unpaid', value: statusCount(['issued']), color: chartPalette.rose },
      { key: 'refunded', label: 'Refunded', value: statusCount(['refunded']), color: chartPalette.slate },
    ],
    last7Days,
  };
}
