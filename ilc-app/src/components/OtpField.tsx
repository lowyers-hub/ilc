import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

export function OtpField({
  value,
  onChangeText,
  length = 6,
}: {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
}) {
  const { palette, tokens } = useTheme();

  return (
    <View style={[styles.row, { gap: tokens.space.sm }]}>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        style={[
          styles.input,
          {
            borderColor: palette.divider,
            color: palette.text,
            borderRadius: tokens.radius.md,
          },
        ]}
        textAlign="center"
        maxLength={length}
        accessibilityLabel="OTP code"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
  },
});

