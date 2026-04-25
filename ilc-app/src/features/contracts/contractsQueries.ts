import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';

import { createDraft, finalizeDraft, getDraft, listDrafts, listTemplates, updateDraft } from './contractsApi';

export function useContractTemplates() {
  return useQuery({ queryKey: qk.templates(), queryFn: listTemplates });
}

export function useContractDrafts() {
  return useQuery({ queryKey: qk.drafts(), queryFn: async () => (await listDrafts()).items });
}

export function useContractDraft(draftId: string) {
  return useQuery({ queryKey: qk.draft(draftId), queryFn: () => getDraft(draftId), enabled: Boolean(draftId) });
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: Parameters<typeof createDraft>[0]) => {
      const { enforceDraftOrThrow } = await import('@/src/lib/entitlements/enforce');
      enforceDraftOrThrow();
      return createDraft(args);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: qk.drafts() }),
    onSettled: async (data) => {
      if (data) {
        const { useEntitlementsStore } = await import('@/src/lib/stores/entitlementsStore');
        useEntitlementsStore.getState().recordDraftCreated();
      }
    },
  });
}

export function useUpdateDraft(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: any) => updateDraft(draftId, patch),
    onSuccess: async () => qc.invalidateQueries({ queryKey: qk.draft(draftId) }),
  });
}

export function useFinalizeDraft(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeDraft(draftId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.draft(draftId) });
      await qc.invalidateQueries({ queryKey: qk.drafts() });
    },
  });
}
