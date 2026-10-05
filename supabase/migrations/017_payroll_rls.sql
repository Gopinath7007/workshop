-- Payroll tenant isolation: payroll_runs / salary_slips had no RLS.

alter table public.payroll_runs enable row level security;
alter table public.salary_slips enable row level security;

drop policy if exists "payroll_runs_select" on public.payroll_runs;
create policy "payroll_runs_select" on public.payroll_runs for select
  using (
    public.has_permission(organization_id, 'payroll.read', branch_id)
    or public.has_permission(organization_id, 'payroll.manage', branch_id)
  );

drop policy if exists "payroll_runs_manage" on public.payroll_runs;
create policy "payroll_runs_manage" on public.payroll_runs for all
  using (public.has_permission(organization_id, 'payroll.manage', branch_id))
  with check (public.has_permission(organization_id, 'payroll.manage', branch_id));

drop policy if exists "salary_slips_select" on public.salary_slips;
create policy "salary_slips_select" on public.salary_slips for select
  using (
    exists (
      select 1 from public.payroll_runs pr
      where pr.id = payroll_run_id
        and (
          public.has_permission(pr.organization_id, 'payroll.read', pr.branch_id)
          or public.has_permission(pr.organization_id, 'payroll.manage', pr.branch_id)
        )
    )
  );

drop policy if exists "salary_slips_manage" on public.salary_slips;
create policy "salary_slips_manage" on public.salary_slips for all
  using (
    exists (
      select 1 from public.payroll_runs pr
      where pr.id = payroll_run_id
        and pr.status <> 'paid'
        and public.has_permission(pr.organization_id, 'payroll.manage', pr.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.payroll_runs pr
      where pr.id = payroll_run_id
        and pr.status <> 'paid'
        and public.has_permission(pr.organization_id, 'payroll.manage', pr.branch_id)
    )
  );
