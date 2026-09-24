-- HR, attendance, and payroll (India: PF/ESI fields; no Aadhaar).

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  employee_code text not null,
  full_name text not null,
  department text,
  designation text,
  mobile text,
  email text,
  joining_date date,
  employment_type text not null default 'full_time',
  pan text,
  uan text,
  esi_number text,
  bank_account text,
  ifsc text,
  basic_salary numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code)
);

create index if not exists employees_branch_idx on public.employees (branch_id);
create index if not exists employees_user_idx on public.employees (user_id);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes int not null default 10,
  is_active boolean not null default true
);

create type public.attendance_status as enum (
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
  'holiday'
);

create type public.attendance_method as enum (
  'manual',
  'qr',
  'gps',
  'biometric'
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null default 'present',
  method public.attendance_method not null default 'manual',
  check_in_at timestamptz,
  check_out_at timestamptz,
  overtime_minutes int not null default 0,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  notes text,
  marked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (employee_id, attendance_date)
);

create index if not exists attendance_branch_date_idx on public.attendance (branch_id, attendance_date);

create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status public.leave_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create type public.payroll_status as enum ('draft', 'processing', 'paid', 'cancelled');

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  status public.payroll_status not null default 'draft',
  processed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, branch_id, period_year, period_month)
);

create table if not exists public.salary_slips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  basic numeric(12, 2) not null default 0,
  incentives numeric(12, 2) not null default 0,
  overtime_amount numeric(12, 2) not null default 0,
  bonus numeric(12, 2) not null default 0,
  deductions numeric(12, 2) not null default 0,
  pf_employee numeric(12, 2) not null default 0,
  pf_employer numeric(12, 2) not null default 0,
  esi_employee numeric(12, 2) not null default 0,
  esi_employer numeric(12, 2) not null default 0,
  net_pay numeric(12, 2) not null default 0,
  pdf_path text,
  unique (payroll_run_id, employee_id)
);

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute procedure public.set_updated_at();
