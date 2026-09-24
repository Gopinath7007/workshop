import type { AttendanceMethod, AttendanceRecord, AttendanceStatus, Employee } from '../../types';
import { newId, withLocalDb } from './storage';

export type CreateEmployeeInput = {
  organizationId: string;
  branchId: string;
  fullName: string;
  department?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  basicSalary?: number;
  employeeCode?: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureDemoEmployees(organizationId: string, branchId: string) {
  return withLocalDb((db) => {
    if (db.seededDemoEmployees || db.employees.length > 0) return;
    const samples: Array<Omit<Employee, 'id'>> = [
      {
        organizationId,
        branchId,
        employeeCode: 'EMP-0001',
        fullName: 'Suresh Technician',
        department: 'Workshop',
        designation: 'Technician',
        mobile: '9876500001',
        email: null,
        joiningDate: '2024-01-15',
        basicSalary: 22000,
        isActive: true,
      },
      {
        organizationId,
        branchId,
        employeeCode: 'EMP-0002',
        fullName: 'Meena Advisor',
        department: 'Service',
        designation: 'Service Advisor',
        mobile: '9876500002',
        email: null,
        joiningDate: '2023-06-01',
        basicSalary: 28000,
        isActive: true,
      },
    ];
    for (const sample of samples) {
      db.counters.employee += 1;
      db.employees.push({ ...sample, id: newId() });
    }
    db.seededDemoEmployees = true;
  });
}

export async function listEmployees(params: {
  organizationId: string;
  branchId?: string | null;
  search?: string;
}): Promise<Employee[]> {
  return withLocalDb((db) =>
    db.employees
      .filter((e) => e.organizationId === params.organizationId)
      .filter((e) => !params.branchId || e.branchId === params.branchId)
      .filter((e) => {
        if (!params.search?.trim()) return true;
        const q = params.search.trim().toLowerCase();
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.mobile?.includes(q) ?? false)
        );
      }),
  );
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  return withLocalDb((db) => {
    db.counters.employee += 1;
    const employee: Employee = {
      id: newId(),
      organizationId: input.organizationId,
      branchId: input.branchId,
      employeeCode: input.employeeCode?.trim() || `EMP-${String(db.counters.employee).padStart(4, '0')}`,
      fullName: input.fullName.trim(),
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      mobile: input.mobile?.trim() || null,
      email: input.email?.trim() || null,
      joiningDate: today(),
      basicSalary: input.basicSalary ?? 0,
      isActive: true,
    };
    db.employees.unshift(employee);
    return employee;
  });
}

export async function getEmployee(id: string): Promise<Employee | null> {
  return withLocalDb((db) => db.employees.find((e) => e.id === id) ?? null);
}

export async function listAttendance(params: {
  branchId: string;
  date?: string;
}): Promise<Array<AttendanceRecord & { employeeName?: string }>> {
  const date = params.date ?? today();
  return withLocalDb((db) =>
    db.attendance
      .filter((a) => a.branchId === params.branchId && a.attendanceDate === date)
      .map((a) => ({
        ...a,
        employeeName: db.employees.find((e) => e.id === a.employeeId)?.fullName,
      })),
  );
}

export async function markAttendance(input: {
  organizationId: string;
  branchId: string;
  employeeId: string;
  status: AttendanceStatus;
  method?: AttendanceMethod;
  markedBy?: string;
}): Promise<AttendanceRecord> {
  return withLocalDb((db) => {
    const date = today();
    const existingIdx = db.attendance.findIndex(
      (a) => a.employeeId === input.employeeId && a.attendanceDate === date,
    );
    const record: AttendanceRecord = {
      id: existingIdx >= 0 ? db.attendance[existingIdx].id : newId(),
      employeeId: input.employeeId,
      branchId: input.branchId,
      attendanceDate: date,
      status: input.status,
      method: input.method ?? 'manual',
      checkInAt:
        input.status === 'present' || input.status === 'late'
          ? new Date().toISOString()
          : null,
      checkOutAt: null,
      overtimeMinutes: 0,
    };
    if (existingIdx >= 0) db.attendance[existingIdx] = record;
    else db.attendance.unshift(record);
    return record;
  });
}

export async function attendanceSummary(branchId: string, date?: string) {
  const rows = await listAttendance({ branchId, date });
  return {
    present: rows.filter((r) => r.status === 'present' || r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    late: rows.filter((r) => r.status === 'late').length,
    onLeave: rows.filter((r) => r.status === 'on_leave').length,
    total: rows.length,
  };
}
