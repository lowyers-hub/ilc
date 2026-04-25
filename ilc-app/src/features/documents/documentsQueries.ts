import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';
import { logEvent } from '@/src/lib/telemetry/analytics';

import { createDocument, getDocument, getOcr, getRisk, listDocuments, startOcr, startRisk } from './documentsApi';

export function useDocuments() {
  return useQuery({ queryKey: qk.documents(), queryFn: async () => (await listDocuments()).items });
}

export function useDocument(docId: string) {
  return useQuery({
    queryKey: qk.document(docId),
    queryFn: () => getDocument(docId),
    enabled: Boolean(docId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1500 : false),
  });
}

export function useOcr(docId: string) {
  return useQuery({
    queryKey: qk.ocr(docId),
    queryFn: async () => {
      try {
        return await getOcr(docId);
      } catch (e: any) {
        logEvent('ocr_failed', { docId, reason: e?.message });
        throw e;
      }
    },
    enabled: Boolean(docId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 2500 : false),
  });
}

export function useRisk(docId: string) {
  return useQuery({
    queryKey: qk.risk(docId),
    queryFn: async () => {
      try {
        return await getRisk(docId);
      } catch (e: any) {
        logEvent('risk_failed', { docId, reason: e?.message });
        throw e;
      }
    },
    enabled: Boolean(docId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 2500 : false),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.documents() });
    },
  });
}

export function useStartOcr(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => startOcr(docId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.document(docId) });
      await qc.invalidateQueries({ queryKey: qk.ocr(docId) });
    },
    onError: (e: any) => logEvent('ocr_failed', { docId, reason: e?.message }),
  });
}

export function useStartRisk(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { enforceDocumentRiskOrThrow } = await import('@/src/lib/entitlements/enforce');
      enforceDocumentRiskOrThrow();
      return startRisk(docId, 'quick');
    },
    onSuccess: async () => {
      const { useEntitlementsStore } = await import('@/src/lib/stores/entitlementsStore');
      useEntitlementsStore.getState().recordDocumentRiskUsed();
      await qc.invalidateQueries({ queryKey: qk.document(docId) });
      await qc.invalidateQueries({ queryKey: qk.risk(docId) });
    },
    onError: (e: any) => logEvent('risk_failed', { docId, reason: e?.message }),
  });
}
