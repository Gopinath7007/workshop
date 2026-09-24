-- Workshop MMS: apply all migrations (001-014) in one paste
-- Supabase SQL Editor → New query → Paste → Run


-- ========== 001_profiles.sql ==========
-- Minimal profile row for each Auth user.
-- Apply in the Supabase SQL editor after enabling Email (and optional Google) auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

;

-- ========== 002_tenancy.sql ==========
-- Tenancy: organizations and branches (India-first multi-branch workshops).

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  gstin text,
  pan text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  country text not null default 'IN',
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  gstin text,
  is_head_office boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists branches_org_idx on public.branches (organization_id);

create table if not exists public.branch_settings (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  job_card_prefix text not null default 'JC',
  invoice_prefix text not null default 'INV',
  estimate_prefix text not null default 'EST',
  default_gst_percent numeric(5, 2) not null default 18,
  working_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend profiles for org membership context.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists preferred_organization_id uuid references public.organizations (id),
  add column if not exists preferred_branch_id uuid references public.branches (id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at
  before update on public.branches
  for each row execute procedure public.set_updated_at();

;

-- ========== 003_rbac.sql ==========
-- RBAC: roles, permissions, and scoped user role assignments.

create table if not exists public.permissions (
  id text primary key,
  module text not null,
  action text not null,
  description text,
  unique (module, action)
);

create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text,
  is_system boolean not null default true,
  rank int not null default 100
);

create table if not exists public.role_permissions (
  role_id text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- A user may hold different roles across orgs/branches.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  role_id text not null references public.roles (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, branch_id, role_id)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_org_branch_idx on public.user_roles (organization_id, branch_id);

create table if not exists public.organization_role_overrides (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role_id text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  allowed boolean not null,
  primary key (organization_id, role_id, permission_id)
);

;

-- ========== 004_customers_vehicles.sql ==========
-- Customers and vehicles (India-first: GSTIN, registration number; no Aadhaar).

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  name text not null,
  mobile text not null,
  alternate_mobile text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  gstin text,
  notes text,
  outstanding_due numeric(12, 2) not null default 0,
  total_revenue numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_org_mobile_idx on public.customers (organization_id, mobile);
create index if not exists customers_org_name_idx on public.customers (organization_id, name);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  registration_number text not null,
  vehicle_type text not null default 'car',
  brand text,
  model text,
  variant text,
  fuel_type text,
  color text,
  chassis_number text,
  engine_number text,
  manufacture_year int,
  odometer_reading int,
  registration_date date,
  insurance_provider text,
  insurance_policy_number text,
  insurance_expiry date,
  puc_expiry date,
  warranty_expiry date,
  notes text,
  last_service_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, registration_number)
);

create index if not exists vehicles_customer_idx on public.vehicles (customer_id);
create index if not exists vehicles_reg_idx on public.vehicles (registration_number);

create table if not exists public.vehicle_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  job_card_id uuid,
  visited_at timestamptz not null default now(),
  odometer_reading int,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_visits_vehicle_idx on public.vehicle_visits (vehicle_id, visited_at desc);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute procedure public.set_updated_at();

;

-- ========== 005_job_cards_workflow.sql ==========
-- Job cards, workflow transitions, and service catalog.

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  category text not null,
  description text,
  labor_cost numeric(12, 2) not null default 0,
  estimated_minutes int not null default 60,
  gst_percent numeric(5, 2) not null default 18,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  package_price numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.service_package_items (
  package_id uuid not null references public.service_packages (id) on delete cascade,
  service_id uuid not null references public.service_catalog (id) on delete restrict,
  quantity numeric(10, 2) not null default 1,
  primary key (package_id, service_id)
);

create type public.job_card_status as enum (
  'open',
  'inspection',
  'waiting_approval',
  'in_progress',
  'parts_pending',
  'qc',
  'ready_delivery',
  'delivered',
  'closed',
  'cancelled'
);

create table if not exists public.workflow_transitions (
  id serial primary key,
  from_status public.job_card_status not null,
  to_status public.job_card_status not null,
  required_permission text references public.permissions (id),
  label text,
  unique (from_status, to_status)
);

create table if not exists public.job_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  job_number text not null,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  advisor_id uuid references auth.users (id) on delete set null,
  technician_id uuid references auth.users (id) on delete set null,
  status public.job_card_status not null default 'open',
  complaints text,
  odometer_in int,
  odometer_out int,
  estimated_cost numeric(12, 2) not null default 0,
  estimated_delivery_at timestamptz,
  actual_delivery_at timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, job_number)
);

