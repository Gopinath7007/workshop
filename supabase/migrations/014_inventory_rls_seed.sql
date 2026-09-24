-- Inventory RLS + seed helper for demo parts on an org/branch.

alter table public.suppliers enable row level security;
alter table public.branch_stock enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select
  using (public.is_org_member(organization_id));
drop policy if exists "suppliers_write" on public.suppliers;
create policy "suppliers_write" on public.suppliers for all
  using (public.has_permission(organization_id, 'inventory.manage'))
  with check (public.has_permission(organization_id, 'inventory.manage'));

drop policy if exists "parts_select" on public.parts;
drop policy if exists "parts_write" on public.parts;
create policy "parts_select" on public.parts for select
  using (public.is_org_member(organization_id));
create policy "parts_write" on public.parts for all
  using (public.has_permission(organization_id, 'inventory.manage'))
  with check (public.has_permission(organization_id, 'inventory.manage'));

drop policy if exists "branch_stock_select" on public.branch_stock;
create policy "branch_stock_select" on public.branch_stock for select
  using (public.is_branch_member(branch_id));
drop policy if exists "branch_stock_write" on public.branch_stock;
create policy "branch_stock_write" on public.branch_stock for all
  using (
    exists (
      select 1 from public.branches b
      where b.id = branch_id
        and public.has_permission(b.organization_id, 'inventory.manage', branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.branches b
      where b.id = branch_id
        and public.has_permission(b.organization_id, 'inventory.manage', branch_id)
    )
  );

drop policy if exists "stock_movements_select" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements for select
  using (public.is_branch_member(branch_id));
drop policy if exists "stock_movements_insert" on public.stock_movements;
create policy "stock_movements_insert" on public.stock_movements for insert
  with check (public.has_permission(organization_id, 'inventory.manage', branch_id));

create or replace function public.seed_demo_inventory(
  p_organization_id uuid,
  p_branch_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_part uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'Not an organization member';
  end if;

  select count(*) into v_count from public.parts where organization_id = p_organization_id;
  if v_count > 0 then
    return 0;
  end if;

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'BRK-PAD-001', 'BP-SWIFT', 'Front brake pads', 'Bosch', 650, 980, 18, 4, '8901001001001')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 2);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'OIL-5W30-4L', 'EO-5W30', 'Engine oil 5W-30 4L', 'Castrol', 1200, 1650, 18, 6, '8901001001002')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 10);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'FIL-OIL-001', 'OF-001', 'Oil filter', 'Mann', 180, 320, 18, 8, '8901001001003')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 5);

  insert into public.parts (organization_id, sku, part_number, name, brand, cost_price, selling_price, gst_percent, reorder_level, barcode)
  values
    (p_organization_id, 'WPR-BLD-22', 'WB-22', 'Wiper blade 22"', 'Bosch', 220, 399, 18, 5, '8901001001004')
  returning id into v_part;
  insert into public.branch_stock (branch_id, part_id, quantity_on_hand) values (p_branch_id, v_part, 1);

  return 4;
end;
$$;

revoke all on function public.seed_demo_inventory(uuid, uuid) from public;
grant execute on function public.seed_demo_inventory(uuid, uuid) to authenticated;
