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
