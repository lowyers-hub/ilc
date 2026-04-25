import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';

import { createPayment, getPayment, simulatePaymentFailed, simulatePaymentSuccess } from './paymentsApi';

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: qk.payment(paymentId),
    queryFn: () => getPayment(paymentId),
    enabled: Boolean(paymentId),
    refetchInterval: (q) => (q.state.data?.status === 'requires_action' ? 2000 : false),
  });
}

export function useCreatePayment() {
  return useMutation({ mutationFn: createPayment });
}

export function useSimulatePaymentSuccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: simulatePaymentSuccess,
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: qk.payment(p.id) });
      await qc.invalidateQueries({ queryKey: qk.consultations() });
    },
  });
}

export function useSimulatePaymentFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: simulatePaymentFailed,
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: qk.payment(p.id) });
    },
  });
}

