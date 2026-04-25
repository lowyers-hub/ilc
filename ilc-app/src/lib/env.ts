export const env = {
  // Allow configuring either:
  // - http://localhost:3000
  // - http://localhost:3000/v1
  // Normalize to origin/base without trailing /v1 to avoid double "/v1/v1" in requests.
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/v1\/?$/, ''),
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? '',
  useMockData: (process.env.EXPO_PUBLIC_USE_MOCK_DATA ?? 'false') === 'true',
  enableStreamingChat: (process.env.EXPO_PUBLIC_ENABLE_STREAMING_CHAT ?? 'false') === 'true',
  useRealTranscription: (process.env.EXPO_PUBLIC_USE_REAL_TRANSCRIPTION ?? 'false') === 'true',
  useRealAIChat: (process.env.EXPO_PUBLIC_USE_REAL_AI_CHAT ?? 'false') === 'true',
  useRealDocumentAnalysis: (process.env.EXPO_PUBLIC_USE_REAL_DOCUMENT_ANALYSIS ?? 'false') === 'true',
  useRealMarketplace: (process.env.EXPO_PUBLIC_USE_REAL_MARKETPLACE ?? 'false') === 'true',
  autoConfirmConsultation: (process.env.EXPO_PUBLIC_AUTO_CONFIRM_CONSULTATION ?? 'false') === 'true',
};
