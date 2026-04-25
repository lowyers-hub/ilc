import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View className="flex-col gap-1">
      {label ? <Text className="text-subtext text-[13px] font-medium">{label}</Text> : null}
      <TextInput
        placeholderTextColor="var(--color-subtext)"
        className={`px-[14px] py-3 border text-base rounded-xl bg-surface text-text outline-none transition-colors duration-200 ${
          error
            ? 'border-danger focus:ring-1 focus:ring-danger focus:border-danger'
            : 'border-divider hover:border-gray-400 dark:hover:border-gray-500 focus:ring-1 focus:ring-accent focus:border-accent'
        }`}
        {...props}
      />
      {error ? <Text className="text-danger text-xs">{error}</Text> : null}
    </View>
  );
}

