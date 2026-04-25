import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Modal, Pressable } from 'react-native';

export const AdaptiveModal = forwardRef(({ children, onClose }: { children: React.ReactNode; onClose?: () => void }, ref: any) => {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      setVisible(index >= 0);
    },
    close: () => {
      setVisible(false);
      onClose?.();
    }
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => { setVisible(false); onClose?.(); }}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <Pressable className="absolute inset-0 cursor-pointer" onPress={() => { setVisible(false); onClose?.(); }} />
        <View className="w-full max-w-md bg-surface border border-divider rounded-2xl p-6 z-10 shadow-xl">
          {children}
        </View>
      </View>
    </Modal>
  );
});
