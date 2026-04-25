import React from 'react';
import { Text } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useTheme } from '@/src/lib/theme/useTheme';

export default function SettingsScreen() {
  const { palette, tokens } = useTheme();
  return (
    <Screen style={{ paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>Pengaturan</Text>
      <Text style={{ color: palette.subtext, marginTop: 8 }}>Placeholder: tema, notifikasi, preferensi.</Text>
    </Screen>
  );
}

