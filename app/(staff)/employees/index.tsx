import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { useCreateEmployee, useEmployees } from '../../../src/modules/hr/hooks';
import type { Employee } from '../../../src/types';
import { Button } from '../../../src/ui/Button';
import { DataTable, type DataTableColumn } from '../../../src/ui/DataTable';
import { Screen } from '../../../src/ui/Screen';
import { TextField } from '../../../src/ui/TextField';
import { colors, radius, space } from '../../../src/ui/theme';

export default function EmployeesScreen() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const employeesQuery = useEmployees(search);
  const createEmployee = useCreateEmployee();

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'code',
        title: 'Code',
        minWidth: 110,
        render: (row) => <Text style={styles.cellAccent}>{row.employeeCode}</Text>,
      },
      {
        key: 'name',
        title: 'Name',
        minWidth: 180,
        render: (row) => <Text style={styles.cellPrimary}>{row.fullName}</Text>,
      },
      {
        key: 'designation',
        title: 'Designation',
        minWidth: 140,
        render: (row) => <Text style={styles.cellMuted}>{row.designation ?? '—'}</Text>,
      },
      {
        key: 'department',
        title: 'Dept',
        minWidth: 120,
        render: (row) => <Text style={styles.cellMuted}>{row.department ?? '—'}</Text>,
      },
      {
        key: 'mobile',
        title: 'Mobile',
        minWidth: 120,
        render: (row) => <Text style={styles.cellMuted}>{row.mobile ?? '—'}</Text>,
      },
    ],
    [],
  );

  const save = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Name required');
      return;
    }
    try {
      await createEmployee.mutateAsync({
        fullName: name,
        mobile,
        designation,
        department: 'Workshop',
      });
      setName('');
      setMobile('');
      setDesignation('');
      setShowCreate(false);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Employees</Text>
      <Text style={styles.body}>Team list in table view on web.</Text>
      <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name / code" />

      {can('employees.manage') ? (
        <Button
          label={showCreate ? 'Hide form' : 'Add employee'}
          variant={showCreate ? 'ghost' : 'primary'}
          onPress={() => setShowCreate((v) => !v)}
        />
      ) : null}

      {showCreate ? (
        <View style={styles.panel}>
          <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <TextField
            label="Designation"
            value={designation}
            onChangeText={setDesignation}
            autoCapitalize="words"
          />
          <Button label="Save" onPress={() => void save()} loading={createEmployee.isPending} />
        </View>
      ) : null}

      {employeesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <DataTable
          columns={columns}
          rows={employeesQuery.data ?? []}
          emptyMessage="No employees yet"
          onView={setViewing}
          onEdit={
            can('employees.manage')
              ? (row) => {
                  setViewing(row);
                  Alert.alert('Edit', 'Full employee edit form comes in the next HR pass.');
                }
              : undefined
          }
        />
      )}

      {viewing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{viewing.fullName}</Text>
          <Text style={styles.meta}>{viewing.employeeCode}</Text>
          <Text style={styles.meta}>{viewing.designation ?? '—'}</Text>
          <Text style={styles.meta}>{viewing.mobile ?? 'No mobile'}</Text>
          <Text style={styles.meta}>
            Basic ₹{viewing.basicSalary.toLocaleString('en-IN')}
          </Text>
          <Button label="Close" variant="ghost" onPress={() => setViewing(null)} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22 },
  meta: { color: colors.muted, fontSize: 13 },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cellPrimary: { color: colors.text, fontWeight: '600' },
  cellMuted: { color: colors.muted },
  cellAccent: { color: colors.accent, fontWeight: '700' },
});
