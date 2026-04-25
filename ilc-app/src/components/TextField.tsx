import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const { palette, tokens } = useTheme();

  return (
    <View style={{ gap: tokens.space.xs }}>
      {label ? <Text style={[styles.label, { color: palette.subtext }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.subtext}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            color: palette.text,
            borderColor: error ? palette.danger : palette.divider,
            borderRadius: tokens.radius.md,
          },
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500' },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  error: { fontSize: 12 },
});

