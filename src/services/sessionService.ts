import { permissionsForRoles } from '../modules/rbac/permissions';
import { getDataMode } from '../repositories';
import { requireSupabase, throwIfError } from '../repositories/supabase/client';
import type { WorkshopMembership } from '../store/sessionStore';
import type { PermissionId, SessionContext, SystemRole } from '../types';

export type CreateWorkshopInput = {
  orgName: string;
  branchName?: string;
  gstin?: string;
  phone?: string;
  city?: string;
  state?: string;
  billingEmail?: string;
};

export type WorkshopSession = SessionContext & {
  organizationName: string | null;
  memberships: WorkshopMembership[];
  needsOnboarding: boolean;
};

async function loadMemberships(userId: string): Promise<WorkshopMembership[]> {
  const sb = requireSupabase();
  const { data: roles, error } = await sb
    .from('user_roles')
    .select('organization_id, branch_id, role_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  throwIfError(error, 'Could not load workshop memberships');

  if (!roles?.length) return [];

  const orgIds = [...new Set(roles.map((r) => r.organization_id as string))];
  const { data: orgs, error: orgError } = await sb
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);
  throwIfError(orgError, 'Could not load workshops');

  const nameById = new Map((orgs ?? []).map((o) => [o.id as string, o.name as string]));

  return roles.map((r) => ({
    organizationId: r.organization_id as string,
    branchId: (r.branch_id as string | null) ?? null,
    organizationName: nameById.get(r.organization_id as string) ?? 'Workshop',
    roleId: r.role_id as SystemRole,
  }));
}

function pickPrimary(
  memberships: WorkshopMembership[],
  preferredOrgId?: string | null,
  preferredBranchId?: string | null,
): WorkshopMembership | null {
  if (!memberships.length) return null;
  const preferred =
    (preferredOrgId
      ? memberships.find((m) => m.organizationId === preferredOrgId)
      : null) ?? memberships[0];
  return {
    ...preferred,
    branchId: preferredBranchId ?? preferred.branchId,
  };
}

export async function loadSessionContext(): Promise<WorkshopSession | null> {
  const sb = requireSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('preferred_organization_id, preferred_branch_id')
    .eq('id', user.id)
    .maybeSingle();

  const memberships = await loadMemberships(user.id);
  if (!memberships.length) {
    return {
      userId: user.id,
      organizationId: '',
      branchId: null,
      roles: [],
      permissions: [],
      organizationName: null,
      memberships: [],
      needsOnboarding: true,
    };
  }

  const primary = pickPrimary(
    memberships,
    profile?.preferred_organization_id,
    profile?.preferred_branch_id,
  )!;

  const orgRoles = memberships
    .filter((m) => m.organizationId === primary.organizationId)
    .map((m) => m.roleId);
  const systemRoles = [...new Set(orgRoles)] as SystemRole[];

  return {
    userId: user.id,
    organizationId: primary.organizationId,
    branchId: primary.branchId,
    roles: systemRoles,
    permissions: permissionsForRoles(systemRoles),
    organizationName: primary.organizationName,
    memberships,
    needsOnboarding: false,
  };
}

export async function createWorkshop(input: CreateWorkshopInput): Promise<WorkshopSession> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('create_workshop', {
    p_org_name: input.orgName,
    p_branch_name: input.branchName ?? 'Head Office',
    p_branch_code: 'HO',
    p_gstin: input.gstin ?? null,
    p_phone: input.phone ?? null,
    p_city: input.city ?? null,
    p_state: input.state ?? null,
    p_billing_email: input.billingEmail ?? null,
  });
  throwIfError(error, 'Could not create workshop');
  const row = data as {
    organization_id: string;
    branch_id: string;
    role_id: string;
  };
  const systemRoles: SystemRole[] = [row.role_id as SystemRole];
  return {
    userId: (await sb.auth.getUser()).data.user!.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    roles: systemRoles,
    permissions: permissionsForRoles(systemRoles),
    organizationName: input.orgName,
    memberships: [
      {
        organizationId: row.organization_id,
        branchId: row.branch_id,
        organizationName: input.orgName,
        roleId: row.role_id as SystemRole,
      },
    ],
    needsOnboarding: false,
  };
}

export async function acceptWorkshopInvite(code: string): Promise<WorkshopSession> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('accept_workshop_invite', {
    p_code: code.trim().toUpperCase(),
  });
  throwIfError(error, 'Could not join workshop');
  void data;
  const ctx = await loadSessionContext();
  if (!ctx || ctx.needsOnboarding) {
    throw new Error('Joined but session could not load');
  }
  return ctx;
}

export async function createWorkshopInvite(input?: {
  roleId?: SystemRole;
  daysValid?: number;
  maxUses?: number;
}): Promise<{ code: string; roleId: string; expiresAt: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('create_workshop_invite', {
    p_role_id: input?.roleId ?? 'service_advisor',
    p_days_valid: input?.daysValid ?? 30,
    p_max_uses: input?.maxUses ?? 20,
  });
  throwIfError(error, 'Could not create invite');
  const row = data as { code: string; role_id: string; expires_at: string };
  return { code: row.code, roleId: row.role_id, expiresAt: row.expires_at };
}

export async function setActiveWorkshop(
  organizationId: string,
  branchId?: string | null,
): Promise<WorkshopSession> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('set_active_workshop', {
    p_organization_id: organizationId,
    p_branch_id: branchId ?? null,
  });
  throwIfError(error, 'Could not switch workshop');
  const ctx = await loadSessionContext();
  if (!ctx || ctx.needsOnboarding) throw new Error('Switch failed');
  return ctx;
}

/** @deprecated Prefer createWorkshop; kept for older clients. */
export async function bootstrapWorkshopSession(input?: {
  orgName?: string;
  branchName?: string;
}): Promise<{ organizationId: string; branchId: string; roleId: SystemRole; created: boolean }> {
  const created = await createWorkshop({
    orgName: input?.orgName ?? 'My Workshop',
    branchName: input?.branchName ?? 'Head Office',
  });
  return {
    organizationId: created.organizationId,
    branchId: created.branchId!,
    roleId: created.roles[0],
    created: true,
  };
}

export async function resolveAppSession(): Promise<WorkshopSession | null> {
  if (getDataMode() !== 'supabase') return null;
  return loadSessionContext();
}

export type { PermissionId };
