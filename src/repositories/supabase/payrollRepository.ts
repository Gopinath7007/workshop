import type { AttendanceMethod, AttendanceRecord, AttendanceStatus, PayrollRun, PayrollStatus, SalarySlip } from '../../types';
import { monthBounds, type PayrollPeriod, type SavePayrollRunInput } from '../local/payrollRepository';
import { requireSupabase, throwIfError } from './client';

type SlipRow = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  basic: number;
  incentives: number;
  overtime_amount: number;
  bonus: number;
  deductions: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  net_pay: number;
};

type RunRow = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  period_year: number;
  period_month: number;
  status: PayrollStatus;
  processed_at: string | null;
  salary_slips?: SlipRow[];
};

function mapSlip(row: SlipRow): SalarySlip {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    basic: Number(row.basic),
    incentives: Number(row.incentives),
    overtimeAmount: Number(row.overtime_amount),
    bonus: Number(row.bonus),
    deductions: Number(row.deductions),
    pfEmployee: Number(row.pf_employee),
    pfEmployer: Number(row.pf_employer),
    esiEmployee: Number(row.esi_employee),
    esiEmployer: Number(row.esi_employer),
    netPay: Number(row.net_pay),
  };
}

function mapRun(row: RunRow): PayrollRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    status: row.status,
    processedAt: row.processed_at,
    slips: (row.salary_slips ?? []).map(mapSlip),
  };
}

export async function listSupabaseMonthAttendance(
  period: Pick<PayrollPeriod, 'branchId' | 'year' | 'month'>,
): Promise<AttendanceRecord[]> {
  const sb = requireSupabase();
  const { from, to } = monthBounds(period.year, period.month);
  const { data, error } = await sb
    .from('attendance')
    .select('*')
    .eq('branch_id', period.branchId)
    .gte('attendance_date', from)
    .lte('attendance_date', to);
  throwIfError(error, 'Could not load attendance');
  return (data ?? []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    branchId: row.branch_id,
    attendanceDate: row.attendance_date,
    status: row.status as AttendanceStatus,
    method: row.method as AttendanceMethod,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
  }));
}

export async function getSupabasePayrollRun(period: PayrollPeriod): Promise<PayrollRun | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('payroll_runs')
    .select('*, salary_slips(*)')
    .eq('organization_id', period.organizationId)
    .eq('branch_id', period.branchId)
    .eq('period_year', period.year)
    .eq('period_month', period.month)
    .maybeSingle();
  throwIfError(error, 'Could not load payroll');
  return data ? mapRun(data as RunRow) : null;
}

export async function saveSupabasePayrollRun(input: SavePayrollRunInput): Promise<PayrollRun> {
  const sb = requireSupabase();
  const existing = await getSupabasePayrollRun(input);
  if (existing?.status === 'paid') throw new Error('This payroll is already paid and locked');

  const { data: run, error } = await sb
    .from('payroll_runs')
    .upsert(
      {
        organization_id: input.organizationId,
        branch_id: input.branchId,
        period_year: input.year,
        period_month: input.month,
        status: 'draft',
        created_by: existing ? undefined : (input.createdBy ?? null),
      },
      { onConflict: 'organization_id,branch_id,period_year,period_month' },
    )
    .select('*')
    .single();
  throwIfError(error, 'Could not save payroll');

  const runId = (run as RunRow).id;
  const { error: delError } = await sb.from('salary_slips').delete().eq('payroll_run_id', runId);
  throwIfError(delError, 'Could not replace salary slips');

  if (input.slips.length > 0) {
    const { error: insError } = await sb.from('salary_slips').insert(
      input.slips.map((s) => ({
        payroll_run_id: runId,
        employee_id: s.employeeId,
        basic: s.basic,
        incentives: s.incentives,
        overtime_amount: s.overtimeAmount,
        bonus: s.bonus,
        deductions: s.deductions,
        pf_employee: s.pfEmployee,
        pf_employer: s.pfEmployer,
        esi_employee: s.esiEmployee,
        esi_employer: s.esiEmployer,
        net_pay: s.netPay,
      })),
    );
    throwIfError(insError, 'Could not save salary slips');
  }

  const saved = await getSupabasePayrollRun(input);
  if (!saved) throw new Error('Payroll saved but could not be reloaded');
  return saved;
}

export async function markSupabasePayrollPaid(runId: string): Promise<PayrollRun> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('payroll_runs')
    .update({ status: 'paid', processed_at: new Date().toISOString() })
    .eq('id', runId)
    .select('*, salary_slips(*)')
    .single();
  throwIfError(error, 'Could not mark payroll as paid');
  return mapRun(data as RunRow);
}
