import type { JobCardStatus, PermissionId } from '../../types';

export interface WorkflowTransition {
  from: JobCardStatus;
  to: JobCardStatus;
  requiredPermission: PermissionId;
  label: string;
}

/** Canonical job-card state machine (mirrors `workflow_transitions` seed). */
export const JOB_CARD_TRANSITIONS: readonly WorkflowTransition[] = [
  { from: 'open', to: 'inspection', requiredPermission: 'job_cards.transition', label: 'Start inspection' },
  {
    from: 'inspection',
    to: 'waiting_approval',
    requiredPermission: 'job_cards.transition',
    label: 'Send for approval',
  },
  {
    from: 'waiting_approval',
    to: 'in_progress',
    requiredPermission: 'estimates.approve',
    label: 'Customer approved',
  },
  {
    from: 'waiting_approval',
    to: 'cancelled',
    requiredPermission: 'job_cards.transition',
    label: 'Reject / cancel',
  },
  {
    from: 'in_progress',
    to: 'parts_pending',
    requiredPermission: 'job_cards.transition',
    label: 'Parts pending',
  },
  {
    from: 'parts_pending',
    to: 'in_progress',
    requiredPermission: 'job_cards.transition',
    label: 'Parts received',
  },
  { from: 'in_progress', to: 'qc', requiredPermission: 'job_cards.transition', label: 'Send to QC' },
  { from: 'qc', to: 'in_progress', requiredPermission: 'job_cards.transition', label: 'QC failed — rework' },
  { from: 'qc', to: 'ready_delivery', requiredPermission: 'job_cards.transition', label: 'QC passed' },
  {
    from: 'ready_delivery',
    to: 'delivered',
    requiredPermission: 'job_cards.transition',
    label: 'Deliver vehicle',
  },
  { from: 'delivered', to: 'closed', requiredPermission: 'billing.manage', label: 'Close job' },
  { from: 'open', to: 'cancelled', requiredPermission: 'job_cards.transition', label: 'Cancel' },
] as const;

export function getAvailableTransitions(
  status: JobCardStatus,
  permissions: readonly PermissionId[],
): WorkflowTransition[] {
  return JOB_CARD_TRANSITIONS.filter(
    (t) => t.from === status && permissions.includes(t.requiredPermission),
  );
}

export function canTransition(
  from: JobCardStatus,
  to: JobCardStatus,
  permissions: readonly PermissionId[],
): boolean {
  return getAvailableTransitions(from, permissions).some((t) => t.to === to);
}

export function assertTransition(
  from: JobCardStatus,
  to: JobCardStatus,
  permissions: readonly PermissionId[],
): void {
  if (!canTransition(from, to, permissions)) {
    throw new Error(`Invalid or unauthorized job status transition: ${from} → ${to}`);
  }
}
