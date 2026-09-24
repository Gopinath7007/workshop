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
