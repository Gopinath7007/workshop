import type { AttendanceRecord, PayrollRun, SalarySlip } from '../../types';
import { newId, withLocalDb } from './storage';

export type PayrollPeriod = {
  organizationId: string;
  branchId: string;
  year: number;
  month: number;
};

export type SlipInput = Omit<SalarySlip, 'id' | 'payrollRunId'>;

export type SavePayrollRunInput = PayrollPeriod & {
  createdBy?: string | null;
  slips: SlipInput[];
};

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export async function listMonthAttendance(
  period: Pick<PayrollPeriod, 'branchId' | 'year' | 'month'>,
): Promise<AttendanceRecord[]> {
  const { from, to } = monthBounds(period.year, period.month);
  return withLocalDb((db) =>
    db.attendance.filter(
      (a) => a.branchId === period.branchId && a.attendanceDate >= from && a.attendanceDate <= to,
    ),
  );
}

function matchesPeriod(run: PayrollRun, period: PayrollPeriod): boolean {
  return (
    run.organizationId === period.organizationId &&
    run.branchId === period.branchId &&
    run.periodYear === period.year &&
    run.periodMonth === period.month
  );
}

export async function getPayrollRun(period: PayrollPeriod): Promise<PayrollRun | null> {
  return withLocalDb((db) => db.payrollRuns.find((r) => matchesPeriod(r, period)) ?? null);
}

export async function savePayrollRun(input: SavePayrollRunInput): Promise<PayrollRun> {
  return withLocalDb((db) => {
    const existing = db.payrollRuns.find((r) => matchesPeriod(r, input));
    if (existing?.status === 'paid') throw new Error('This payroll is already paid and locked');
    const runId = existing?.id ?? newId();
    const run: PayrollRun = {
      id: runId,
      organizationId: input.organizationId,
      branchId: input.branchId,
      periodYear: input.year,
      periodMonth: input.month,
      status: 'draft',
      processedAt: null,
      slips: input.slips.map((s) => ({ ...s, id: newId(), payrollRunId: runId })),
    };
    if (existing) db.payrollRuns[db.payrollRuns.indexOf(existing)] = run;
    else db.payrollRuns.unshift(run);
    return run;
  });
}

export async function markPayrollPaid(runId: string): Promise<PayrollRun> {
  return withLocalDb((db) => {
    const run = db.payrollRuns.find((r) => r.id === runId);
    if (!run) throw new Error('Payroll run not found');
    run.status = 'paid';
    run.processedAt = new Date().toISOString();
    return run;
  });
}
