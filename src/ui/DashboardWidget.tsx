import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from './theme';

export function DashboardWidget({
  label,
  value,
  hint,
  onPress,
  icon,
  tone = colors.accent,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: string;
  trend?: number | null;
}) {
  const content = (
    <>
      <View style={[styles.accentBar, { backgroundColor: tone }]} />
      <View style={styles.top}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? (
          <View style={[styles.iconBubble, { backgroundColor: `${tone}22` }]}>
            <Ionicons name={icon} size={18} color={tone} />
          </View>
        ) : null}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.bottom}>
        {trend != null ? (
          <View style={[styles.trend, { backgroundColor: trend >= 0 ? '#34D39922' : '#FB718522' }]}>
            <Ionicons
              name={trend >= 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend >= 0 ? colors.success : colors.danger}
            />
            <Text style={[styles.trendText, { color: trend >= 0 ? colors.success : colors.danger }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        ) : null}
        {hint ? (
          <Text style={[styles.hint, { color: icon ? colors.muted : tone }]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 160,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    paddingTop: space.md + 2,
    gap: 6,
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { color: colors.text, fontSize: 28, fontWeight: '800' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  trendText: { fontSize: 11, fontWeight: '800' },
  hint: { fontSize: 12, flexShrink: 1 },
});
