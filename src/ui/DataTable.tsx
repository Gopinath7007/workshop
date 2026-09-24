import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, radius, space } from './theme';

export type DataTableColumn<T> = {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
};

type Props<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  emptyMessage?: string;
  /** Force table even on narrow screens */
  forceTable?: boolean;
  getRowHighlight?: (row: T) => boolean;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onView,
  onEdit,
  emptyMessage = 'No rows',
  forceTable,
  getRowHighlight,
}: Props<T>) {
  const { width } = useWindowDimensions();
  const useTable = forceTable || Platform.OS === 'web' || width >= 768;
  const showActions = Boolean(onView || onEdit);

  if (!useTable) {
    return (
      <View style={styles.cardList}>
        {rows.length === 0 ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
        {rows.map((row) => (
          <View
            key={row.id}
            style={[styles.card, getRowHighlight?.(row) ? styles.cardAlert : null]}
          >
            {columns.map((col) => (
              <View key={col.key} style={styles.cardField}>
                <Text style={styles.cardLabel}>{col.title}</Text>
                <View>{col.render(row)}</View>
              </View>
            ))}
            {showActions ? (
              <View style={styles.cardActions}>
                {onView ? (
                  <IconButton icon="eye-outline" label="View" onPress={() => onView(row)} />
                ) : null}
                {onEdit ? (
                  <IconButton icon="create-outline" label="Edit" onPress={() => onEdit(row)} />
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  const actionWidth = 96;

  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  col.width != null ? { width: col.width } : null,
                  col.minWidth != null ? { minWidth: col.minWidth } : { minWidth: 120 },
                  col.flex != null ? { flex: col.flex } : null,
                ]}
              >
                <Text style={[styles.headerText, alignStyle(col.align)]}>{col.title}</Text>
              </View>
            ))}
            {showActions ? (
              <View style={[styles.headerCell, { width: actionWidth }]}>
                <Text style={[styles.headerText, styles.alignCenter]}>Actions</Text>
              </View>
            ) : null}
          </View>

          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          ) : (
            rows.map((row, index) => (
              <View
                key={row.id}
                style={[
                  styles.bodyRow,
                  index % 2 === 1 ? styles.bodyRowAlt : null,
                  getRowHighlight?.(row) ? styles.bodyRowAlert : null,
                ]}
              >
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.bodyCell,
                      col.width != null ? { width: col.width } : null,
                      col.minWidth != null ? { minWidth: col.minWidth } : { minWidth: 120 },
                      col.flex != null ? { flex: col.flex } : null,
                    ]}
                  >
                    <View style={alignStyle(col.align)}>{col.render(row)}</View>
                  </View>
                ))}
                {showActions ? (
                  <View style={[styles.bodyCell, styles.actionsCell, { width: actionWidth }]}>
                    {onView ? (
                      <IconButton icon="eye-outline" onPress={() => onView(row)} />
                    ) : null}
                    {onEdit ? (
                      <IconButton icon="create-outline" onPress={() => onEdit(row)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function alignStyle(align?: 'left' | 'right' | 'center') {
  if (align === 'right') return styles.alignRight;
  if (align === 'center') return styles.alignCenter;
  return styles.alignLeft;
}

function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
      accessibilityLabel={label ?? String(icon)}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
      {label ? <Text style={styles.iconLabel}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.field,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  headerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
  },
  bodyRowAlt: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bodyRowAlert: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  bodyCell: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyRow: {
    padding: space.lg,
  },
  empty: {
    color: colors.muted,
  },
  alignLeft: { alignItems: 'flex-start' },
  alignRight: { alignItems: 'flex-end' },
  alignCenter: { alignItems: 'center' },
  iconBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
  },
  iconBtnPressed: {
    backgroundColor: colors.field,
  },
  iconLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  cardList: {
    gap: space.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardAlert: {
    borderColor: colors.danger,
  },
  cardField: {
    gap: 2,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
});
