import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle, Platform, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = Omit<PressableProps, 'style'> & { 
  title: string; 
  variant?: Variant; 
  style?: StyleProp<ViewStyle>;
  isLoading?: boolean;
};

export function Button({ title, variant = 'primary', disabled, isLoading, style, ...props }: ButtonProps) {
  const handlePress = (e: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (props.onPress) props.onPress(e);
  };

  const baseClasses = "flex-row items-center justify-center rounded-xl min-h-[44px] px-4 border border-transparent transition-colors duration-200";
  
  const variantClasses = {
    primary: "bg-accent hover:bg-opacity-80 active:bg-opacity-90",
    secondary: "bg-surface border-divider hover:bg-opacity-80 active:bg-opacity-90",
    ghost: "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10",
  };

  const textClasses = {
    primary: "text-white font-semibold text-base",
    secondary: "text-text font-semibold text-base",
    ghost: "text-accent font-semibold text-base",
  };

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={handlePress}
      className={`${baseClasses} ${variantClasses[variant]} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={style as any}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : 'currentColor'} />
      ) : (
        <Text className={textClasses[variant]}>{title}</Text>
      )}
    </Pressable>
  );
}

