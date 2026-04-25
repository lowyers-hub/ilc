import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = Omit<PressableProps, 'style'> & { title: string; variant?: Variant; style?: StyleProp<ViewStyle> };

export function Button({ title, variant = 'primary', disabled, style, ...props }: ButtonProps) {
  const { palette, tokens } = useTheme();

  const bg =
    variant === 'primary'
      ? palette.accent
      : variant === 'secondary'
        ? palette.surface
        : 'transparent';

  const borderColor = variant === 'secondary' ? palette.divider : 'transparent';
  const textColor = variant === 'primary' ? '#fff' : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
      {...props}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '600' },
});
