import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

type Tone = 'neutral' | 'accent' | 'danger' | 'success' | 'warning';

export function Chip({ label, tone = 'neutral', style }: { label: string; tone?: Tone; style?: ViewStyle }) {
  const { palette, tokens } = useTheme();

  const getToneColors = () => {
    switch (tone) {
      case 'accent':
        return { bg: `${palette.accent}22`, text: palette.accent };
      case 'danger':
        return { bg: `${palette.danger}22`, text: palette.danger };
      case 'success':
        return { bg: `${palette.success}22`, text: palette.success };
      case 'warning':
        return { bg: `${palette.warning}22`, text: palette.warning };
      case 'neutral':
      default:
        return { bg: palette.surface, text: palette.text, border: palette.divider };
    }
  };

  const colors = getToneColors();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.bg },
        colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});

