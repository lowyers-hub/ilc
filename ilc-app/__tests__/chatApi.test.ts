import { createChatSession, listChatSessions, sendChatMessage } from '@/src/features/chat/chatApi';

describe('chatApi (mock mode)', () => {
  it('creates session and sends message', async () => {
    const before = await listChatSessions();
    const created = await createChatSession({ title: 'Test' });
    const after = await listChatSessions();

    expect(after.items.length).toBe(before.items.length + 1);

    const res = await sendChatMessage(created.id, 'Halo');
    expect(res.assistantMessage.role).toBe('assistant');
    expect(res.assistantMessage.content).toContain('Halo');
  });
});

