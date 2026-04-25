import { env } from '@/src/lib/env';
import { requestJson, requestMultipart } from '@/src/lib/api/client';
import type { Document, OcrResult, RiskAnalysis } from '@/src/types/models';

type Paginated<T> = { items: T[]; nextCursor: string | null };

let mockDocs: Document[] = [
  { id: 'doc_1', title: 'Perjanjian Kerja', source: 'file', status: 'ready', createdAt: new Date().toISOString() },
  { id: 'doc_2', title: 'Kontrak Sewa', source: 'camera', status: 'processing', createdAt: new Date().toISOString() },
];

type JobStatus = 'idle' | 'processing' | 'ready' | 'failed';
type MockJob<T> = { status: JobStatus; startedAt?: number; result?: T; error?: string };
const mockOcrByDocId = new Map<string, MockJob<OcrResult>>();
const mockRiskByDocId = new Map<string, MockJob<RiskAnalysis>>();

type OcrEnvelope = { status: 'processing' | 'ready'; result: OcrResult | null };
type RiskEnvelope = { status: 'processing' | 'ready'; result: RiskAnalysis | null };

function shouldUseMock() {
  // If mock mode is enabled OR the feature flag isn't enabled, keep mock fallback.
  return env.useMockData || !env.useRealDocumentAnalysis;
}

export async function listDocuments(): Promise<Paginated<Document>> {
  if (shouldUseMock()) return { items: mockDocs, nextCursor: null };
  return requestJson<Paginated<Document>>('/v1/documents', { auth: true });
}

export async function createDocument(args: { uri: string; name: string; mimeType: string; title?: string; source: Document['source'] }): Promise<Document> {
  if (shouldUseMock()) {
    const doc: Document = {
      id: `doc_${Date.now()}`,
      title: args.title ?? args.name,
      source: args.source,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    };
    mockDocs = [doc, ...mockDocs];
    mockOcrByDocId.set(doc.id, { status: 'idle' });
    mockRiskByDocId.set(doc.id, { status: 'idle' });
    return doc;
  }

  const form = new FormData();
  form.append('title', args.title ?? args.name);
  // React Native FormData file object
  form.append('file', { uri: args.uri, name: args.name, type: args.mimeType } as any);
  const res = await requestMultipart<{ document: Document }>('/v1/documents', form, { auth: true, method: 'POST' });
  return res.document;
}

export async function getDocument(docId: string): Promise<Document> {
  if (shouldUseMock()) {
    const d = mockDocs.find((x) => x.id === docId);
    if (!d) throw new Error('Not found');

    const ocr = mockOcrByDocId.get(docId);
    const risk = mockRiskByDocId.get(docId);

    // Doc status is derived from job states: uploaded -> processing -> ready/failed
    const hasProcessing = ocr?.status === 'processing' || risk?.status === 'processing';
    const hasFailed = ocr?.status === 'failed' || risk?.status === 'failed';
    const hasReady = ocr?.status === 'ready' || risk?.status === 'ready';

    const nextStatus: Document['status'] = hasFailed ? 'failed' : hasProcessing ? 'processing' : hasReady ? 'ready' : 'uploaded';
    if (d.status !== nextStatus) {
      const updated = { ...d, status: nextStatus };
      mockDocs = mockDocs.map((x) => (x.id === docId ? updated : x));
      return updated;
    }
    return d;
  }
  return requestJson<Document>(`/v1/documents/${docId}`, { auth: true });
}

export async function getOcr(docId: string): Promise<OcrEnvelope> {
  if (shouldUseMock()) {
    const job = mockOcrByDocId.get(docId) ?? { status: 'idle' as const };
    if (job.status === 'processing') {
      const startedAt = job.startedAt ?? Date.now();
      const ageMs = Date.now() - startedAt;
      if (ageMs > 2_200) {
        const ready: MockJob<OcrResult> = {
          status: 'ready',
          result: { docId, text: 'Hasil OCR (demo): ...\n\nPasal 1 ...\nPasal 2 ...' },
        };
        mockOcrByDocId.set(docId, ready);
        return { status: 'ready', result: ready.result! };
      }
      return { status: 'processing', result: null };
    }

    if (job.status === 'ready') return { status: 'ready', result: job.result ?? null };
    if (job.status === 'failed') throw new Error(job.error ?? 'OCR failed');
    return { status: 'ready', result: null };
  }
  return requestJson<OcrEnvelope>(`/v1/documents/${docId}/ocr`, {
    auth: true,
    timeoutMs: 25_000,
    timeoutLabel: 'documents.ocr.get',
  });
}

export async function getRisk(docId: string): Promise<RiskEnvelope> {
  if (shouldUseMock()) {
    const job = mockRiskByDocId.get(docId) ?? { status: 'idle' as const };
    if (job.status === 'processing') {
      const startedAt = job.startedAt ?? Date.now();
      const ageMs = Date.now() - startedAt;
      if (ageMs > 2_700) {
        const ready: MockJob<RiskAnalysis> = {
          status: 'ready',
          result: {
            docId,
            overallRisk: 'medium',
            findings: [
              {
                severity: 'high',
                title: 'Klausul penalti tidak seimbang',
                description: 'Penalti dibebankan sepenuhnya pada salah satu pihak tanpa batasan yang wajar.',
                recommendation: 'Tambahkan batas maksimal penalti dan definisi pelanggaran yang jelas.',
              },
              {
                severity: 'medium',
                title: 'Definisi terminasi tidak jelas',
                description: 'Kondisi pemutusan perjanjian tidak didefinisikan secara spesifik.',
                recommendation: 'Jelaskan kondisi terminasi, notice period, dan konsekuensi.',
              },
            ],
          },
        };
        mockRiskByDocId.set(docId, ready);
        return { status: 'ready', result: ready.result! };
      }
      return { status: 'processing', result: null };
    }

    if (job.status === 'ready') return { status: 'ready', result: job.result ?? null };
    if (job.status === 'failed') throw new Error(job.error ?? 'Risk analysis failed');
    return { status: 'ready', result: null };
  }
  return requestJson<RiskEnvelope>(`/v1/documents/${docId}/risk-analysis`, {
    auth: true,
    timeoutMs: 30_000,
    timeoutLabel: 'documents.risk.get',
  });
}

export async function startOcr(docId: string): Promise<OcrEnvelope> {
  if (shouldUseMock()) {
    mockOcrByDocId.set(docId, { status: 'processing', startedAt: Date.now() });
    return { status: 'processing', result: null };
  }
  return requestJson<OcrEnvelope>(`/v1/documents/${docId}/ocr`, {
    auth: true,
    method: 'POST',
    timeoutMs: 25_000,
    timeoutLabel: 'documents.ocr.post',
  });
}

export async function startRisk(docId: string, mode: 'quick' | 'thorough' = 'quick'): Promise<RiskEnvelope> {
  if (shouldUseMock()) {
    mockRiskByDocId.set(docId, { status: 'processing', startedAt: Date.now() });
    return { status: 'processing', result: null };
  }
  return requestJson<RiskEnvelope>(`/v1/documents/${docId}/risk-analysis`, {
    auth: true,
    method: 'POST',
    body: { mode },
    timeoutMs: 30_000,
    timeoutLabel: 'documents.risk.post',
  });
}
