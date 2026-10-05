import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useEmployees } from '../../../src/modules/hr/hooks';
import {
  calculateSlip,
  EMPTY_ADJUSTMENTS,
  payrollTotals,
  slipsToCsv,
  type PayAdjustments,
  type SlipCalculation,
} from '../../../src/modules/payroll/calculate';
import {
  useMarkPayrollPaid,
  useMonthAttendance,
  usePayrollRun,
  useSavePayrollRun,
  type PayrollMonth,
} from '../../../src/modules/payroll/hooks';
import { Button } from '../../../src/ui/Button';
import { DashboardWidget } from '../../../src/ui/DashboardWidget';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

type PayrollRow = SlipCalculation & { id: string; employeeCode: string; fullName: string };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const monthLabel = ({ year, month }: PayrollMonth) =>
  new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

function shiftMonth({ year, month }: PayrollMonth, delta: number): PayrollMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const toAmount = (value: string) => {
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function PayrollScreen() {
  const { can } = usePermissions();
  const canManage = can('payroll.manage');
  const now = new Date();
  const [period, setPeriod] = useState<PayrollMonth>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [adjustments, setAdjustments] = useState<Record<string, PayAdjustments>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ incentives: '', bonus: '', deductions: '' });

  const employeesQuery = useEmployees();
  const attendanceQuery = useMonthAttendance(period);
  const runQuery = usePayrollRun(period);
  const saveRun = useSavePayrollRun();
  const markPaid = useMarkPayrollPaid();

  const run = runQuery.data ?? null;
  const isPaid = run?.status === 'paid';
  const locked = isPaid || !canManage;

  useEffect(() => {
    const next: Record<string, PayAdjustments> = {};
    for (const slip of run?.slips ?? []) {
      next[slip.employeeId] = {
        incentives: slip.incentives,
        bonus: slip.bonus,
        deductions: slip.deductions,
      };
    }
    setAdjustments(next);
    setViewingId(null);
    setEditingId(null);
  }, [run]);

  const rows = useMemo<PayrollRow[]>(() => {
    const attendance = attendanceQuery.data ?? [];
    const savedSlips = new Map((run?.slips ?? []).map((s) => [s.employeeId, s]));
    return (employeesQuery.data ?? [])
      .filter((e) => e.isActive)
      .map((employee) => {
        const calc = calculateSlip(
          employee,
          attendance.filter((a) => a.employeeId === employee.id),
          period.year,
          period.month,
          adjustments[employee.id] ?? EMPTY_ADJUSTMENTS,
        );
        const saved = isPaid ? savedSlips.get(employee.id) : undefined;
        const amounts = saved
          ? {
              basic: saved.basic,
              overtimeAmount: saved.overtimeAmount,
              incentives: saved.incentives,
              bonus: saved.bonus,
              deductions: saved.deductions,
              pfEmployee: saved.pfEmployee,
              pfEmployer: saved.pfEmployer,
              esiEmployee: saved.esiEmployee,
              esiEmployer: saved.esiEmployer,
              netPay: saved.netPay,
              gross: saved.basic + saved.overtimeAmount + saved.incentives + saved.bonus,
            }
          : {};
        return {
          ...calc,
          ...amounts,
          id: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
        };
      })
      .filter((row) => !isPaid || savedSlips.has(row.employeeId));
  }, [employeesQuery.data, attendanceQuery.data, run, isPaid, adjustments, period]);

  const totals = useMemo(() => payrollTotals(rows), [rows]);

  const columns = useMemo<DataTableColumn<PayrollRow>[]>(
    () => [
      {
        key: 'employee',
        title: 'Employee',
        minWidth: 180,
        render: (row) => (
          <View>
            <Text style={styles.cellPrimary}>{row.fullName}</Text>
            <Text style={styles.cellMuted}>{row.employeeCode}</Text>
          </View>
        ),
      },
      {
        key: 'days',
        title: 'Days',
        width: 80,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>
            {row.payableDays}/{row.daysInMonth}
          </Text>
        ),
      },
      {
        key: 'basic',
        title: 'Basic',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellPrimary}>{inr(row.basic)}</Text>,
      },
      {
        key: 'extras',
        title: 'OT + Incentive',
        width: 130,
        align: 'right',
        render: (row) => (
          <Text style={styles.cellMuted}>{inr(row.overtimeAmount + row.incentives + row.bonus)}</Text>
        ),
      },
      {
        key: 'gross',
        title: 'Gross',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellPrimary}>{inr(row.gross)}</Text>,
      },
      {
        key: 'statutory',
        title: 'PF + ESI',
        width: 110,
        align: 'right',
        render: (row) => <Text style={styles.cellMuted}>{inr(row.pfEmployee + row.esiEmployee)}</Text>,
      },
      {
        key: 'net',
        title: 'Net pay',
        width: 120,
        align: 'right',
        render: (row) => <Text style={styles.cellAccent}>{inr(row.netPay)}</Text>,
      },
    ],
    [],
  );

  if (!can('payroll.read') && !canManage) {
    return <Redirect href="/(staff)/(tabs)" />;
  }

  const openEdit = (row: PayrollRow) => {
    setViewingId(null);
    setEditingId(row.id);
    setDraft({
      incentives: row.incentives ? String(row.incentives) : '',
      bonus: row.bonus ? String(row.bonus) : '',
      deductions: row.deductions ? String(row.deductions) : '',
    });
  };

  const applyEdit = () => {
    if (!editingId) return;
    setAdjustments((prev) => ({
      ...prev,
      [editingId]: {
        incentives: toAmount(draft.incentives),
        bonus: toAmount(draft.bonus),
        deductions: toAmount(draft.deductions),
      },
    }));
    setEditingId(null);
  };

  const saveDraft = async () => {
    try {
      await saveRun.mutateAsync({
        ...period,
        slips: rows.map((r) => ({
          employeeId: r.employeeId,
          basic: r.basic,
          incentives: r.incentives,
          overtimeAmount: r.overtimeAmount,
          bonus: r.bonus,
          deductions: r.deductions,
          pfEmployee: r.pfEmployee,
          pfEmployer: r.pfEmployer,
          esiEmployee: r.esiEmployee,
          esiEmployer: r.esiEmployer,
          netPay: r.netPay,
        })),
      });
    } catch (e) {
      Alert.alert('Payroll', e instanceof Error ? e.message : 'Could not save payroll');
    }
  };

  const confirmPaid = async () => {
    if (!run) return;
    try {
      await markPaid.mutateAsync(run.id);
    } catch (e) {
      Alert.alert('Payroll', e instanceof Error ? e.message : 'Could not mark payroll as paid');
    }
  };

  const exportCsv = () => {
    const csv = slipsToCsv(rows);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-${period.year}-${String(period.month).padStart(2, '0')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    Alert.alert('CSV export', 'CSV download is available on the web dashboard.');
  };

  const loading = employeesQuery.isLoading || attendanceQuery.isLoading || runQuery.isLoading;
  const viewing = rows.find((r) => r.id === viewingId) ?? null;
  const editing = rows.find((r) => r.id === editingId) ?? null;
  const statusText = isPaid
    ? `Paid${run?.processedAt ? ` on ${new Date(run.processedAt).toLocaleDateString('en-IN')}` : ''}`
    : run
      ? 'Draft saved'
      : 'Not saved yet';

  return (
    <Screen>
      <Text style={styles.title}>Payroll</Text>
      <Text style={styles.body}>
        Monthly salary from attendance, with overtime, incentives, PF and ESI.
      </Text>

      <View style={styles.monthRow}>
        <Button label="‹ Prev" variant="ghost" onPress={() => setPeriod((p) => shiftMonth(p, -1))} />
        <Text style={styles.monthLabel}>{monthLabel(period)}</Text>
        <Button label="Next ›" variant="ghost" onPress={() => setPeriod((p) => shiftMonth(p, 1))} />
      </View>
      <Text style={[styles.status, isPaid && styles.statusPaid]}>{statusText}</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.grid}>
            <DashboardWidget label="Employees" value={String(totals.employees)} hint="On this payroll" />
            <DashboardWidget label="Gross" value={inr(totals.gross)} hint="Before deductions" />
            <DashboardWidget label="Net payout" value={inr(totals.net)} hint="Transfer to staff" />
            <DashboardWidget label="Employer cost" value={inr(totals.employerCost)} hint="Gross + employer PF/ESI" />
            <DashboardWidget label="PF" value={inr(totals.pfTotal)} hint="Employee + employer" />
            <DashboardWidget label="ESI" value={inr(totals.esiTotal)} hint="Employee + employer" />
          </View>

          <View style={styles.actions}>
            {canManage && !isPaid ? (
              <Button
                label={saveRun.isPending ? 'Saving…' : run ? 'Update draft' : 'Save draft'}
                onPress={saveDraft}
                disabled={saveRun.isPending || rows.length === 0}
              />
            ) : null}
            {canManage && run && !isPaid ? (
              <Button
                label={markPaid.isPending ? 'Marking…' : 'Mark as paid'}
                variant="ghost"
                onPress={confirmPaid}
                disabled={markPaid.isPending}
              />
            ) : null}
            <Button label="Export CSV" variant="ghost" onPress={exportCsv} disabled={rows.length === 0} />
          </View>

          <DataTable
            columns={columns}
            rows={rows}
            onView={(row) => {
              setEditingId(null);
              setViewingId(row.id);
            }}
            onEdit={locked ? undefined : openEdit}
            emptyMessage="No active employees. Add staff from the HR screen."
          />

          {editing ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Adjust pay · {editing.fullName}</Text>
              <TextField
                label="Incentives (₹)"
                value={draft.incentives}
                onChangeText={(incentives) => setDraft((d) => ({ ...d, incentives }))}
                keyboardType="numeric"
              />
              <TextField
                label="Bonus (₹)"
                value={draft.bonus}
                onChangeText={(bonus) => setDraft((d) => ({ ...d, bonus }))}
                keyboardType="numeric"
              />
              <TextField
                label="Other deductions (₹) — advance, loan, canteen"
                value={draft.deductions}
                onChangeText={(deductions) => setDraft((d) => ({ ...d, deductions }))}
                keyboardType="numeric"
              />
              <View style={styles.actions}>
                <Button label="Apply" onPress={applyEdit} />
                <Button label="Cancel" variant="ghost" onPress={() => setEditingId(null)} />
              </View>
            </View>
          ) : null}

          {viewing ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>
                Salary slip · {viewing.fullName} ({viewing.employeeCode})
              </Text>
              <Text style={styles.cellMuted}>
                {monthLabel(period)} · {viewing.payableDays} of {viewing.daysInMonth} days payable
                {viewing.absentDays ? ` · ${viewing.absentDays} absent` : ''}
                {viewing.halfDays ? ` · ${viewing.halfDays} half-day` : ''}
              </Text>
              <SlipLine label="Basic (earned)" value={viewing.basic} />
              <SlipLine
                label={`Overtime (${Math.round(viewing.overtimeMinutes / 6) / 10} h)`}
                value={viewing.overtimeAmount}
              />
              <SlipLine label="Incentives" value={viewing.incentives} />
              <SlipLine label="Bonus" value={viewing.bonus} />
              <SlipLine label="Gross earnings" value={viewing.gross} strong />
              <SlipLine label="PF (employee 12%)" value={-viewing.pfEmployee} />
              <SlipLine label="ESI (employee 0.75%)" value={-viewing.esiEmployee} />
              <SlipLine label="Other deductions" value={-viewing.deductions} />
              <SlipLine label="Net pay" value={viewing.netPay} strong />
              <Text style={styles.cellMuted}>
                Employer contribution: PF {inr(viewing.pfEmployer)} · ESI {inr(viewing.esiEmployer)}
              </Text>
              <Button label="Close" variant="ghost" onPress={() => setViewingId(null)} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function SlipLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.slipLine}>
      <Text style={strong ? styles.cellPrimary : styles.cellMuted}>{label}</Text>
      <Text style={strong ? styles.cellAccent : styles.cellPrimary}>
        {value < 0 ? `− ${inr(-value)}` : inr(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  monthLabel: { color: colors.text, fontSize: 18, fontWeight: '700', minWidth: 150, textAlign: 'center' },
  status: { color: colors.muted, fontWeight: '600' },
  statusPaid: { color: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  slipLine: { flexDirection: 'row', justifyContent: 'space-between' },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
});
