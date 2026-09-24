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
