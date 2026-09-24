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
