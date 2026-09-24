import { writeFileSync } from 'fs';
import { INDIAN_VEHICLE_MAKES, INDIAN_VEHICLE_MODELS } from '../src/data/indianVehicleCatalog';

const esc = (s: string) => s.replace(/'/g, "''");
const sql: string[] = [];

sql.push(`-- Global Indian vehicle catalog + workshop vehicle_focus (2W / 4W / both).

alter table public.organizations
  add column if not exists vehicle_focus text not null default 'both';

do $$ begin
  alter table public.organizations drop constraint if exists organizations_vehicle_focus_check;
exception when undefined_object then null;
end $$;

alter table public.organizations
  add constraint organizations_vehicle_focus_check
  check (vehicle_focus in ('two_wheeler', 'four_wheeler', 'both'));

create table if not exists public.vehicle_catalog_makes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('two_wheeler', 'four_wheeler', 'both')),
  country text not null default 'IN',
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_catalog_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_catalog_makes (id) on delete cascade,
  name text not null,
  category text not null check (category in ('two_wheeler', 'four_wheeler')),
  vehicle_type text not null,
  default_fuel_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (make_id, name)
);

create index if not exists vehicle_catalog_models_make_idx on public.vehicle_catalog_models (make_id);
create index if not exists vehicle_catalog_models_category_idx on public.vehicle_catalog_models (category);

alter table public.vehicle_catalog_makes enable row level security;
alter table public.vehicle_catalog_models enable row level security;

drop policy if exists "vehicle_catalog_makes_read" on public.vehicle_catalog_makes;
create policy "vehicle_catalog_makes_read"
  on public.vehicle_catalog_makes for select to authenticated using (true);

drop policy if exists "vehicle_catalog_models_read" on public.vehicle_catalog_models;
create policy "vehicle_catalog_models_read"
  on public.vehicle_catalog_models for select to authenticated using (true);
`);

sql.push('-- Seed makes');
for (const m of INDIAN_VEHICLE_MAKES) {
  sql.push(
    `insert into public.vehicle_catalog_makes (name, category, country) values ('${esc(m.name)}', '${m.category}', 'IN') on conflict (name) do update set category = excluded.category, is_active = true;`,
  );
}

sql.push('');
sql.push('-- Seed models');
for (const m of INDIAN_VEHICLE_MODELS) {
  const fuel = m.defaultFuel ? `'${m.defaultFuel}'` : 'null';
  sql.push(
    `insert into public.vehicle_catalog_models (make_id, name, category, vehicle_type, default_fuel_type) select id, '${esc(m.name)}', '${m.category}', '${m.vehicleType}', ${fuel} from public.vehicle_catalog_makes where name = '${esc(m.make)}' on conflict (make_id, name) do update set category = excluded.category, vehicle_type = excluded.vehicle_type, default_fuel_type = excluded.default_fuel_type, is_active = true;`,
  );
}

sql.push(`
create or replace function public.set_workshop_vehicle_focus(p_focus text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_focus not in ('two_wheeler', 'four_wheeler', 'both') then
    raise exception 'Invalid vehicle focus';
  end if;
  select preferred_organization_id into v_org from public.profiles where id = v_user;
  if v_org is null then
    select organization_id into v_org from public.user_roles
    where user_id = v_user and is_active = true order by created_at limit 1;
  end if;
  if v_org is null then raise exception 'No workshop'; end if;
  if not public.has_permission(v_org, 'settings.manage') then
    raise exception 'Not allowed';
  end if;
  update public.organizations set vehicle_focus = p_focus, updated_at = now() where id = v_org;
  return jsonb_build_object('organization_id', v_org, 'vehicle_focus', p_focus);
end;
$$;

revoke all on function public.set_workshop_vehicle_focus(text) from public;
grant execute on function public.set_workshop_vehicle_focus(text) to authenticated;

drop function if exists public.create_workshop(text, text, text, text, text, text, text, text);

create or replace function public.create_workshop(
  p_org_name text,
  p_branch_name text default 'Head Office',
  p_branch_code text default 'HO',
  p_gstin text default null,
  p_phone text default null,
  p_city text default null,
  p_state text default null,
  p_billing_email text default null,
  p_vehicle_focus text default 'both'
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
  v_focus text := coalesce(nullif(trim(p_vehicle_focus), ''), 'both');
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if coalesce(nullif(trim(p_org_name), ''), '') = '' then raise exception 'Workshop name is required'; end if;
  if v_focus not in ('two_wheeler', 'four_wheeler', 'both') then v_focus := 'both'; end if;

  v_base := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'workshop'; end if;
  v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.organizations (
    name, legal_name, gstin, phone, city, state, country, currency, timezone, slug, plan, billing_email, vehicle_focus
  ) values (
    trim(p_org_name), trim(p_org_name),
    nullif(upper(trim(coalesce(p_gstin, ''))), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    'IN', 'INR', 'Asia/Kolkata', v_slug, 'starter',
    nullif(lower(trim(coalesce(p_billing_email, ''))), ''),
    v_focus
  ) returning id into v_org;

  insert into public.branches (organization_id, code, name, phone, city, state, gstin, is_head_office)
  values (
    v_org, coalesce(nullif(trim(p_branch_code), ''), 'HO'),
    coalesce(nullif(trim(p_branch_name), ''), 'Head Office'),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(upper(trim(coalesce(p_gstin, ''))), ''),
    true
  ) returning id into v_branch;

  insert into public.branch_settings (branch_id) values (v_branch) on conflict (branch_id) do nothing;
  insert into public.user_roles (user_id, organization_id, branch_id, role_id, is_active)
  values (v_user, v_org, v_branch, 'owner', true);

  update public.profiles
  set preferred_organization_id = v_org, preferred_branch_id = v_branch, updated_at = now()
  where id = v_user;

  return jsonb_build_object(
    'organization_id', v_org, 'branch_id', v_branch, 'role_id', 'owner',
    'slug', v_slug, 'vehicle_focus', v_focus, 'created', true
  );
end;
$$;

revoke all on function public.create_workshop(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_workshop(text, text, text, text, text, text, text, text, text) to authenticated;
`);

writeFileSync('supabase/migrations/016_vehicle_catalog.sql', sql.join('\n'));
console.log(`Wrote 016 with ${INDIAN_VEHICLE_MAKES.length} makes, ${INDIAN_VEHICLE_MODELS.length} models`);