create index if not exists job_cards_branch_status_idx on public.job_cards (branch_id, status);
create index if not exists job_cards_vehicle_idx on public.job_cards (vehicle_id);
create index if not exists job_cards_customer_idx on public.job_cards (customer_id);

-- Backfill FK from vehicle_visits after job_cards exists.
alter table public.vehicle_visits
  drop constraint if exists vehicle_visits_job_card_id_fkey;
alter table public.vehicle_visits
  add constraint vehicle_visits_job_card_id_fkey
  foreign key (job_card_id) references public.job_cards (id) on delete set null;

create table if not exists public.job_complaints (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  description text not null,
  severity text not null default 'medium',
  is_resolved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  label text not null,
  is_checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz,
  sort_order int not null default 0
);

create table if not exists public.job_services (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  service_id uuid references public.service_catalog (id) on delete set null,
  name text not null,
  labor_cost numeric(12, 2) not null default 0,
  estimated_minutes int not null default 0,
  status text not null default 'pending',
  technician_id uuid references auth.users (id) on delete set null
);

create table if not exists public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  from_status public.job_card_status,
  to_status public.job_card_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists job_status_history_job_idx on public.job_status_history (job_card_id, created_at desc);

create table if not exists public.job_media (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image',
  caption text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists job_cards_set_updated_at on public.job_cards;
create trigger job_cards_set_updated_at
  before update on public.job_cards
  for each row execute procedure public.set_updated_at();

;

-- ========== 006_estimates.sql ==========
-- Estimates and approvals (customer app / SMS / WhatsApp ready).

create type public.estimate_status as enum (
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
  'converted'
);

create type public.estimate_line_type as enum ('labor', 'part', 'package', 'other');

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  estimate_number text not null,
  status public.estimate_status not null default 'draft',
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  taxable_amount numeric(12, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  valid_until date,
  pdf_path text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, estimate_number)
);

create index if not exists estimates_job_idx on public.estimates (job_card_id);

create table if not exists public.estimate_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  line_type public.estimate_line_type not null,
  reference_id uuid,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 18,
  line_total numeric(12, 2) not null default 0,
  sort_order int not null default 0
);

create table if not exists public.estimate_approvals (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  channel text not null,
  status text not null default 'pending',
  token text,
  responded_at timestamptz,
  responder_name text,
  note text,
  created_at timestamptz not null default now()
);

drop trigger if exists estimates_set_updated_at on public.estimates;
create trigger estimates_set_updated_at
  before update on public.estimates
  for each row execute procedure public.set_updated_at();

;

-- ========== 007_inventory.sql ==========
-- Inventory: parts, branch stock, suppliers, purchase orders.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_name text,
  mobile text,
  email text,
  gstin text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sku text not null,
  part_number text,
  name text not null,
  brand text,
  category text,
  unit text not null default 'pcs',
  cost_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 18,
  reorder_level numeric(12, 3) not null default 0,
  barcode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index if not exists parts_barcode_idx on public.parts (organization_id, barcode);

create table if not exists public.branch_stock (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  quantity_on_hand numeric(12, 3) not null default 0,
  quantity_reserved numeric(12, 3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, part_id)
);

create type public.stock_movement_type as enum (
  'stock_in',
  'stock_out',
  'adjustment',
  'transfer_in',
  'transfer_out',
  'job_consumption',
  'return'
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity numeric(12, 3) not null,
  unit_cost numeric(12, 2),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_branch_part_idx
  on public.stock_movements (branch_id, part_id, created_at desc);

create type public.purchase_order_status as enum (
  'draft',
  'ordered',
  'partial',
  'received',
  'cancelled'
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  po_number text not null,
  status public.purchase_order_status not null default 'draft',
  ordered_at timestamptz,
  expected_at date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, po_number)
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete restrict,
  quantity_ordered numeric(12, 3) not null,
  quantity_received numeric(12, 3) not null default 0,
  unit_cost numeric(12, 2) not null default 0
);

drop trigger if exists parts_set_updated_at on public.parts;
create trigger parts_set_updated_at
  before update on public.parts
  for each row execute procedure public.set_updated_at();

;

-- ========== 008_billing.sql ==========
-- Billing: GST invoices, payments, refunds, credit notes (INR / India).

create type public.invoice_status as enum (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
  'refunded'
);

