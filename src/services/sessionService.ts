import { permissionsForRoles } from '../modules/rbac/permissions';
import { getDataMode } from '../repositories';
import { requireSupabase, throwIfError } from '../repositories/supabase/client';
import type { PermissionId, SessionContext, SystemRole } from '../types';

export type BootstrapResult = {
  organizationId: string;
  branchId: string;
  roleId: SystemRole;
  created: boolean;
};

export async function bootstrapWorkshopSession(input?: {
  orgName?: string;
  branchName?: string;
}): Promise<BootstrapResult> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('bootstrap_workshop', {
    p_org_name: input?.orgName ?? 'My Workshop',
    p_branch_name: input?.branchName ?? 'Head Office',
    p_branch_code: 'HO',
  });
  throwIfError(error, 'Could not bootstrap workshop');
  const row = data as {
    organization_id: string;
    branch_id: string;
    role_id: string;
    created: boolean;
  };
  return {
    organizationId: row.organization_id,
    branchId: row.branch_id,
    roleId: row.role_id as SystemRole,
    created: Boolean(row.created),
  };
}

export async function loadSessionContext(): Promise<SessionContext | null> {
  const sb = requireSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: roles, error } = await sb
    .from('user_roles')
    .select('organization_id, branch_id, role_id')
    .eq('user_id', user.id)
    .eq('is_active', true);
  throwIfError(error, 'Could not load roles');

  if (!roles?.length) {
    const boot = await bootstrapWorkshopSession();
    const systemRoles: SystemRole[] = [boot.roleId];
    return {
      userId: user.id,
      organizationId: boot.organizationId,
      branchId: boot.branchId,
      roles: systemRoles,
      permissions: permissionsForRoles(systemRoles),
    };
  }

  const primary = roles[0];
  const systemRoles = [
    ...new Set(roles.map((r) => r.role_id as SystemRole)),
  ] as SystemRole[];

  return {
    userId: user.id,
    organizationId: primary.organization_id,
    branchId: primary.branch_id,
    roles: systemRoles,
    permissions: permissionsForRoles(systemRoles),
  };
}

export async function resolveAppSession(): Promise<SessionContext | null> {
  if (getDataMode() !== 'supabase') return null;
  return loadSessionContext();
}

export type { PermissionId };
