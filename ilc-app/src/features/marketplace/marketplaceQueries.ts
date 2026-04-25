import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';

import {
  cancelConsultation,
  completeConsultation,
  confirmConsultation,
  createConsultation,
  getConsultation,
  getLawyer,
  listConsultations,
  listLawyers,
} from './marketplaceApi';

export function useLawyers() {
  return useQuery({ queryKey: qk.lawyers(), queryFn: async () => (await listLawyers()).items });
}

export function useLawyer(lawyerId: string) {
  return useQuery({ queryKey: qk.lawyer(lawyerId), queryFn: () => getLawyer(lawyerId), enabled: Boolean(lawyerId) });
}

export function useConsultations() {
  return useQuery({ queryKey: qk.consultations(), queryFn: async () => (await listConsultations()).items });
}

export function useConsultation(consultationId: string) {
  return useQuery({
    queryKey: qk.consultation(consultationId),
    queryFn: () => getConsultation(consultationId),
    enabled: Boolean(consultationId),
    refetchInterval: (q) => (q.state.data?.status === 'pending_payment' || q.state.data?.status === 'paid' ? 2000 : false),
  });
}

export function useCreateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createConsultation,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.consultations() });
    },
  });
}

export function useConfirmConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmConsultation,
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: qk.consultations() });
      await qc.invalidateQueries({ queryKey: qk.consultation(c.id) });
    },
  });
}

export function useCompleteConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeConsultation,
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: qk.consultations() });
      await qc.invalidateQueries({ queryKey: qk.consultation(c.id) });
    },
  });
}

export function useCancelConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelConsultation,
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: qk.consultations() });
      await qc.invalidateQueries({ queryKey: qk.consultation(c.id) });
    },
  });
}