create type public.payment_mode as enum (
  'cash',
  'upi',
  'card',
  'bank_transfer',
  'cheque',
  'other'
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  job_card_id uuid references public.job_cards (id) on delete set null,
  estimate_id uuid references public.estimates (id) on delete set null,
  customer_id uuid not null references public.customers (id) on delete restrict,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  invoice_number text not null,
  status public.invoice_status not null default 'draft',
  invoice_date date not null default (timezone('Asia/Kolkata', now()))::date,
  place_of_supply text,
  customer_gstin text,
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  taxable_amount numeric(12, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  amount_due numeric(12, 2) not null default 0,
  pdf_path text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create index if not exists invoices_branch_status_idx on public.invoices (branch_id, status);
create index if not exists invoices_customer_idx on public.invoices (customer_id);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  line_type text not null,
  reference_id uuid,
  hsn_sac text,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 18,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  sort_order int not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null,
  payment_mode public.payment_mode not null,
  reference_number text,
  paid_at timestamptz not null default now(),
  notes text,
  received_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_idx on public.payments (invoice_id);

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  credit_note_number text not null,
  amount numeric(12, 2) not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, credit_note_number)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  amount numeric(12, 2) not null,
  refund_mode public.payment_mode not null,
  reason text,
  processed_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

;

-- ========== 009_hr_payroll.sql ==========
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

;

-- ========== 010_documents_notifications.sql ==========
-- Documents, notifications, and audit trail.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists documents_entity_idx on public.documents (entity_type, entity_id);
create index if not exists documents_org_idx on public.documents (organization_id);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_key text not null,
  channel text not null,
  subject text,
  body_template text not null,
  is_active boolean not null default true,
  unique (organization_id, event_key, channel)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  channel text not null,
  event_key text not null,
  title text,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

;

-- ========== 011_rls_policies.sql ==========
-- Membership helpers and baseline RLS for multi-tenant tables.

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = org_id
      and ur.is_active = true
  );
$$;

create or replace function public.is_branch_member(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_active = true
      and (
        ur.branch_id = p_branch_id
        or ur.branch_id is null
      )
      and ur.organization_id = (
        select b.organization_id from public.branches b where b.id = p_branch_id
      )
  );
$$;

create or replace function public.has_permission(
  org_id uuid,
  perm_id text,
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    left join public.organization_role_overrides oro
      on oro.organization_id = ur.organization_id
     and oro.role_id = ur.role_id
     and oro.permission_id = perm_id
    where ur.user_id = auth.uid()
      and ur.organization_id = org_id
      and ur.is_active = true
      and (p_branch_id is null or ur.branch_id is null or ur.branch_id = p_branch_id)
      and rp.permission_id = perm_id
      and coalesce(oro.allowed, true) = true
  );
$$;

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.job_cards enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.parts enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member"
  on public.organizations for select
  using (public.is_org_member(id));

drop policy if exists "branches_select_member" on public.branches;
create policy "branches_select_member"
  on public.branches for select
  using (public.is_org_member(organization_id));

drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
  on public.user_roles for select
  using (
    user_id = auth.uid()
    or public.has_permission(organization_id, 'rbac.manage')
  );

drop policy if exists "customers_org_rw" on public.customers;
create policy "customers_select" on public.customers for select
  using (public.is_org_member(organization_id));
create policy "customers_insert" on public.customers for insert
  with check (public.has_permission(organization_id, 'customers.create', branch_id));
create policy "customers_update" on public.customers for update
  using (public.has_permission(organization_id, 'customers.update', branch_id));

drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles for select
  using (public.is_org_member(organization_id));
create policy "vehicles_insert" on public.vehicles for insert
  with check (public.has_permission(organization_id, 'vehicles.create'));
create policy "vehicles_update" on public.vehicles for update
  using (public.has_permission(organization_id, 'vehicles.update'));

drop policy if exists "job_cards_select" on public.job_cards;
create policy "job_cards_select" on public.job_cards for select
  using (public.is_branch_member(branch_id));
create policy "job_cards_insert" on public.job_cards for insert
  with check (public.has_permission(organization_id, 'job_cards.create', branch_id));
create policy "job_cards_update" on public.job_cards for update
  using (public.has_permission(organization_id, 'job_cards.update', branch_id));

create policy "estimates_select" on public.estimates for select
  using (public.is_branch_member(branch_id));
create policy "estimates_write" on public.estimates for all
  using (public.has_permission(organization_id, 'estimates.manage', branch_id))
  with check (public.has_permission(organization_id, 'estimates.manage', branch_id));

create policy "invoices_select" on public.invoices for select
  using (public.is_branch_member(branch_id));
create policy "invoices_write" on public.invoices for all
  using (public.has_permission(organization_id, 'billing.manage', branch_id))
  with check (public.has_permission(organization_id, 'billing.manage', branch_id));

create policy "parts_select" on public.parts for select
  using (public.is_org_member(organization_id));
