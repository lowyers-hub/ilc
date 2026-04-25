import { env } from '@/src/lib/env';
import { requestJson } from '@/src/lib/api/client';
import type { ContractDraft, ContractTemplate } from '@/src/types/models';

type Paginated<T> = { items: T[]; nextCursor: string | null };

let mockTemplates: ContractTemplate[] = [
  { id: 'tpl_nda', name: 'NDA', description: 'Non-disclosure agreement' },
  { id: 'tpl_sewa', name: 'Perjanjian Sewa', description: 'Sewa menyewa sederhana' },
];

let mockDrafts: ContractDraft[] = [
  {
    id: 'draft_1',
    title: 'NDA (Demo)',
    status: 'draft',
    contentMarkdown: '# NDA (Demo)\n\nPihak A: ...\nPihak B: ...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function listTemplates(): Promise<ContractTemplate[]> {
  if (env.useMockData) return mockTemplates;
  return requestJson<ContractTemplate[]>('/v1/contracts/templates', { auth: true });
}

export async function listDrafts(): Promise<Paginated<ContractDraft>> {
  if (env.useMockData) return { items: mockDrafts, nextCursor: null };
  return requestJson<Paginated<ContractDraft>>('/v1/contracts/drafts', { auth: true });
}

export async function getDraft(draftId: string): Promise<ContractDraft> {
  if (env.useMockData) {
    const d = mockDrafts.find((x) => x.id === draftId);
    if (!d) throw new Error('Not found');
    return d;
  }
  return requestJson<ContractDraft>(`/v1/contracts/drafts/${draftId}`, { auth: true });
}

export async function createDraft(args: { templateId: string; title: string; inputs: Record<string, string> }): Promise<ContractDraft> {
  if (env.useMockData) {
    const d: ContractDraft = {
      id: `draft_${Date.now()}`,
      title: args.title,
      status: 'draft',
      contentMarkdown: `# ${args.title}\n\nTemplate: ${args.templateId}\n\n${Object.entries(args.inputs)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}\n`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDrafts = [d, ...mockDrafts];
    return d;
  }
  return requestJson<{ draft: ContractDraft }>('/v1/contracts/drafts', { method: 'POST', auth: true, body: args }).then((r) => r.draft);
}

export async function updateDraft(draftId: string, patch: Partial<Pick<ContractDraft, 'title' | 'contentMarkdown'>>): Promise<ContractDraft> {
  if (env.useMockData) {
    mockDrafts = mockDrafts.map((d) => (d.id === draftId ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
    return getDraft(draftId);
  }
  return requestJson<ContractDraft>(`/v1/contracts/drafts/${draftId}`, { method: 'PATCH', auth: true, body: patch });
}

export async function finalizeDraft(draftId: string): Promise<ContractDraft> {
  if (env.useMockData) {
    mockDrafts = mockDrafts.map((d) => (d.id === draftId ? { ...d, status: 'final', updatedAt: new Date().toISOString() } : d));
    return getDraft(draftId);
  }
  return requestJson<ContractDraft>(`/v1/contracts/drafts/${draftId}/finalize`, { method: 'POST', auth: true });
}

