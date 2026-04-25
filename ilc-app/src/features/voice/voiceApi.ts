import { requestMultipart } from '@/src/lib/api/client';
import { env } from '@/src/lib/env';

export type TranscriptionResponse = { text: string; confidence?: number };

export async function transcribeAudio(args: { uri: string; name: string; mimeType: string }): Promise<TranscriptionResponse> {
  // Keep mock fallback unless explicitly enabled.
  if (!env.useRealTranscription || env.useMockData) {
    return { text: 'Transkripsi demo: jelaskan masalah hukum saya…', confidence: 0.9 };
  }

  const form = new FormData();
  form.append('file', { uri: args.uri, name: args.name, type: args.mimeType } as any);

  return requestMultipart<TranscriptionResponse>('/v1/speech/transcribe', form, {
    method: 'POST',
    auth: true,
  });
}