create policy "parts_write" on public.parts for all
  using (public.has_permission(organization_id, 'inventory.manage'))
  with check (public.has_permission(organization_id, 'inventory.manage'));

create policy "employees_select" on public.employees for select
  using (public.is_org_member(organization_id));
create policy "employees_write" on public.employees for all
  using (public.has_permission(organization_id, 'employees.manage', branch_id))
  with check (public.has_permission(organization_id, 'employees.manage', branch_id));

create policy "attendance_select" on public.attendance for select
  using (public.is_branch_member(branch_id));
create policy "attendance_write" on public.attendance for all
  using (public.has_permission(organization_id, 'attendance.manage', branch_id))
  with check (public.has_permission(organization_id, 'attendance.manage', branch_id));

create policy "documents_select" on public.documents for select
  using (public.is_org_member(organization_id));
create policy "documents_insert" on public.documents for insert
  with check (public.is_org_member(organization_id));

create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid() or public.is_org_member(organization_id));

;

-- ========== 012_seed_rbac_workflow.sql ==========
-- Seed system roles, permissions, role matrix, and default job workflow.

insert into public.roles (id, name, description, rank) values
  ('super_admin', 'Super Admin', 'Platform / multi-org administrator', 1),
  ('owner', 'Owner', 'Organization owner', 10),
  ('branch_manager', 'Branch Manager', 'Branch operations lead', 20),
  ('service_advisor', 'Service Advisor', 'Customer-facing job advisor', 30),
  ('technician', 'Technician', 'Workshop floor technician', 40),
  ('accountant', 'Accountant', 'Billing and finance', 50),
  ('store_manager', 'Store Manager', 'Parts and inventory', 60),
  ('hr_manager', 'HR Manager', 'People and payroll', 70),
  ('receptionist', 'Receptionist', 'Front desk vehicle entry', 80),
  ('customer', 'Customer', 'Customer portal access', 90)
on conflict (id) do nothing;

insert into public.permissions (id, module, action, description) values
  ('dashboard.view', 'dashboard', 'view', 'View dashboard widgets'),
  ('customers.create', 'customers', 'create', 'Create customers'),
  ('customers.read', 'customers', 'read', 'View customers'),
  ('customers.update', 'customers', 'update', 'Update customers'),
  ('customers.delete', 'customers', 'delete', 'Delete customers'),
  ('vehicles.create', 'vehicles', 'create', 'Create vehicles'),
  ('vehicles.read', 'vehicles', 'read', 'View vehicles'),
  ('vehicles.update', 'vehicles', 'update', 'Update vehicles'),
  ('vehicles.scan', 'vehicles', 'scan', 'Scan number plates'),
  ('job_cards.create', 'job_cards', 'create', 'Create job cards'),
  ('job_cards.read', 'job_cards', 'read', 'View job cards'),
  ('job_cards.update', 'job_cards', 'update', 'Update job cards'),
  ('job_cards.transition', 'job_cards', 'transition', 'Change job status'),
  ('job_cards.assign', 'job_cards', 'assign', 'Assign technician/advisor'),
  ('estimates.manage', 'estimates', 'manage', 'Create and manage estimates'),
  ('estimates.approve', 'estimates', 'approve', 'Approve/reject estimates'),
  ('inventory.manage', 'inventory', 'manage', 'Manage parts and stock'),
  ('inventory.read', 'inventory', 'read', 'View inventory'),
  ('billing.manage', 'billing', 'manage', 'Invoices and payments'),
  ('billing.read', 'billing', 'read', 'View invoices'),
  ('employees.manage', 'employees', 'manage', 'Manage employees'),
  ('employees.read', 'employees', 'read', 'View employees'),
  ('attendance.manage', 'attendance', 'manage', 'Mark attendance'),
  ('attendance.self', 'attendance', 'self', 'Mark own attendance'),
  ('payroll.manage', 'payroll', 'manage', 'Run payroll'),
  ('payroll.read', 'payroll', 'read', 'View salary slips'),
  ('reports.view', 'reports', 'view', 'View reports'),
  ('reports.export', 'reports', 'export', 'Export reports'),
  ('documents.manage', 'documents', 'manage', 'Upload/manage documents'),
  ('notifications.manage', 'notifications', 'manage', 'Configure notifications'),
  ('branches.manage', 'branches', 'manage', 'Manage branches'),
  ('rbac.manage', 'rbac', 'manage', 'Manage roles and permissions'),
  ('settings.manage', 'settings', 'manage', 'Organization settings')
on conflict (id) do nothing;

