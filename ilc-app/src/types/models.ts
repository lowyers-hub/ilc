export type User = {
  id: string;
  phoneE164: string;
  displayName?: string;
  createdAt: string;
  entitlements: {
    isPremium: boolean;
    features: Record<string, boolean>;
  };
};

export type ChatSession = {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  classification?: { category: string; intent: string; riskLevel: 'low' | 'medium' | 'high' };
};

export type Lawyer = {
  id: string;
  name: string;
  specialization: string[];
  experienceYears: number;
  rating: number;
  verified: boolean;
  pricePerSession: number;
  available: boolean;
};

export type Consultation = {
  id: string;
  lawyerId: string;
  userId: string;
  status: 'pending_payment' | 'paid' | 'confirmed' | 'completed' | 'cancelled';
  scheduledAt: string; // ISO
  price: number;

  // Extra fields for UI convenience (backend can include via joins)
  lawyerName?: string;
  topic?: string;
  paymentId?: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  consultationId: string;
  amount: number;
  currency: 'IDR';
  status: 'requires_action' | 'paid' | 'failed';
  checkoutUrl?: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  structured?: {
    summary: string;
    legalExplanation: string;
    suggestedSteps: string[];
    requiredDocuments: string[];
    risks: string[];
    escalation: boolean;
    disclaimer: string;
    whenNeedLawyer?: string[];
    confidence?: 'low' | 'medium' | 'high';
  fallbackUsed?: boolean;
  promptVersion?: string;
    requestId?: string;
  };
  citations?: Array<{
    docId: string;
    title?: string;
    snippet: string;
    url?: string;
    page?: number;
    score?: number;
  }>;
};

export type Document = {
  id: string;
  title: string;
  source: 'camera' | 'file';
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
};

export type OcrResult = {
  docId: string;
  text: string;
  pages?: Array<{ page: number; text: string }>;
  language?: string;
};

export type RiskAnalysis = {
  docId: string;
  overallRisk: 'low' | 'medium' | 'high';
  riskScore?: number; // 0-100
  findings: Array<{
    severity: 'low' | 'medium' | 'high';
    // New schema
    clause?: string;
    issue?: string;
    whyItMatters?: string;
    // Backward compatible fields (older schema)
    title?: string;
    description?: string;
    recommendation: string;
  }>;
  missingClauses?: string[];
  questionsForLawyer?: string[];
  promptVersion?: string;
  requestId?: string;
};

export type ContractTemplate = { id: string; name: string; description?: string };

export type ContractDraft = {
  id: string;
  title: string;
  status: 'draft' | 'final';
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type ForumCategory = { id: string; name: string; description?: string };
export type Topic = { id: string; categoryId: string; title: string; authorId: string; createdAt: string };
export type Post = { id: string; topicId: string; authorId: string; body: string; createdAt: string };
