import AsyncStorage from '@react-native-async-storage/async-storage';

import { env } from '@/src/lib/env';
import { chatAI, classifyMessage } from '@/src/features/ai/aiApi';
import { SAFE_AI_FALLBACK } from '@/src/features/ai/safety';
import { handleApiError } from '@/src/lib/errors/handleApiError';
import { logEvent } from '@/src/lib/telemetry/analytics';
import type { ChatMessage, ChatSession } from '@/src/types/models';

type Paginated<T> = { items: T[]; nextCursor: string | null };

type Classification = { category: string; intent: string; riskLevel: 'low' | 'medium' | 'high' };
const classificationBySessionId = new Map<string, Classification>();

type PersistedChatStore = {
  sessions: ChatSession[];
  messagesBySessionId: Record<string, ChatMessage[]>;
};

const STORAGE_KEY = 'ilc.chat.store.v1';
let loaded = false;
let store: PersistedChatStore = {
  sessions: [
    {
      id: 'sess_1',
      title: 'Konsultasi PHK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'sess_2',
      title: 'Perjanjian sewa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  messagesBySessionId: {},
};

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      store = JSON.parse(raw) as PersistedChatStore;
    }
  } catch {
    // ignore storage errors; use defaults
  }

  // Ensure each session has an initial assistant message
  for (const s of store.sessions) ensureSessionMessages(s.id);
  await persist();
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function ensureSessionMessages(sessionId: string) {
  if (!store.messagesBySessionId[sessionId]) {
    store.messagesBySessionId[sessionId] = [
      {
        id: `msg_${sessionId}_1`,
        sessionId,
        role: 'assistant',
        content: 'Halo! Jelaskan kronologi singkat dan detail kasus Anda. Saya akan bantu triase isu hukumnya.',
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return store.messagesBySessionId[sessionId];
}

export async function listChatSessions(): Promise<Paginated<ChatSession>> {
  // Backend chat persistence isn't implemented yet → persist locally.
  await ensureLoaded();
  const items = store.sessions.map((s) => ({
    ...s,
    classification: classificationBySessionId.get(s.id),
  })) as any;
  return { items, nextCursor: null };
}

export async function createChatSession(args?: { title?: string }): Promise<ChatSession> {
  await ensureLoaded();
  const s: ChatSession = {
    id: `sess_${Date.now()}`,
    title: args?.title ?? 'Chat baru',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.sessions = [s, ...store.sessions];
  ensureSessionMessages(s.id);
  await persist();
  return s;
}

export async function listChatMessages(sessionId: string): Promise<Paginated<ChatMessage>> {
  await ensureLoaded();
  return { items: ensureSessionMessages(sessionId), nextCursor: null };
}

export async function sendChatMessage(sessionId: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  // Real AI pipeline (classification -> /v1/ai/chat), guarded by feature flag.
  if (env.useRealAIChat) {
    await ensureLoaded();
    const messagesBefore = ensureSessionMessages(sessionId);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    try {
      // Include last 3–5 messages as context for better continuity.
      const history = messagesBefore
        .slice(-5)
        .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const classification = await classifyMessage({ message: content, sessionId });
      classificationBySessionId.set(sessionId, classification);
      const ai: any = await chatAI({ message: content, sessionId, classification, history });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sessionId,
        role: 'assistant',
        content: ai.summary,
        structured: ai,
        citations: Array.isArray(ai.citations)
          ? ai.citations.slice(0, 5).map((c: any) => ({
              docId: String(c.source ?? c.chunkId ?? 'rag'),
              title: String(c.chunkId ?? ''),
              snippet: String(c.snippet ?? ''),
              score: typeof c.score === 'number' ? c.score : undefined,
            }))
          : undefined,
        createdAt: new Date().toISOString(),
      };

      // Persist locally for chat memory.
      store.messagesBySessionId[sessionId] = [...messagesBefore, userMessage, assistantMessage];
      store.sessions = store.sessions.map((s) =>
        s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s
      );
      await persist();

      return { userMessage, assistantMessage };
    } catch (e: any) {
      // Safety fallback: do not break the UX if AI fails.
      const handled = handleApiError(e, { feature: 'ai', action: 'chat' });
      logEvent('ai_error', { stage: 'chat', reason: handled.kind });
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_safe`,
        sessionId,
        role: 'assistant',
        content: SAFE_AI_FALLBACK,
        createdAt: new Date().toISOString(),
      };
      store.messagesBySessionId[sessionId] = [...messagesBefore, userMessage, assistantMessage];
      await persist();
      return { userMessage, assistantMessage };
    }
  }

  if (env.useMockData) {
    await ensureLoaded();
    const messages = ensureSessionMessages(sessionId);
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      sessionId,
      role: 'assistant',
      content: `Ringkasannya: "${content}". Ini bukan nasihat hukum final. Apakah ada dokumen pendukung (kontrak/PKWT/PKWTT/surat PHK)?`,
      createdAt: new Date().toISOString(),
      citations: [
        {
          docId: 'uu_mock_1',
          title: 'UU Ketenagakerjaan (contoh)',
          snippet: 'Cuplikan referensi (demo).',
          score: 0.78,
        },
      ],
    };
    store.messagesBySessionId[sessionId] = [...messages, userMessage, assistantMessage];
    await persist();
    return { userMessage, assistantMessage };
  }
  throw new Error('Chat backend belum tersedia.');
}
