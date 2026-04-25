import { requestJson } from '@/src/lib/api/client';
import { env } from '@/src/lib/env';
import { handleApiError } from '@/src/lib/errors/handleApiError';
import { logEvent } from '@/src/lib/telemetry/analytics';

import type { AIRequest, AIResponse, ClassificationResponse } from './contracts';
import { sanitizeAiResponse } from './safety';

export async function classifyMessage(args: { message: string; sessionId?: string }): Promise<ClassificationResponse> {
  // Even in mock mode, return a useful heuristic classification so
  // UX (escalation/paywall) and evaluation tests can run deterministically.
  if (!env.useRealAIChat || env.useMockData) {
    const m = args.message.toLowerCase();
    const hasDeadline = m.includes('deadline') || m.includes('besok') || m.includes('jatuh tempo') || m.includes('hari ini');
    const hasBigMoney = /\b(\d+)\s*(juta|miliar)\b/.test(m) || /\brp\s*\d{8,}\b/.test(m);
    const riskLevel =
      m.includes('pidana') ||
      m.includes('polisi') ||
      m.includes('pengadilan') ||
      m.includes('lapor polisi') ||
      m.includes('penipuan') ||
      m.includes('penggelapan') ||
      (hasDeadline && hasBigMoney)
        ? 'high'
        : hasDeadline || hasBigMoney || m.includes('kontrak') || m.includes('utang') || m.includes('invoice') || m.includes('refund')
          ? 'medium'
          : 'low';
    const category = m.includes('phk') || m.includes('upah') ? 'Employment/PHK' : m.includes('kontrak') ? 'Contracts' : 'Umum';
    return { category, intent: 'triage', riskLevel };
  }
  try {
    return await requestJson<ClassificationResponse>('/v1/ai/classify', {
      method: 'POST',
      auth: true,
      body: args,
      timeoutMs: 15_000,
      timeoutLabel: 'ai.classify',
    });
  } catch (e: any) {
    const handled = handleApiError(e, { feature: 'ai', action: 'classify' });
    logEvent('ai_error', { stage: 'classify', reason: handled.kind });
    throw e;
  }
}

export async function chatAI(req: AIRequest & { classification?: ClassificationResponse }): Promise<AIResponse> {
  if (!env.useRealAIChat || env.useMockData) {
    return sanitizeAiResponse({
      summary: `Ringkasan: ${req.message}`,
      legalExplanation:
        'Penjelasan hukum (demo). Untuk kepastian, konsultasikan dengan advokat dan tinjau dokumen terkait.',
      suggestedSteps: ['Kumpulkan kronologi', 'Siapkan dokumen pendukung', 'Pertimbangkan konsultasi lawyer jika berisiko tinggi'],
      requiredDocuments: ['Perjanjian/kontrak', 'Bukti komunikasi', 'Identitas pihak terkait'],
      risks: ['Informasi tidak lengkap dapat menyebabkan analisis tidak akurat'],
      escalation: (req.classification?.riskLevel ?? 'low') === 'high',
      disclaimer: 'Konten ini bersifat informatif dan bukan nasihat hukum final.',
      whenNeedLawyer: [
        'Jika ada ancaman/somasi/panggilan resmi',
        'Jika nilai kerugian besar atau bukti kompleks',
        'Jika Anda memerlukan strategi negosiasi/tindakan hukum formal',
      ],
      confidence: 'low',
      citations: [],
    });
  }

  try {
    const ai = await requestJson<AIResponse>('/v1/ai/chat', {
      method: 'POST',
      auth: true,
      body: req,
      timeoutMs: 15_000,
      timeoutLabel: 'ai.chat',
    });
    return sanitizeAiResponse(ai);
  } catch (e: any) {
    const handled = handleApiError(e, { feature: 'ai', action: 'chat' });
    logEvent('ai_error', { stage: 'chat', reason: handled.kind });
    throw e;
  }
}
