import type { PermissionId } from '../types';
import { useSessionStore } from '../store/sessionStore';

export function usePermissions() {
  const permissions = useSessionStore((s) => s.permissions);
  const roles = useSessionStore((s) => s.roles);
  const can = useSessionStore((s) => s.can);
  const organizationId = useSessionStore((s) => s.organizationId);
  const branchId = useSessionStore((s) => s.branchId);

  return {
    permissions,
    roles,
    organizationId,
    branchId,
    can,
    canAny: (required: PermissionId[]) => required.some((p) => can(p)),
  };
}
