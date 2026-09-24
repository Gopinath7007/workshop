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
