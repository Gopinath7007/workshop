import type { PermissionId, SystemRole } from '../types';

/**
 * Phase 1 architecture snapshot for Workshop MMS (India-first, Supabase).
 *
 * Decisions locked:
 * - Backend: Supabase (Auth + Postgres + Storage + Edge Functions later)
 * - Market: India (GST, INR, UPI) — no Aadhaar fields
 * - State: Zustand (session/UI) + TanStack Query (server)
 * - Ads: removed
 * - First vertical slice: Job Card end-to-end
 *
 * Supabase project (dev): https://pvpnaxjaacoiyyuicjzp.supabase.co
 * Switch account later by changing EXPO_PUBLIC_SUPABASE_* only.
 */

export const ARCHITECTURE = {
  market: 'IN',
  currency: 'INR',
  backend: 'supabase',
  firstVerticalSlice: 'job_card_e2e',
  supabaseUrl: 'https://pvpnaxjaacoiyyuicjzp.supabase.co',
} as const;

export const MODULE_ORDER = [
  'foundation',
  'rbac',
  'customers',
  'vehicles',
  'job_cards',
  'estimates',
  'billing',
  'inventory',
  'hr',
  'customer_portal',
  'notifications',
  'reports',
] as const;

export type ModuleId = (typeof MODULE_ORDER)[number];

export const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  branch_manager: 'Branch Manager',
  service_advisor: 'Service Advisor',
  technician: 'Technician',
  accountant: 'Accountant',
  store_manager: 'Store Manager',
  hr_manager: 'HR Manager',
  receptionist: 'Receptionist',
  customer: 'Customer',
};

/** Navigation modules gated by at least one of these permissions. */
export const NAV_GATES: Record<string, PermissionId[]> = {
  dashboard: ['dashboard.view'],
  customers: ['customers.read'],
  vehicles: ['vehicles.read'],
  jobCards: ['job_cards.read'],
  estimates: ['estimates.manage', 'estimates.approve'],
  inventory: ['inventory.read'],
  billing: ['billing.read'],
  employees: ['employees.read'],
  attendance: ['attendance.manage', 'attendance.self'],
  payroll: ['payroll.read', 'payroll.manage'],
  reports: ['reports.view'],
  settings: ['settings.manage', 'branches.manage', 'rbac.manage'],
};
