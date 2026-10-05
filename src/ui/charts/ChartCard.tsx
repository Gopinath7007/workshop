import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

export function ChartCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <View style={[styles.card, wide && styles.wide]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.action}>{actionLabel} ›</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 360,
    minWidth: 280,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
  },
  wide: { flexBasis: 640 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titles: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12 },
  action: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
