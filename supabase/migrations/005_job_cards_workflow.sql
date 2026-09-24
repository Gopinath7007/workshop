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
