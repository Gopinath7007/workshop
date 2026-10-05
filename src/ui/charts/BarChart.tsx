import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { DayBar } from '../../modules/dashboard/insights';
import { chartPalette } from '../../modules/dashboard/insights';
import { colors, space } from '../theme';

const compactInr = (n: number) => {
  if (n >= 100000) return `₹${Math.round(n / 10000) / 10}L`;
  if (n >= 1000) return `₹${Math.round(n / 100) / 10}k`;
  return `₹${Math.round(n)}`;
};

export function BarChart({ data, height = 200 }: { data: DayBar[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const axisLeft = 44;
  const axisBottom = 24;
  const plotH = height - axisBottom - 8;
  const plotW = Math.max(0, width - axisLeft);
  const max = Math.max(1, ...data.map((d) => Math.max(d.billed, d.collected)));
  const groupW = data.length ? plotW / data.length : 0;
  const barW = Math.min(18, groupW / 3);
  const ticks = [0, 0.5, 1];

  return (
    <View>
      <View style={styles.legend}>
        <LegendDot color={chartPalette.sky} label="Billed" />
        <LegendDot color={chartPalette.emerald} label="Collected" />
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="billed" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={chartPalette.sky} stopOpacity="1" />
                <Stop offset="1" stopColor={chartPalette.sky} stopOpacity="0.35" />
              </LinearGradient>
              <LinearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={chartPalette.emerald} stopOpacity="1" />
                <Stop offset="1" stopColor={chartPalette.emerald} stopOpacity="0.35" />
              </LinearGradient>
            </Defs>
            {ticks.map((t) => {
              const y = 8 + plotH * (1 - t);
              return [
                <Line
                  key={`l${t}`}
                  x1={axisLeft}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={colors.border}
                  strokeDasharray="4 4"
                />,
                <SvgText key={`t${t}`} x={axisLeft - 6} y={y + 4} fill={colors.muted} fontSize="10" textAnchor="end">
                  {compactInr(max * t)}
                </SvgText>,
              ];
            })}
            {data.map((d, i) => {
              const cx = axisLeft + groupW * i + groupW / 2;
              const bh = (d.billed / max) * plotH;
              const ch = (d.collected / max) * plotH;
              return [
                <Rect
                  key={`b${d.key}`}
                  x={cx - barW - 2}
                  y={8 + plotH - bh}
                  width={barW}
                  height={Math.max(bh, d.billed > 0 ? 2 : 0)}
                  rx={4}
                  fill="url(#billed)"
                />,
                <Rect
                  key={`c${d.key}`}
                  x={cx + 2}
                  y={8 + plotH - ch}
                  width={barW}
                  height={Math.max(ch, d.collected > 0 ? 2 : 0)}
                  rx={4}
                  fill="url(#collected)"
                />,
                <SvgText key={`x${d.key}`} x={cx} y={height - 6} fill={colors.muted} fontSize="11" textAnchor="middle">
                  {d.label}
                </SvgText>,
              ];
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: space.md, marginBottom: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
