import {
  attendanceSummary,
  createEmployee,
  ensureDemoEmployees,
  listAttendance,
  listEmployees,
  markAttendance,
} from '../src/repositories/local/hrRepository';
import { resetLocalDb } from '../src/repositories/local/storage';

const ORG = 'org-1';
const BRANCH = 'branch-1';

describe('HR attendance (local)', () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it('seeds employees and marks attendance', async () => {
    await ensureDemoEmployees(ORG, BRANCH);
    const employees = await listEmployees({ organizationId: ORG, branchId: BRANCH });
    expect(employees.length).toBeGreaterThanOrEqual(2);

    const created = await createEmployee({
      organizationId: ORG,
      branchId: BRANCH,
      fullName: 'New Hire',
      designation: 'Helper',
    });
    expect(created.employeeCode).toMatch(/^EMP-/);

    await markAttendance({
      organizationId: ORG,
      branchId: BRANCH,
      employeeId: created.id,
      status: 'present',
    });
    await markAttendance({
      organizationId: ORG,
      branchId: BRANCH,
      employeeId: employees[0].id,
      status: 'late',
    });

    const rows = await listAttendance({ branchId: BRANCH });
    expect(rows.length).toBe(2);
    const summary = await attendanceSummary(BRANCH);
    expect(summary.present).toBe(2);
    expect(summary.late).toBe(1);
  });
});
