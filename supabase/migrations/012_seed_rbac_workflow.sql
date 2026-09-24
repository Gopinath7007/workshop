-- Seed system roles, permissions, role matrix, and default job workflow.

insert into public.roles (id, name, description, rank) values
  ('super_admin', 'Super Admin', 'Platform / multi-org administrator', 1),
  ('owner', 'Owner', 'Organization owner', 10),
  ('branch_manager', 'Branch Manager', 'Branch operations lead', 20),
  ('service_advisor', 'Service Advisor', 'Customer-facing job advisor', 30),
  ('technician', 'Technician', 'Workshop floor technician', 40),
  ('accountant', 'Accountant', 'Billing and finance', 50),
  ('store_manager', 'Store Manager', 'Parts and inventory', 60),
  ('hr_manager', 'HR Manager', 'People and payroll', 70),
  ('receptionist', 'Receptionist', 'Front desk vehicle entry', 80),
  ('customer', 'Customer', 'Customer portal access', 90)
on conflict (id) do nothing;

insert into public.permissions (id, module, action, description) values
  ('dashboard.view', 'dashboard', 'view', 'View dashboard widgets'),
  ('customers.create', 'customers', 'create', 'Create customers'),
  ('customers.read', 'customers', 'read', 'View customers'),
  ('customers.update', 'customers', 'update', 'Update customers'),
  ('customers.delete', 'customers', 'delete', 'Delete customers'),
  ('vehicles.create', 'vehicles', 'create', 'Create vehicles'),
  ('vehicles.read', 'vehicles', 'read', 'View vehicles'),
  ('vehicles.update', 'vehicles', 'update', 'Update vehicles'),
  ('vehicles.scan', 'vehicles', 'scan', 'Scan number plates'),
  ('job_cards.create', 'job_cards', 'create', 'Create job cards'),
  ('job_cards.read', 'job_cards', 'read', 'View job cards'),
  ('job_cards.update', 'job_cards', 'update', 'Update job cards'),
  ('job_cards.transition', 'job_cards', 'transition', 'Change job status'),
  ('job_cards.assign', 'job_cards', 'assign', 'Assign technician/advisor'),
  ('estimates.manage', 'estimates', 'manage', 'Create and manage estimates'),
  ('estimates.approve', 'estimates', 'approve', 'Approve/reject estimates'),
  ('inventory.manage', 'inventory', 'manage', 'Manage parts and stock'),
  ('inventory.read', 'inventory', 'read', 'View inventory'),
  ('billing.manage', 'billing', 'manage', 'Invoices and payments'),
  ('billing.read', 'billing', 'read', 'View invoices'),
  ('employees.manage', 'employees', 'manage', 'Manage employees'),
  ('employees.read', 'employees', 'read', 'View employees'),
  ('attendance.manage', 'attendance', 'manage', 'Mark attendance'),
  ('attendance.self', 'attendance', 'self', 'Mark own attendance'),
  ('payroll.manage', 'payroll', 'manage', 'Run payroll'),
  ('payroll.read', 'payroll', 'read', 'View salary slips'),
  ('reports.view', 'reports', 'view', 'View reports'),
  ('reports.export', 'reports', 'export', 'Export reports'),
  ('documents.manage', 'documents', 'manage', 'Upload/manage documents'),
  ('notifications.manage', 'notifications', 'manage', 'Configure notifications'),
  ('branches.manage', 'branches', 'manage', 'Manage branches'),
  ('rbac.manage', 'rbac', 'manage', 'Manage roles and permissions'),
  ('settings.manage', 'settings', 'manage', 'Organization settings')
on conflict (id) do nothing;

-- Helper: grant all listed permissions to a role.
create or replace function public._grant_role_perms(p_role text, p_perms text[])
returns void
language plpgsql
as $$
declare
  p text;
begin
  foreach p in array p_perms loop
    insert into public.role_permissions (role_id, permission_id)
    values (p_role, p)
    on conflict do nothing;
  end loop;
end;
$$;

select public._grant_role_perms('super_admin', array(select id from public.permissions));
select public._grant_role_perms('owner', array(select id from public.permissions where id <> 'rbac.manage'));
-- Owners also get rbac
insert into public.role_permissions (role_id, permission_id) values ('owner', 'rbac.manage')
on conflict do nothing;

select public._grant_role_perms('branch_manager', array[
  'dashboard.view','customers.create','customers.read','customers.update',
  'vehicles.create','vehicles.read','vehicles.update','vehicles.scan',
  'job_cards.create','job_cards.read','job_cards.update','job_cards.transition','job_cards.assign',
  'estimates.manage','estimates.approve','inventory.read','inventory.manage','billing.read','billing.manage',
  'employees.read','attendance.manage','reports.view','reports.export','documents.manage'
]);

select public._grant_role_perms('service_advisor', array[
  'dashboard.view','customers.create','customers.read','customers.update',
  'vehicles.create','vehicles.read','vehicles.update','vehicles.scan',
  'job_cards.create','job_cards.read','job_cards.update','job_cards.transition','job_cards.assign',
  'estimates.manage','estimates.approve','inventory.read','billing.read','documents.manage'
]);

select public._grant_role_perms('technician', array[
  'dashboard.view','job_cards.read','job_cards.update','job_cards.transition',
  'vehicles.read','inventory.read','documents.manage','attendance.self'
]);

select public._grant_role_perms('accountant', array[
  'dashboard.view','customers.read','billing.manage','billing.read',
  'estimates.manage','reports.view','reports.export','payroll.read'
]);

select public._grant_role_perms('store_manager', array[
  'dashboard.view','inventory.manage','inventory.read','job_cards.read','reports.view'
]);

select public._grant_role_perms('hr_manager', array[
  'dashboard.view','employees.manage','employees.read','attendance.manage',
  'payroll.manage','payroll.read','reports.view','reports.export'
]);

select public._grant_role_perms('receptionist', array[
  'dashboard.view','customers.create','customers.read','vehicles.create','vehicles.read',
  'vehicles.scan','job_cards.create','job_cards.read','attendance.self'
]);

select public._grant_role_perms('customer', array[
  'vehicles.read','job_cards.read','estimates.approve','billing.read','documents.manage'
]);

drop function public._grant_role_perms(text, text[]);

-- Default job card workflow transitions.
insert into public.workflow_transitions (from_status, to_status, required_permission, label) values
  ('open', 'inspection', 'job_cards.transition', 'Start inspection'),
  ('inspection', 'waiting_approval', 'job_cards.transition', 'Send for approval'),
  ('waiting_approval', 'in_progress', 'estimates.approve', 'Customer approved'),
  ('waiting_approval', 'cancelled', 'job_cards.transition', 'Reject / cancel'),
  ('in_progress', 'parts_pending', 'job_cards.transition', 'Parts pending'),
  ('parts_pending', 'in_progress', 'job_cards.transition', 'Parts received'),
  ('in_progress', 'qc', 'job_cards.transition', 'Send to QC'),
  ('qc', 'in_progress', 'job_cards.transition', 'QC failed — rework'),
  ('qc', 'ready_delivery', 'job_cards.transition', 'QC passed'),
  ('ready_delivery', 'delivered', 'job_cards.transition', 'Deliver vehicle'),
  ('delivered', 'closed', 'billing.manage', 'Close job'),
  ('open', 'cancelled', 'job_cards.transition', 'Cancel')
on conflict (from_status, to_status) do nothing;

-- India-oriented service categories seed (org-agnostic catalog templates live in app seed later).
