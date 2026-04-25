import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/src/lib/query/keys';

import { createChatSession, listChatMessages, listChatSessions, sendChatMessage } from './chatApi';

export function useChatSessions() {
  return useQuery({
    queryKey: qk.chatSessions(),
    queryFn: async () => (await listChatSessions()).items,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createChatSession,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.chatSessions() });
    },
  });
}

export function useChatMessages(sessionId: string) {
  return useQuery({
    queryKey: qk.chatMessages(sessionId),
    queryFn: async () => (await listChatMessages(sessionId)).items,
    enabled: Boolean(sessionId),
  });
}

export function useSendChatMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => sendChatMessage(sessionId, content),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.chatMessages(sessionId) });
    },
  });
}

