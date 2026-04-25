import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { palette, tokens } = useTheme();
  const Comp: any = onPress ? Pressable : View;

  return (
    <Comp
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.row,
        { borderBottomColor: palette.divider, paddingVertical: tokens.space.md },
        onPress && { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.subtext }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </Comp>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { marginTop: 4, fontSize: 13 },
});

