import type { AIResponse } from '@/src/features/ai/contracts';
import type { ChatMessage } from '@/src/types/models';

export function aiResponseToAssistantMessage(args: {
  sessionId: string;
  contentFallback: string;
  ai: AIResponse;
}): ChatMessage {
  return {
    id: `msg_${Date.now()}_ai`,
    sessionId: args.sessionId,
    role: 'assistant',
    content: args.contentFallback,
    createdAt: new Date().toISOString(),
    structured: args.ai,
  };
}

