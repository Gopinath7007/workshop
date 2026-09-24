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
