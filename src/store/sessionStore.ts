import { create } from 'zustand';
import type { PermissionId, SystemRole } from '../types';
import { can, permissionsForRoles } from '../modules/rbac/permissions';

export type WorkshopMembership = {
  organizationId: string;
  branchId: string | null;
  organizationName: string;
  roleId: SystemRole;
};

type SessionState = {
  organizationId: string | null;
  branchId: string | null;
  organizationName: string | null;
  memberships: WorkshopMembership[];
  roles: SystemRole[];
  permissions: PermissionId[];
  needsOnboarding: boolean;
  setContext: (ctx: {
    organizationId: string | null;
    branchId?: string | null;
    roles: SystemRole[];
    permissions: PermissionId[];
    organizationName?: string | null;
    memberships?: WorkshopMembership[];
    needsOnboarding?: boolean;
  }) => void;
  setRoles: (roles: SystemRole[]) => void;
  clear: () => void;
  can: (permission: PermissionId | PermissionId[]) => boolean;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  organizationId: null,
  branchId: null,
  organizationName: null,
  memberships: [],
  roles: [],
  permissions: [],
  needsOnboarding: false,
  setContext: (ctx) =>
    set({
      organizationId: ctx.organizationId ?? null,
      branchId: ctx.branchId ?? null,
      organizationName: ctx.organizationName ?? null,
      memberships: ctx.memberships ?? get().memberships,
      roles: ctx.roles,
      permissions: ctx.permissions,
      needsOnboarding: ctx.needsOnboarding ?? false,
    }),
  setRoles: (roles) =>
    set({
      roles,
      permissions: permissionsForRoles(roles),
    }),
  clear: () =>
    set({
      organizationId: null,
      branchId: null,
      organizationName: null,
      memberships: [],
      roles: [],
      permissions: [],
      needsOnboarding: false,
    }),
  can: (permission) => can(get().permissions, permission),
}));
