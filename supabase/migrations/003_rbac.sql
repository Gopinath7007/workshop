-- RBAC: roles, permissions, and scoped user role assignments.

create table if not exists public.permissions (
  id text primary key,
  module text not null,
  action text not null,
  description text,
  unique (module, action)
);

create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text,
  is_system boolean not null default true,
  rank int not null default 100
);

create table if not exists public.role_permissions (
  role_id text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- A user may hold different roles across orgs/branches.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  role_id text not null references public.roles (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, branch_id, role_id)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_org_branch_idx on public.user_roles (organization_id, branch_id);

create table if not exists public.organization_role_overrides (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role_id text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  allowed boolean not null,
  primary key (organization_id, role_id, permission_id)
);
