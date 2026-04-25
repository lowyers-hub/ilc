import { create } from 'zustand';

export type Toast = { id: string; message: string };

type UIState = {
  toasts: Toast[];
  pushToast: (message: string) => void;
  removeToast: (id: string) => void;
};

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  pushToast: (message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: `${Date.now()}-${Math.random()}`, message }],
    })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

