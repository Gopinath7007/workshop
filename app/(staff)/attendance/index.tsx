import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import {
  useAttendanceSummary,
  useEmployees,
  useMarkAttendance,
  useTodayAttendance,
} from '../../../src/modules/hr/hooks';
import { Button } from '../../../src/ui/Button';
import { Screen } from '../../../src/ui/Screen';
import { colors, radius, space } from '../../../src/ui/theme';
import type { AttendanceStatus } from '../../../src/types';

export default function AttendanceScreen() {
  const { can } = usePermissions();
  const employeesQuery = useEmployees();
  const attendanceQuery = useTodayAttendance();
  const summaryQuery = useAttendanceSummary();
  const mark = useMarkAttendance();

  const byEmployee = new Map(
    (attendanceQuery.data ?? []).map((a) => [a.employeeId, a]),
  );
  const summary = summaryQuery.data;

  const setStatus = (employeeId: string, status: AttendanceStatus) => {
    void mark.mutateAsync({ employeeId, status }).catch((error) => {
      Alert.alert('Failed', error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.body}>Manual marking for today. QR / GPS / biometric hooks later.</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryItem}>Present {summary?.present ?? 0}</Text>
        <Text style={styles.summaryItem}>Late {summary?.late ?? 0}</Text>
        <Text style={styles.summaryItem}>Absent {summary?.absent ?? 0}</Text>
        <Text style={styles.summaryItem}>Leave {summary?.onLeave ?? 0}</Text>
      </View>

      {employeesQuery.isLoading || attendanceQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.list}>
          {(employeesQuery.data ?? []).map((e) => {
            const current = byEmployee.get(e.id);
            return (
              <View key={e.id} style={styles.card}>
                <Text style={styles.cardTitle}>{e.fullName}</Text>
                <Text style={styles.meta}>
                  {current ? `Today: ${current.status}` : 'Not marked'}
                </Text>
                {can('attendance.manage') ? (
                  <View style={styles.actions}>
                    <Button label="Present" onPress={() => setStatus(e.id, 'present')} />
                    <Button
                      label="Late"
                      variant="ghost"
                      onPress={() => setStatus(e.id, 'late')}
                    />
                    <Button
                      label="Absent"
                      variant="ghost"
                      onPress={() => setStatus(e.id, 'absent')}
                    />
                    <Button
                      label="Leave"
                      variant="ghost"
                      onPress={() => setStatus(e.id, 'on_leave')}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  summaryItem: {
    color: colors.accent,
    fontWeight: '700',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  list: { gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  actions: { gap: space.xs },
});
