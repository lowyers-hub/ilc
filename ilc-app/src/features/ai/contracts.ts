export type AIRequest = {
  message: string;
  sessionId?: string;
  attachments?: string[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type AIResponse = {
  summary: string;
  legalExplanation: string;
  suggestedSteps: string[];
  requiredDocuments: string[];
  risks: string[];
  escalation: boolean;
  escalationMeta?: { escalation: boolean; reason: string; recommendedSpecialization: string };
  disclaimer: string;
  whenNeedLawyer?: string[];
  confidence?: 'low' | 'medium' | 'high';
  citations?: Array<{ chunkId: string; source: string; score: number; snippet: string }>;
  promptVersion?: string;
  requestId?: string;
};

export type ClassificationResponse = {
  category: string;
  intent: string;
  riskLevel: 'low' | 'medium' | 'high';
};
