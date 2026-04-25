import { ApiError } from '@/src/lib/api/errors';
import { handleApiError } from '@/src/lib/errors/handleApiError';

describe('handleApiError', () => {
  it('maps network error to user message', () => {
    const e = new ApiError({ status: 0, message: 'Network error' });
    expect(handleApiError(e).userMessage).toBe('Koneksi bermasalah');
  });

  it('maps timeout to user message', () => {
    const e = new ApiError({ status: 408, message: 'Timeout', code: 'TIMEOUT' });
    expect(handleApiError(e).userMessage).toBe('Server terlalu lama merespon');
  });

  it('maps 500 to system message', () => {
    const e = new ApiError({ status: 500, message: 'Internal' });
    expect(handleApiError(e).userMessage).toBe('Terjadi kesalahan sistem');
  });
});

describe('AI safe fallback', () => {
  it('returns non-empty safe message when AI fails', async () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'false';
    process.env.EXPO_PUBLIC_USE_REAL_AI_CHAT = 'true';
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost';

    jest.doMock('@/src/features/ai/aiApi', () => ({
      classifyMessage: jest.fn(async () => ({ category: 'X', intent: 'Y', riskLevel: 'low' })),
      chatAI: jest.fn(async () => {
        throw new Error('boom');
      }),
    }));

    // Use require() to avoid experimental ESM module mode in Jest.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendChatMessage } = require('@/src/features/chat/chatApi');
    const res = await sendChatMessage('sess_test', 'Halo');
    expect(res.assistantMessage.content).toContain('Maaf, sistem tidak dapat memberikan jawaban saat ini.');
    expect(res.assistantMessage.content.trim().length).toBeGreaterThan(10);
  });
});
