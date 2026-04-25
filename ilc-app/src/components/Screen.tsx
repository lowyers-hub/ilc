import React from 'react';
import { SafeAreaView, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/src/lib/theme/useTheme';

export function Screen({ style, children, ...props }: ViewProps) {
  const { palette } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={[styles.inner, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
});

