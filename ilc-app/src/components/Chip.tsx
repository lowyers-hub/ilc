import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'danger' }) {
  const { palette, tokens } = useTheme();
  const bg =
    tone === 'accent' ? `${palette.accent}22` : tone === 'danger' ? `${palette.danger}22` : `${palette.text}10`;
  const fg = tone === 'accent' ? palette.accent : tone === 'danger' ? palette.danger : palette.subtext;

  return (
    <View style={[styles.base, { backgroundColor: bg, borderRadius: tokens.radius.sm }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});

