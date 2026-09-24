import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from './Screen';
import { colors, radius, space } from './theme';

export function PlaceholderScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{description}</Text>
      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Coming in next slice</Text>
        <Text style={styles.panelBody}>
          Shell is wired with RBAC. Data screens will connect to Supabase repositories next.
        </Text>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  panelLabel: {
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  panelBody: {
    color: colors.muted,
    lineHeight: 20,
  },
});
