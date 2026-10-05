import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  getPayrollRun,
  listMonthAttendance,
  markPayrollPaid,
  savePayrollRun,
  type SlipInput,
} from '../../repositories';

export type PayrollMonth = { year: number; month: number };

export const payrollKeys = {
  all: ['payroll'] as const,
  attendance: (branchId: string, year: number, month: number) =>
    [...payrollKeys.all, 'attendance', branchId, year, month] as const,
  run: (orgId: string, branchId: string, year: number, month: number) =>
    [...payrollKeys.all, 'run', orgId, branchId, year, month] as const,
};

export function useMonthAttendance({ year, month }: PayrollMonth) {
  const { branchId } = usePermissions();
  return useQuery({
    queryKey: payrollKeys.attendance(branchId ?? '', year, month),
    enabled: Boolean(branchId),
    queryFn: () => listMonthAttendance({ branchId: branchId!, year, month }),
  });
}

export function usePayrollRun({ year, month }: PayrollMonth) {
  const { organizationId, branchId, can } = usePermissions();
  return useQuery({
    queryKey: payrollKeys.run(organizationId ?? '', branchId ?? '', year, month),
    enabled: Boolean(organizationId && branchId) && (can('payroll.read') || can('payroll.manage')),
    queryFn: () =>
      getPayrollRun({ organizationId: organizationId!, branchId: branchId!, year, month }),
  });
}

export function useSavePayrollRun() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { organizationId, branchId } = usePermissions();
  return useMutation({
    mutationFn: async (input: PayrollMonth & { slips: SlipInput[] }) => {
      if (!organizationId || !branchId) throw new Error('Missing branch context');
      return savePayrollRun({ ...input, organizationId, branchId, createdBy: user?.uid ?? null });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => markPayrollPaid(runId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}
