import { calculateSlip, payrollTotals, slipsToCsv } from '../src/modules/payroll/calculate';

const employee = (basicSalary: number) => ({ id: 'e1', basicSalary });
const day = (status: 'present' | 'absent' | 'half_day', overtimeMinutes = 0) => ({
  status,
  overtimeMinutes,
});

describe('calculateSlip', () => {
  it('pays full basic when no attendance is marked', () => {
    const slip = calculateSlip(employee(15000), [], 2026, 9);
    expect(slip.daysInMonth).toBe(30);
    expect(slip.payableDays).toBe(30);
    expect(slip.basic).toBe(15000);
  });

  it('pro-rates for absences and half days', () => {
    const slip = calculateSlip(employee(30000), [day('absent'), day('absent'), day('half_day')], 2026, 9);
    expect(slip.payableDays).toBe(27.5);
    expect(slip.basic).toBe(27500);
  });

  it('caps PF at 12% of ₹15,000 and skips ESI above ₹21,000 gross', () => {
    const slip = calculateSlip(employee(28000), [], 2026, 9);
    expect(slip.pfEmployee).toBe(1800);
    expect(slip.pfEmployer).toBe(1800);
    expect(slip.esiEmployee).toBe(0);
    expect(slip.netPay).toBe(28000 - 1800);
  });

  it('applies ESI (rounded up) when gross is within ₹21,000', () => {
    const slip = calculateSlip(employee(15000), [], 2026, 9);
    expect(slip.esiEmployee).toBe(113); // 0.75% of 15000 = 112.5
    expect(slip.esiEmployer).toBe(488); // 3.25% of 15000 = 487.5
    expect(slip.netPay).toBe(15000 - 1800 - 113);
  });

  it('pays overtime at double the hourly rate and adds adjustments', () => {
    const slip = calculateSlip(employee(24000), [day('present', 120)], 2026, 9, {
      incentives: 1000,
      bonus: 500,
      deductions: 2000,
    });
    // hourly = 24000 / (30 * 8) = 100 → 2h * 2x = 400
    expect(slip.overtimeAmount).toBe(400);
    expect(slip.gross).toBe(25900);
    expect(slip.netPay).toBe(25900 - 1800 - 2000);
  });
});

describe('payrollTotals / CSV', () => {
  it('sums slips and includes employer contributions in cost', () => {
    const a = calculateSlip(employee(15000), [], 2026, 9);
    const b = calculateSlip({ id: 'e2', basicSalary: 28000 }, [], 2026, 9);
    const totals = payrollTotals([a, b]);
    expect(totals.employees).toBe(2);
    expect(totals.gross).toBe(43000);
    expect(totals.employerCost).toBe(43000 + 1800 + 488 + 1800);
    const csv = slipsToCsv([{ ...a, employeeCode: 'EMP-1', fullName: 'Ravi "R" Kumar' }]);
    expect(csv.split('\n')[1]).toContain('"Ravi ""R"" Kumar"');
  });
});
