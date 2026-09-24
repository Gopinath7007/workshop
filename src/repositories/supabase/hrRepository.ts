import type { AttendanceMethod, AttendanceRecord, AttendanceStatus, Employee } from '../../types';
import type { CreateEmployeeInput } from '../local/hrRepository';
import { requireSupabase, throwIfError } from './client';

type EmpRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  department: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  joining_date: string | null;
  pan: string | null;
  uan: string | null;
  esi_number: string | null;
  basic_salary: number;
  is_active: boolean;
};

function mapEmployee(row: EmpRow): Employee {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    department: row.department,
    designation: row.designation,
    mobile: row.mobile,
    email: row.email,
    joiningDate: row.joining_date,
    pan: row.pan,
    uan: row.uan,
    esiNumber: row.esi_number,
    basicSalary: Number(row.basic_salary),
    isActive: row.is_active,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureSupabaseDemoEmployees(
  organizationId: string,
  branchId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (error) return; // table may not exist yet
  if ((count ?? 0) > 0) return;

  await sb.from('employees').insert([
    {
      organization_id: organizationId,
      branch_id: branchId,
      employee_code: 'EMP-0001',
      full_name: 'Suresh Technician',
      department: 'Workshop',
      designation: 'Technician',
      mobile: '9876500001',
      joining_date: '2024-01-15',
      basic_salary: 22000,
    },
    {
      organization_id: organizationId,
      branch_id: branchId,
      employee_code: 'EMP-0002',
      full_name: 'Meena Advisor',
      department: 'Service',
      designation: 'Service Advisor',
      mobile: '9876500002',
      joining_date: '2023-06-01',
      basic_salary: 28000,
    },
  ]);
}

export async function listSupabaseEmployees(params: {
  organizationId: string;
  branchId?: string | null;
  search?: string;
}): Promise<Employee[]> {
  const sb = requireSupabase();
  if (params.branchId) {
    await ensureSupabaseDemoEmployees(params.organizationId, params.branchId);
  }

  let q = sb
    .from('employees')
    .select('*')
    .eq('organization_id', params.organizationId)
    .eq('is_active', true)
    .order('full_name');
  if (params.branchId) q = q.eq('branch_id', params.branchId);
  if (params.search?.trim()) {
    const s = params.search.trim();
    q = q.or(`full_name.ilike.%${s}%,employee_code.ilike.%${s}%,mobile.ilike.%${s}%`);
  }
  const { data, error } = await q;
  throwIfError(error, 'Could not load employees');
  return (data ?? []).map((r) => mapEmployee(r as EmpRow));
}

export async function createSupabaseEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const sb = requireSupabase();
  const code = input.employeeCode?.trim() || `EMP-${Date.now().toString().slice(-4)}`;
  const { data, error } = await sb
    .from('employees')
    .insert({
      organization_id: input.organizationId,
      branch_id: input.branchId,
      employee_code: code,
      full_name: input.fullName.trim(),
      department: input.department?.trim() || null,
      designation: input.designation?.trim() || null,
      mobile: input.mobile?.trim() || null,
      email: input.email?.trim() || null,
      joining_date: today(),
      basic_salary: input.basicSalary ?? 0,
    })
    .select('*')
    .single();
  throwIfError(error, 'Could not create employee');
  return mapEmployee(data as EmpRow);
}

export async function listSupabaseAttendance(params: {
  branchId: string;
  date?: string;
}): Promise<Array<AttendanceRecord & { employeeName?: string }>> {
  const sb = requireSupabase();
  const date = params.date ?? today();
  const { data, error } = await sb
    .from('attendance')
    .select('*, employees(full_name)')
    .eq('branch_id', params.branchId)
    .eq('attendance_date', date)
    .order('created_at', { ascending: false });
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
    employeeName: (row.employees as { full_name?: string } | null)?.full_name,
  }));
}

export async function markSupabaseAttendance(input: {
  organizationId: string;
  branchId: string;
  employeeId: string;
  status: AttendanceStatus;
  method?: AttendanceMethod;
  markedBy?: string;
}): Promise<AttendanceRecord> {
  const sb = requireSupabase();
  const date = today();
  const payload = {
    organization_id: input.organizationId,
    branch_id: input.branchId,
    employee_id: input.employeeId,
    attendance_date: date,
    status: input.status,
    method: input.method ?? 'manual',
    check_in_at:
      input.status === 'present' || input.status === 'late' ? new Date().toISOString() : null,
    marked_by: input.markedBy ?? null,
  };

  const { data, error } = await sb
    .from('attendance')
    .upsert(payload, { onConflict: 'employee_id,attendance_date' })
    .select('*')
    .single();
  throwIfError(error, 'Could not mark attendance');

  return {
    id: data.id,
    employeeId: data.employee_id,
    branchId: data.branch_id,
    attendanceDate: data.attendance_date,
    status: data.status,
    method: data.method,
    checkInAt: data.check_in_at,
    checkOutAt: data.check_out_at,
    overtimeMinutes: Number(data.overtime_minutes ?? 0),
  };
}

export async function supabaseAttendanceSummary(branchId: string, date?: string) {
  const rows = await listSupabaseAttendance({ branchId, date });
  return {
    present: rows.filter((r) => r.status === 'present' || r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    late: rows.filter((r) => r.status === 'late').length,
    onLeave: rows.filter((r) => r.status === 'on_leave').length,
    total: rows.length,
  };
}
