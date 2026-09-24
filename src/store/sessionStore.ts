import { create } from 'zustand';
import type { PermissionId, SessionContext, SystemRole } from '../types';
import { can, permissionsForRoles } from '../modules/rbac/permissions';

type SessionState = {
  organizationId: string | null;
  branchId: string | null;
  roles: SystemRole[];
  permissions: PermissionId[];
  setContext: (ctx: Pick<SessionContext, 'organizationId' | 'branchId' | 'roles' | 'permissions'>) => void;
  setRoles: (roles: SystemRole[]) => void;
  clear: () => void;
  can: (permission: PermissionId | PermissionId[]) => boolean;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  organizationId: null,
  branchId: null,
  roles: [],
  permissions: [],
  setContext: (ctx) =>
    set({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId ?? null,
      roles: ctx.roles,
      permissions: ctx.permissions,
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
      roles: [],
      permissions: [],
    }),
  can: (permission) => can(get().permissions, permission),
}));