-- Helper: grant all listed permissions to a role.
create or replace function public._grant_role_perms(p_role text, p_perms text[])
returns void
language plpgsql
as $$
declare
  p text;
begin
  foreach p in array p_perms loop
    insert into public.role_permissions (role_id, permission_id)
    values (p_role, p)
    on conflict do nothing;
  end loop;
end;
$$;

select public._grant_role_perms('super_admin', array(select id from public.permissions));
select public._grant_role_perms('owner', array(select id from public.permissions where id <> 'rbac.manage'));
-- Owners also get rbac
insert into public.role_permissions (role_id, permission_id) values ('owner', 'rbac.manage')
on conflict do nothing;

select public._grant_role_perms('branch_manager', array[
  'dashboard.view','customers.create','customers.read','customers.update',
  'vehicles.create','vehicles.read','vehicles.update','vehicles.scan',
  'job_cards.create','job_cards.read','job_cards.update','job_cards.transition','job_cards.assign',
  'estimates.manage','estimates.approve','inventory.read','inventory.manage','billing.read','billing.manage',
  'employees.read','attendance.manage','reports.view','reports.export','documents.manage'
]);

select public._grant_role_perms('service_advisor', array[
  'dashboard.view','customers.create','customers.read','customers.update',
  'vehicles.create','vehicles.read','vehicles.update','vehicles.scan',
  'job_cards.create','job_cards.read','job_cards.update','job_cards.transition','job_cards.assign',
  'estimates.manage','estimates.approve','inventory.read','billing.read','documents.manage'
]);

select public._grant_role_perms('technician', array[
  'dashboard.view','job_cards.read','job_cards.update','job_cards.transition',
  'vehicles.read','inventory.read','documents.manage','attendance.self'
]);

select public._grant_role_perms('accountant', array[
  'dashboard.view','customers.read','billing.manage','billing.read',
  'estimates.manage','reports.view','reports.export','payroll.read'
]);

select public._grant_role_perms('store_manager', array[
  'dashboard.view','inventory.manage','inventory.read','job_cards.read','reports.view'
]);

select public._grant_role_perms('hr_manager', array[
  'dashboard.view','employees.manage','employees.read','attendance.manage',
  'payroll.manage','payroll.read','reports.view','reports.export'
]);

select public._grant_role_perms('receptionist', array[
  'dashboard.view','customers.create','customers.read','vehicles.create','vehicles.read',
  'vehicles.scan','job_cards.create','job_cards.read','attendance.self'
]);

select public._grant_role_perms('customer', array[
  'vehicles.read','job_cards.read','estimates.approve','billing.read','documents.manage'
]);

drop function public._grant_role_perms(text, text[]);

-- Default job card workflow transitions.
insert into public.workflow_transitions (from_status, to_status, required_permission, label) values
  ('open', 'inspection', 'job_cards.transition', 'Start inspection'),
  ('inspection', 'waiting_approval', 'job_cards.transition', 'Send for approval'),
  ('waiting_approval', 'in_progress', 'estimates.approve', 'Customer approved'),
  ('waiting_approval', 'cancelled', 'job_cards.transition', 'Reject / cancel'),
  ('in_progress', 'parts_pending', 'job_cards.transition', 'Parts pending'),
  ('parts_pending', 'in_progress', 'job_cards.transition', 'Parts received'),
  ('in_progress', 'qc', 'job_cards.transition', 'Send to QC'),
  ('qc', 'in_progress', 'job_cards.transition', 'QC failed â€” rework'),
  ('qc', 'ready_delivery', 'job_cards.transition', 'QC passed'),
  ('ready_delivery', 'delivered', 'job_cards.transition', 'Deliver vehicle'),
  ('delivered', 'closed', 'billing.manage', 'Close job'),
  ('open', 'cancelled', 'job_cards.transition', 'Cancel')
on conflict (from_status, to_status) do nothing;

-- India-oriented service categories seed (org-agnostic catalog templates live in app seed later).

;

-- ========== 013_bootstrap_workshop.sql ==========
-- Bootstrap a workshop org + head-office branch + owner role for the signed-in user.
-- Call from the app once when the user has no user_roles rows.

