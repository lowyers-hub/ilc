import React from 'react';
import { SafeAreaView, View, type ViewProps } from 'react-native';

export function Screen({ style, children, ...props }: ViewProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 w-full max-w-5xl mx-auto" style={style} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

