import type { AttendanceRecord, Employee } from '../../types';

/** Statutory limits (India): PF on basic up to ₹15,000; ESI when gross ≤ ₹21,000. */
export const PF_WAGE_CEILING = 15000;
export const PF_RATE = 0.12;
export const ESI_GROSS_LIMIT = 21000;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;
/** Overtime is paid at twice the ordinary hourly rate (Factories Act, s.59). */
export const OVERTIME_MULTIPLIER = 2;
export const STANDARD_HOURS_PER_DAY = 8;

export type PayAdjustments = {
  incentives: number;
  bonus: number;
  deductions: number;
};

export const EMPTY_ADJUSTMENTS: PayAdjustments = { incentives: 0, bonus: 0, deductions: 0 };

export type SlipCalculation = {
  employeeId: string;
  daysInMonth: number;
  payableDays: number;
  absentDays: number;
  halfDays: number;
  overtimeMinutes: number;
  basic: number;
  overtimeAmount: number;
  incentives: number;
  bonus: number;
  gross: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  deductions: number;
  netPay: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Unmarked days count as paid so shops that don't track attendance still get full salary. */
export function calculateSlip(
  employee: Pick<Employee, 'id' | 'basicSalary'>,
  attendance: Pick<AttendanceRecord, 'status' | 'overtimeMinutes'>[],
  year: number,
  month: number,
  adjustments: PayAdjustments = EMPTY_ADJUSTMENTS,
): SlipCalculation {
  const totalDays = daysInMonth(year, month);
  const absentDays = attendance.filter((a) => a.status === 'absent').length;
  const halfDays = attendance.filter((a) => a.status === 'half_day').length;
  const overtimeMinutes = attendance.reduce((sum, a) => sum + (a.overtimeMinutes ?? 0), 0);
  const payableDays = Math.max(0, totalDays - absentDays - halfDays * 0.5);

  const monthlyBasic = employee.basicSalary;
  const basic = round2((monthlyBasic * payableDays) / totalDays);
  const hourlyRate = monthlyBasic / (totalDays * STANDARD_HOURS_PER_DAY);
  const overtimeAmount = round2((hourlyRate * OVERTIME_MULTIPLIER * overtimeMinutes) / 60);

  const incentives = Math.max(0, adjustments.incentives);
  const bonus = Math.max(0, adjustments.bonus);
  const deductions = Math.max(0, adjustments.deductions);
  const gross = round2(basic + overtimeAmount + incentives + bonus);

  const pfWage = Math.min(basic, PF_WAGE_CEILING);
  const pfEmployee = Math.round(pfWage * PF_RATE);
  const pfEmployer = Math.round(pfWage * PF_RATE);

  const esiApplies = gross > 0 && gross <= ESI_GROSS_LIMIT;
  const esiEmployee = esiApplies ? Math.ceil(gross * ESI_EMPLOYEE_RATE) : 0;
  const esiEmployer = esiApplies ? Math.ceil(gross * ESI_EMPLOYER_RATE) : 0;

  return {
    employeeId: employee.id,
    daysInMonth: totalDays,
    payableDays,
    absentDays,
    halfDays,
    overtimeMinutes,
    basic,
    overtimeAmount,
    incentives,
    bonus,
    gross,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
    deductions,
    netPay: round2(gross - pfEmployee - esiEmployee - deductions),
  };
}

export type PayrollTotals = {
  employees: number;
  gross: number;
  net: number;
  pfTotal: number;
  esiTotal: number;
  employerCost: number;
};

export function payrollTotals(slips: SlipCalculation[]): PayrollTotals {
  const sum = (pick: (s: SlipCalculation) => number) =>
    round2(slips.reduce((total, s) => total + pick(s), 0));
  const gross = sum((s) => s.gross);
  const employerContrib = sum((s) => s.pfEmployer + s.esiEmployer);
  return {
    employees: slips.length,
    gross,
    net: sum((s) => s.netPay),
    pfTotal: sum((s) => s.pfEmployee + s.pfEmployer),
    esiTotal: sum((s) => s.esiEmployee + s.esiEmployer),
    employerCost: round2(gross + employerContrib),
  };
}

export function slipsToCsv(
  rows: Array<SlipCalculation & { employeeCode: string; fullName: string }>,
): string {
  const header =
    'Code,Name,Payable days,Basic,Overtime,Incentives,Bonus,Gross,PF (employee),ESI (employee),Deductions,Net pay';
  const lines = rows.map((r) =>
    [
      r.employeeCode,
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.payableDays,
      r.basic,
      r.overtimeAmount,
      r.incentives,
      r.bonus,
      r.gross,
      r.pfEmployee,
      r.esiEmployee,
      r.deductions,
      r.netPay,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