create or replace function public.bootstrap_workshop(
  p_org_name text default 'My Workshop',
  p_branch_name text default 'Head Office',
  p_branch_code text default 'HO'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_branch uuid;
  v_existing record;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Already bootstrapped?
  select ur.organization_id, ur.branch_id, ur.role_id
    into v_existing
  from public.user_roles ur
  where ur.user_id = v_user
    and ur.is_active = true
  order by ur.created_at
  limit 1;

  if found then
    return jsonb_build_object(
      'organization_id', v_existing.organization_id,
      'branch_id', v_existing.branch_id,
      'role_id', v_existing.role_id,
      'created', false
    );
  end if;

  insert into public.organizations (name, country, currency, timezone)
  values (coalesce(nullif(trim(p_org_name), ''), 'My Workshop'), 'IN', 'INR', 'Asia/Kolkata')
  returning id into v_org;

  insert into public.branches (organization_id, code, name, is_head_office)
  values (
    v_org,
    coalesce(nullif(trim(p_branch_code), ''), 'HO'),
    coalesce(nullif(trim(p_branch_name), ''), 'Head Office'),
    true
  )
  returning id into v_branch;

  insert into public.branch_settings (branch_id)
  values (v_branch)
  on conflict (branch_id) do nothing;

  insert into public.user_roles (user_id, organization_id, branch_id, role_id, is_active)
  values (v_user, v_org, v_branch, 'owner', true);

  update public.profiles
  set preferred_organization_id = v_org,
      preferred_branch_id = v_branch,
      updated_at = now()
  where id = v_user;

  return jsonb_build_object(
    'organization_id', v_org,
    'branch_id', v_branch,
    'role_id', 'owner',
    'created', true
  );
end;
$$;

revoke all on function public.bootstrap_workshop(text, text, text) from public;
grant execute on function public.bootstrap_workshop(text, text, text) to authenticated;

-- Allow authenticated users to read their memberships (needed before bootstrap returns).
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
  on public.user_roles for select
  using (
    user_id = auth.uid()
    or public.has_permission(organization_id, 'rbac.manage')
  );

-- Owners need to insert customers/vehicles/jobs after bootstrap (policies already use has_permission).
-- Allow org members to insert branches settings already covered.

-- job_status_history / estimate lines: enable simple member RLS
alter table public.job_status_history enable row level security;
drop policy if exists "job_status_history_select" on public.job_status_history;
create policy "job_status_history_select" on public.job_status_history for select
  using (
    exists (
      select 1 from public.job_cards j
      where j.id = job_card_id and public.is_branch_member(j.branch_id)
    )
  );
drop policy if exists "job_status_history_insert" on public.job_status_history;
create policy "job_status_history_insert" on public.job_status_history for insert
  with check (
    exists (
      select 1 from public.job_cards j
      where j.id = job_card_id and public.is_branch_member(j.branch_id)
    )
  );

alter table public.estimate_lines enable row level security;
drop policy if exists "estimate_lines_all" on public.estimate_lines;
create policy "estimate_lines_all" on public.estimate_lines for all
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id and public.is_branch_member(e.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id and public.is_branch_member(e.branch_id)
    )
  );

alter table public.payments enable row level security;
drop policy if exists "payments_all" on public.payments;
create policy "payments_all" on public.payments for all
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and public.is_branch_member(i.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and public.has_permission(i.organization_id, 'billing.manage', i.branch_id)
    )
  );

;

-- ========== 014_inventory_rls_seed.sql ==========
-- Inventory RLS + seed helper for demo parts on an org/branch.

alter table public.suppliers enable row level security;
alter table public.branch_stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select
  using (public.is_org_member(organization_id));
drop policy if exists "suppliers_write" on public.suppliers;
create policy "suppliers_write" on public.suppliers for all
  using (public.has_permission(organization_id, 'inventory.manage'))
  with check (public.has_permission(organization_id, 'inventory.manage'));

drop policy if exists "parts_select" on public.parts;
drop policy if exists "parts_write" on public.parts;
create policy "parts_select" on public.parts for select
  using (public.is_org_member(organization_id));
create policy "parts_write" on public.parts for all
  using (public.has_permission(organization_id, 'inventory.manage'))
  with check (public.has_permission(organization_id, 'inventory.manage'));

drop policy if exists "branch_stock_select" on public.branch_stock;
create policy "branch_stock_select" on public.branch_stock for select
  using (public.is_branch_member(branch_id));
