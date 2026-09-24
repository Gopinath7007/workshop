import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  attendanceSummary,
  createEmployee,
  ensureEmployeesSeed,
  listAttendance,
  listEmployees,
  markAttendance,
  type CreateEmployeeInput,
} from '../../repositories';
import type { AttendanceStatus } from '../../types';

export const hrKeys = {
  all: ['hr'] as const,
  employees: (orgId: string, branchId: string, search = '') =>
    [...hrKeys.all, 'employees', orgId, branchId, search] as const,
  attendance: (branchId: string, date: string) =>
    [...hrKeys.all, 'attendance', branchId, date] as const,
  summary: (branchId: string, date: string) =>
    [...hrKeys.all, 'summary', branchId, date] as const,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function useEmployees(search?: string) {
  const { organizationId, branchId } = usePermissions();
  return useQuery({
    queryKey: hrKeys.employees(organizationId ?? '', branchId ?? '', search ?? ''),
    enabled: Boolean(organizationId && branchId),
    queryFn: async () => {
      await ensureEmployeesSeed(organizationId!, branchId!);
      return listEmployees({
        organizationId: organizationId!,
        branchId,
        search,
      });
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  const { organizationId, branchId } = usePermissions();
  return useMutation({
    mutationFn: async (input: Omit<CreateEmployeeInput, 'organizationId' | 'branchId'>) => {
      if (!organizationId || !branchId) throw new Error('Missing branch context');
      return createEmployee({ ...input, organizationId, branchId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: hrKeys.all });
    },
  });
}

export function useTodayAttendance() {
  const { branchId } = usePermissions();
  const date = today();
  return useQuery({
    queryKey: hrKeys.attendance(branchId ?? '', date),
    enabled: Boolean(branchId),
    queryFn: () => listAttendance({ branchId: branchId!, date }),
  });
}

export function useAttendanceSummary() {
  const { branchId } = usePermissions();
  const date = today();
  return useQuery({
    queryKey: hrKeys.summary(branchId ?? '', date),
    enabled: Boolean(branchId),
    queryFn: () => attendanceSummary(branchId!, date),
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { organizationId, branchId } = usePermissions();
  return useMutation({
    mutationFn: async (input: { employeeId: string; status: AttendanceStatus }) => {
      if (!organizationId || !branchId) throw new Error('Missing branch context');
      return markAttendance({
        organizationId,
        branchId,
        employeeId: input.employeeId,
        status: input.status,
        method: 'manual',
        markedBy: user?.uid,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: hrKeys.all });
    },
  });
}
