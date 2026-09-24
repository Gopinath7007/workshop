import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoriesForFocus, type VehicleFocus } from '../data/indianVehicleCatalog';
import {
  useVehicleMakes,
  useVehicleModels,
  useWorkshopVehicleFocus,
} from '../modules/vehicles/catalogHooks';
import type { VehicleCatalogModel } from '../repositories/vehicleCatalogTypes';
import { TextField } from './TextField';
import { colors, radius, space } from './theme';

export type VehicleCatalogSelection = {
  brand: string;
  model: string;
  vehicleType: string;
  fuelType: string;
  category: 'two_wheeler' | 'four_wheeler';
};

type Props = {
  onSelect: (selection: VehicleCatalogSelection) => void;
  /** Override workshop focus (e.g. temporary filter). */
  focusOverride?: VehicleFocus;
};

export function VehicleCatalogPicker({ onSelect, focusOverride }: Props) {
  const workshopFocus = useWorkshopVehicleFocus();
  const baseFocus = focusOverride ?? workshopFocus;
  const categoryOptions = categoriesForFocus(baseFocus);
  const [category, setCategory] = useState<'two_wheeler' | 'four_wheeler'>(
    categoryOptions[0] ?? 'four_wheeler',
  );
  const effectiveFocus: VehicleFocus =
    baseFocus === 'both' ? category : baseFocus;

  const [makeSearch, setMakeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [selectedMake, setSelectedMake] = useState<string | null>(null);

  const makesQuery = useVehicleMakes(effectiveFocus);
  const modelsQuery = useVehicleModels(selectedMake ?? undefined, effectiveFocus);

  const makes = useMemo(() => {
    const rows = makesQuery.data ?? [];
    const q = makeSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => m.name.toLowerCase().includes(q));
  }, [makesQuery.data, makeSearch]);

  const models = useMemo(() => {
    const rows = modelsQuery.data ?? [];
    const q = modelSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => m.name.toLowerCase().includes(q));
  }, [modelsQuery.data, modelSearch]);

  const pickModel = (row: VehicleCatalogModel) => {
    onSelect({
      brand: row.makeName,
      model: row.name,
      vehicleType: row.vehicleType,
      fuelType: row.defaultFuelType ?? '',
      category: row.category,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Select from Indian catalog</Text>
      <Text style={styles.meta}>
        {baseFocus === 'two_wheeler'
          ? 'Two-wheeler workshop — bikes & scooters'
          : baseFocus === 'four_wheeler'
            ? 'Four-wheeler workshop — cars & SUVs'
            : 'Mixed workshop — pick 2W or 4W'}
      </Text>

      {baseFocus === 'both' ? (
        <View style={styles.row}>
          {categoryOptions.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => {
                setCategory(c);
                setSelectedMake(null);
                setModelSearch('');
              }}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c === 'two_wheeler' ? '2 Wheeler' : '4 Wheeler'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextField
        label="Search make"
        value={makeSearch}
        onChangeText={setMakeSearch}
        placeholder="Maruti, Hero, Honda…"
      />
      <View style={styles.list}>
        {makes.slice(0, 40).map((m) => (
          <Pressable
            key={m.id}
            style={[styles.item, selectedMake === m.name && styles.itemActive]}
            onPress={() => {
              setSelectedMake(m.name);
              setModelSearch('');
            }}
          >
            <Text style={styles.itemText}>{m.name}</Text>
          </Pressable>
        ))}
      </View>

      {selectedMake ? (
        <>
          <Text style={styles.subtitle}>Models · {selectedMake}</Text>
          <TextField
            label="Search model"
            value={modelSearch}
            onChangeText={setModelSearch}
            placeholder="Swift, Activa…"
          />
          <View style={styles.list}>
            {models.slice(0, 60).map((m) => (
              <Pressable key={m.id} style={styles.item} onPress={() => pickModel(m)}>
                <Text style={styles.itemText}>{m.name}</Text>
                <Text style={styles.itemMeta}>
                  {m.vehicleType}
                  {m.defaultFuelType ? ` · ${m.defaultFuelType}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  subtitle: { color: colors.text, fontWeight: '700', marginTop: space.xs },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.bg },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.accent },
  list: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemActive: { backgroundColor: colors.bg },
  itemText: { color: colors.text, fontWeight: '600' },
  itemMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
