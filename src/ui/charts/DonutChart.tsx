import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { ChartSlice } from '../../modules/dashboard/insights';
import { colors, space } from '../theme';

export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  centerValue,
  centerLabel,
  formatValue = (n) => String(n),
}: {
  data: ChartSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  formatValue?: (n: number) => string;
}) {
  const total = data.reduce((t, s) => t + s.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = data.filter((s) => s.value > 0).length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = data
    .filter((s) => s.value > 0)
    .map((slice) => {
      const length = (slice.value / total) * circumference;
      const arc = {
        key: slice.key,
        color: slice.color,
        dash: `${Math.max(0, length - gap)} ${circumference}`,
        offset: -offset,
      };
      offset += length;
      return arc;
    });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colors.border}
              strokeWidth={thickness}
              fill="none"
            />
            {arcs.map((arc) => (
              <Circle
                key={arc.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={arc.color}
                strokeWidth={thickness}
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                fill="none"
              />
            ))}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={styles.centerValue}>{centerValue ?? formatValue(total)}</Text>
          {centerLabel ? <Text style={styles.centerLabel}>{centerLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((slice) => (
          <View key={slice.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={styles.legendValue}>{formatValue(slice.value)}</Text>
            <Text style={styles.legendPct}>
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  centerLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  legend: { gap: 8, minWidth: 180, flexGrow: 1, flexShrink: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: colors.text, flex: 1, fontSize: 13 },
  legendValue: { color: colors.text, fontWeight: '700', fontSize: 13 },
  legendPct: { color: colors.muted, fontSize: 12, width: 38, textAlign: 'right' },
});
