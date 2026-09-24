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
