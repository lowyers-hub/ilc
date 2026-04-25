import { router } from 'expo-router';
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { useEntitlementsStore } from '@/src/lib/stores/entitlementsStore';
import { useUIStore } from '@/src/lib/stores/uiStore';

export function EntitlementGate({
  featureKey,
  children,
  ...props
}: Omit<PressableProps, 'onPress'> & {
  featureKey: string;
  children: React.ReactNode;
  onAllowedPress?: () => void;
}) {
  const can = useEntitlementsStore((s) => s.canFeature(featureKey));
  const toast = useUIStore((s) => s.pushToast);

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      onPress={() => {
        if (!can) {
          toast('Fitur premium.');
          router.push('/upgrade');
          return;
        }
        props.onAllowedPress?.();
      }}
    >
      {children}
    </Pressable>
  );
}