drop policy if exists "branch_stock_write" on public.branch_stock;
create policy "branch_stock_write" on public.branch_stock for all
  using (
    exists (
      select 1 from public.branches b
      where b.id = branch_id
        and public.has_permission(b.organization_id, 'inventory.manage', branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.branches b
      where b.id = branch_id
        and public.has_permission(b.organization_id, 'inventory.manage', branch_id)
    )
  );

drop policy if exists "stock_movements_select" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements for select
  using (public.is_branch_member(branch_id));
drop policy if exists "stock_movements_insert" on public.stock_movements;
create policy "stock_movements_insert" on public.stock_movements for insert
  with check (public.has_permission(organization_id, 'inventory.manage', branch_id));

create or replace function public.seed_demo_inventory(
  p_organization_id uuid,
  p_branch_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_part uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'Not an organization member';
  end if;

  select count(*) into v_count from public.parts where organization_id = p_organization_id;
  if v_count > 0 then
    return 0;
  end if;

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'BRK-PAD-001', 'BP-SWIFT', 'Front brake pads', 'Bosch', 650, 980, 18, 4, '8901001001001')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 2);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'OIL-5W30-4L', 'EO-5W30', 'Engine oil 5W-30 4L', 'Castrol', 1200, 1650, 18, 6, '8901001001002')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 10);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'FIL-OIL-001', 'OF-001', 'Oil filter', 'Mann', 180, 320, 18, 8, '8901001001003')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 5);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'WPR-BLD-22', 'WB-22', 'Wiper blade 22"', 'Bosch', 220, 399, 18, 5, '8901001001004')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 1);

  return 4;
end;
$$;

revoke all on function public.seed_demo_inventory(uuid, uuid) from public;
grant execute on function public.seed_demo_inventory(uuid, uuid) to authenticated;

;

-- ========== 015_saas_tenancy.sql ==========

-- Multi-tenant SaaS: workshop onboarding + staff invites.
-- Each paying workshop = one organization. Data is isolated by organization_id (RLS).

alter table public.organizations
  add column if not exists slug text,
  add column if not exists plan text not null default 'starter',
  add column if not exists billing_email text;

create unique index if not exists organizations_slug_uidx
  on public.organizations (slug)
  where slug is not null;

create table if not exists public.workshop_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  code text not null,
  role_id text not null default 'service_advisor',
  max_uses int not null default 20,
  use_count int not null default 0,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists workshop_invites_code_idx
  on public.workshop_invites (upper(code));

alter table public.workshop_invites enable row level security;

drop policy if exists "workshop_invites_select_member" on public.workshop_invites;
create policy "workshop_invites_select_member"
  on public.workshop_invites for select
  using (public.is_org_member(organization_id));

drop policy if exists "workshop_invites_manage" on public.workshop_invites;
create policy "workshop_invites_manage"
  on public.workshop_invites for all
  using (public.has_permission(organization_id, 'rbac.manage'))
  with check (public.has_permission(organization_id, 'rbac.manage'));

