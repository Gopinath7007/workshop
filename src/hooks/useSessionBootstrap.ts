import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { ROLE_LABELS } from '../config/architecture';
import { isSupabaseConfigured } from '../lib/supabase';
import { permissionsForRoles } from '../modules/rbac/permissions';
import { getDataMode } from '../repositories';
import { resolveAppSession } from '../services/sessionService';
import { useSessionStore } from '../store/sessionStore';
import type { SystemRole } from '../types';

const DEV_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEV_BRANCH_ID = '00000000-0000-4000-8000-000000000011';

/** Loads org/branch/roles from Supabase, or falls back to local demo context. */
export function useSessionBootstrap() {
  const { user } = useAuth();
  const setContext = useSessionStore((s) => s.setContext);
  const clear = useSessionStore((s) => s.clear);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!user) {
        clear();
        if (active) setReady(true);
        return;
      }

      if (active) setReady(false);

      try {
        if (getDataMode() === 'supabase' && isSupabaseConfigured()) {
          const ctx = await resolveAppSession();
          if (!active) return;
          if (ctx) {
            setContext({
              organizationId: ctx.organizationId,
              branchId: ctx.branchId,
              roles: ctx.roles,
              permissions: ctx.permissions,
            });
            setReady(true);
            return;
          }
        }

        // Local / fallback demo context
        const defaultRole: SystemRole = 'branch_manager';
        setContext({
          organizationId: DEV_ORG_ID,
          branchId: DEV_BRANCH_ID,
          roles: [defaultRole],
          permissions: permissionsForRoles([defaultRole]),
        });
      } catch (error) {
        console.warn('[Session] bootstrap failed, using local context', error);
        const defaultRole: SystemRole = 'branch_manager';
        setContext({
          organizationId: DEV_ORG_ID,
          branchId: DEV_BRANCH_ID,
          roles: [defaultRole],
          permissions: permissionsForRoles([defaultRole]),
        });
      } finally {
        if (active) setReady(true);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [user?.uid, setContext, clear, user]);

  return ready;
}

export function useIsCustomerPortal(): boolean {
  const roles = useSessionStore((s) => s.roles);
  return roles.length > 0 && roles.every((r) => r === 'customer');
}

export { ROLE_LABELS, DEV_ORG_ID, DEV_BRANCH_ID };
