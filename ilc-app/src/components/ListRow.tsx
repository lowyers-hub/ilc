import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const Comp: any = onPress ? Pressable : View;

  return (
    <Comp
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className={`flex-row items-center justify-between border-b border-divider py-3 min-h-[44px] transition-colors duration-200 ${
        onPress ? 'hover:bg-black/5 dark:hover:bg-white/5 active:opacity-70 cursor-pointer' : ''
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-text text-base font-semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-subtext text-[13px] mt-1" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </Comp>
  );
}