-- Create a brand-new workshop tenant for the signed-in user (owner).
create or replace function public.create_workshop(
  p_org_name text,
  p_branch_name text default 'Head Office',
  p_branch_code text default 'HO',
  p_gstin text default null,
  p_phone text default null,
  p_city text default null,
  p_state text default null,
  p_billing_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_branch uuid;
  v_slug text;
  v_base text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(nullif(trim(p_org_name), ''), '') = '' then
    raise exception 'Workshop name is required';
  end if;

  v_base := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then
    v_base := 'workshop';
  end if;
  v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.organizations (
    name, legal_name, gstin, phone, city, state, country, currency, timezone, slug, plan, billing_email
  )
  values (
    trim(p_org_name),
    trim(p_org_name),
    nullif(upper(trim(coalesce(p_gstin, ''))), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    'IN',
    'INR',
    'Asia/Kolkata',
    v_slug,
    'starter',
    nullif(lower(trim(coalesce(p_billing_email, ''))), '')
  )
  returning id into v_org;

  insert into public.branches (organization_id, code, name, phone, city, state, gstin, is_head_office)
  values (
    v_org,
    coalesce(nullif(trim(p_branch_code), ''), 'HO'),
    coalesce(nullif(trim(p_branch_name), ''), 'Head Office'),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(upper(trim(coalesce(p_gstin, ''))), ''),
    true
  )
  returning id into v_branch;

  insert into public.branch_settings (branch_id)
  values (v_branch)
  on conflict (branch_id) do nothing;

  insert into public.user_roles (user_id, organization_id, branch_id, role_id, is_active)
  values (v_user, v_org, v_branch, 'owner', true);

  update public.profiles
  set preferred_organization_id = v_org,
      preferred_branch_id = v_branch,
      updated_at = now()
  where id = v_user;

  return jsonb_build_object(
    'organization_id', v_org,
    'branch_id', v_branch,
    'role_id', 'owner',
    'slug', v_slug,
    'created', true
  );
end;
$$;

revoke all on function public.create_workshop(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_workshop(text, text, text, text, text, text, text, text) to authenticated;

-- Owner/admin creates a join code for staff (or customer portal users).
create or replace function public.create_workshop_invite(
  p_role_id text default 'service_advisor',
  p_days_valid int default 30,
  p_max_uses int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_branch uuid;
  v_code text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select preferred_organization_id, preferred_branch_id
    into v_org, v_branch
  from public.profiles
  where id = v_user;

  if v_org is null then
    select organization_id, branch_id into v_org, v_branch
    from public.user_roles
    where user_id = v_user and is_active = true
    order by created_at
    limit 1;
  end if;

  if v_org is null then
    raise exception 'No workshop membership';
  end if;

  if not public.has_permission(v_org, 'rbac.manage') then
    raise exception 'Not allowed to invite staff';
  end if;

  if p_role_id not in (
    'owner', 'branch_manager', 'service_advisor', 'technician',
    'accountant', 'store_manager', 'hr_manager', 'receptionist', 'customer'
  ) then
    raise exception 'Invalid role';
  end if;

  -- Prevent invite escalation to owner unless caller is owner
  if p_role_id = 'owner' and not exists (
    select 1 from public.user_roles
    where user_id = v_user and organization_id = v_org and role_id = 'owner' and is_active
  ) then
    raise exception 'Only owners can invite owners';
  end if;

  v_code := 'WK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.workshop_invites (
    organization_id, branch_id, code, role_id, max_uses, expires_at, created_by
  )
  values (
    v_org,
    v_branch,
    v_code,
    p_role_id,
    greatest(1, coalesce(p_max_uses, 20)),
    now() + make_interval(days => greatest(1, coalesce(p_days_valid, 30))),
    v_user
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'organization_id', v_org,
    'branch_id', v_branch,
    'role_id', p_role_id,
    'expires_at', (now() + make_interval(days => greatest(1, coalesce(p_days_valid, 30))))
  );
end;
$$;

revoke all on function public.create_workshop_invite(text, int, int) from public;
grant execute on function public.create_workshop_invite(text, int, int) to authenticated;

-- Join an existing workshop via invite code (isolates users to that tenant).
create or replace function public.accept_workshop_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.workshop_invites%rowtype;
  v_norm text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  v_norm := upper(trim(coalesce(p_code, '')));
  if v_norm = '' then
    raise exception 'Invite code required';
  end if;

  select * into v_invite
  from public.workshop_invites
  where upper(code) = v_norm
    and is_active = true
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  if v_invite.use_count >= v_invite.max_uses then
    raise exception 'Invite already used up';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_id = v_user
      and organization_id = v_invite.organization_id
      and is_active = true
  ) then
    null; -- already a member of this workshop
  else
    insert into public.user_roles (user_id, organization_id, branch_id, role_id, is_active)
    values (v_user, v_invite.organization_id, v_invite.branch_id, v_invite.role_id, true);
  end if;

  update public.workshop_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  update public.profiles
  set preferred_organization_id = v_invite.organization_id,
      preferred_branch_id = v_invite.branch_id,
      updated_at = now()
  where id = v_user;

  return jsonb_build_object(
    'organization_id', v_invite.organization_id,
    'branch_id', v_invite.branch_id,
    'role_id', v_invite.role_id,
    'joined', true
  );
end;
$$;

revoke all on function public.accept_workshop_invite(text) from public;
grant execute on function public.accept_workshop_invite(text) to authenticated;

-- Switch active workshop when a user belongs to more than one tenant.
create or replace function public.set_active_workshop(p_organization_id uuid, p_branch_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_branch uuid;
  v_role text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception 'Not a member of this workshop';
  end if;

  select ur.branch_id, ur.role_id into v_branch, v_role
  from public.user_roles ur
  where ur.user_id = v_user
    and ur.organization_id = p_organization_id
    and ur.is_active = true
  order by ur.created_at
  limit 1;

  if p_branch_id is not null then
    if not exists (
      select 1 from public.branches b
      where b.id = p_branch_id and b.organization_id = p_organization_id
    ) then
      raise exception 'Branch not in workshop';
    end if;
    v_branch := p_branch_id;
  end if;

  update public.profiles
  set preferred_organization_id = p_organization_id,
      preferred_branch_id = v_branch,
      updated_at = now()
  where id = v_user;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'branch_id', v_branch,
    'role_id', v_role
  );
end;
$$;

revoke all on function public.set_active_workshop(uuid, uuid) from public;
grant execute on function public.set_active_workshop(uuid, uuid) to authenticated;

-- Allow owners to update workshop profile (GSTIN, phone, plan later).
drop policy if exists "organizations_update_settings" on public.organizations;
create policy "organizations_update_settings"
  on public.organizations for update
  using (public.has_permission(id, 'settings.manage'));

