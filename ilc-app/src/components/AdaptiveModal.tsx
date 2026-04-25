import React, { forwardRef, useMemo } from 'react';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

export const AdaptiveModal = forwardRef(({ children, onClose }: { children: React.ReactNode; onClose?: () => void }, ref: any) => {
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  return (
    <BottomSheet 
      ref={ref} 
      index={-1} 
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
    >
      {children}
    </BottomSheet>
  );
});
