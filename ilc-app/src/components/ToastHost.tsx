import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useUIStore } from '@/src/lib/stores/uiStore';
import { useTheme } from '@/src/lib/theme/useTheme';

export function ToastHost() {
  const { palette, tokens } = useTheme();
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {toasts.slice(-3).map((t) => (
        <Pressable
          key={t.id}
          onPress={() => removeToast(t.id)}
          style={[
            styles.toast,
            {
              backgroundColor: palette.surface,
              borderColor: palette.divider,
              borderRadius: tokens.radius.md,
            },
          ]}
        >
          <Text style={{ color: palette.text }}>{t.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  toast: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

