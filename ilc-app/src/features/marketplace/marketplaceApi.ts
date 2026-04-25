import { env } from '@/src/lib/env';
import { requestJson } from '@/src/lib/api/client';
import type { Consultation, Lawyer } from '@/src/types/models';

type Paginated<T> = { items: T[]; nextCursor: string | null };

const mockLawyers: Lawyer[] = [
  {
    id: 'law_1',
    name: 'Ayu Prameswari, S.H.',
    specialization: ['Ketenagakerjaan', 'Perdata'],
    experienceYears: 6,
    rating: 4.8,
    verified: true,
    pricePerSession: 250000,
    available: true,
  },
  {
    id: 'law_2',
    name: 'Bima Santoso, S.H., M.H.',
    specialization: ['Pidana', 'Kepailitan'],
    experienceYears: 10,
    rating: 4.6,
    verified: true,
    pricePerSession: 350000,
    available: false,
  },
];

let mockConsultations: Consultation[] = [];

function shouldUseMock() {
  return env.useMockData || !env.useRealMarketplace;
}

export async function listLawyers(): Promise<Paginated<Lawyer>> {
  if (shouldUseMock()) return { items: mockLawyers, nextCursor: null };
  const res = await requestJson<Paginated<any>>('/v1/lawyers', { auth: true, timeoutMs: 15_000, timeoutLabel: 'lawyers.list' });
  return {
    ...res,
    items: (res.items ?? []).map((l: any) => ({
      ...l,
      rating: typeof l.rating === 'string' ? Number(l.rating) : l.rating,
    })) as Lawyer[],
  };
}

export async function getLawyer(lawyerId: string): Promise<Lawyer> {
  if (shouldUseMock()) {
    const l = mockLawyers.find((x) => x.id === lawyerId);
    if (!l) throw new Error('Not found');
    return l;
  }
  const l = await requestJson<any>(`/v1/lawyers/${lawyerId}`, { auth: true, timeoutMs: 15_000, timeoutLabel: 'lawyers.get' });
  return {
    ...l,
    rating: typeof l.rating === 'string' ? Number(l.rating) : l.rating,
  } as Lawyer;
}

export async function createConsultation(args: {
  lawyerId: string;
  scheduledAt: string;
  topic: string;
}): Promise<Consultation> {
  if (shouldUseMock()) {
    const l = mockLawyers.find((x) => x.id === args.lawyerId);
    if (!l) throw new Error('Not found');

    const scheduledMs = new Date(args.scheduledAt).getTime();
    if (Number.isNaN(scheduledMs) || scheduledMs < Date.now() + 5 * 60 * 1000) {
      throw new Error('Jadwal tidak valid.');
    }

    const duplicate = mockConsultations.find(
      (c) =>
        c.lawyerId === args.lawyerId &&
        c.scheduledAt === args.scheduledAt &&
        c.status !== 'cancelled'
    );
    if (duplicate) {
      throw new Error('Slot sudah dibooking.');
    }

    const c: Consultation = {
      id: `cons_${Date.now()}`,
      lawyerId: l.id,
      userId: 'me',
      scheduledAt: args.scheduledAt,
      price: l.pricePerSession,
      status: 'pending_payment',
      lawyerName: l.name,
      topic: args.topic,
      createdAt: new Date().toISOString(),
    };
    mockConsultations = [c, ...mockConsultations];
    return c;
  }

  return requestJson<Consultation>('/v1/consultations', {
    method: 'POST',
    auth: true,
    body: { lawyerId: args.lawyerId, scheduledAt: args.scheduledAt, topic: args.topic },
    timeoutMs: 20_000,
    timeoutLabel: 'consultations.create',
  });
}

export async function listConsultations(): Promise<Paginated<Consultation>> {
  if (shouldUseMock()) return { items: mockConsultations, nextCursor: null };
  return requestJson<Paginated<Consultation>>('/v1/consultations', { auth: true, timeoutMs: 15_000, timeoutLabel: 'consultations.list' });
}

export async function getConsultation(consultationId: string): Promise<Consultation> {
  if (shouldUseMock()) {
    const c = mockConsultations.find((x) => x.id === consultationId);
    if (!c) throw new Error('Not found');
    return c;
  }
  return requestJson<Consultation>(`/v1/consultations/${consultationId}`, { auth: true, timeoutMs: 15_000, timeoutLabel: 'consultations.get' });
}

export async function confirmConsultation(consultationId: string): Promise<Consultation> {
  if (shouldUseMock()) {
    const c = mockConsultations.find((x) => x.id === consultationId);
    if (!c) throw new Error('Not found');
    if (c.status !== 'paid' && c.status !== 'pending_payment') return c;
    __mockUpdateConsultation(consultationId, { status: 'confirmed' });
    return __mockGetConsultation(consultationId)!;
  }
  return requestJson<Consultation>(`/v1/consultations/${consultationId}/confirm`, { auth: true, method: 'POST', timeoutMs: 15_000, timeoutLabel: 'consultations.confirm' });
}

export async function completeConsultation(consultationId: string): Promise<Consultation> {
  if (shouldUseMock()) {
    const c = mockConsultations.find((x) => x.id === consultationId);
    if (!c) throw new Error('Not found');
    __mockUpdateConsultation(consultationId, { status: 'completed' });
    return __mockGetConsultation(consultationId)!;
  }
  return requestJson<Consultation>(`/v1/consultations/${consultationId}/complete`, { auth: true, method: 'POST', timeoutMs: 15_000, timeoutLabel: 'consultations.complete' });
}

export async function cancelConsultation(consultationId: string): Promise<Consultation> {
  if (shouldUseMock()) {
    const c = mockConsultations.find((x) => x.id === consultationId);
    if (!c) throw new Error('Not found');
    __mockUpdateConsultation(consultationId, { status: 'cancelled' });
    return __mockGetConsultation(consultationId)!;
  }
  return requestJson<Consultation>(`/v1/consultations/${consultationId}/cancel`, { auth: true, method: 'POST', timeoutMs: 15_000, timeoutLabel: 'consultations.cancel' });
}

// Internal helper for mock payment simulation.
export function __mockUpdateConsultation(id: string, patch: Partial<Consultation>) {
  mockConsultations = mockConsultations.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function __mockGetConsultation(id: string) {
  return mockConsultations.find((c) => c.id === id) ?? null;
}
