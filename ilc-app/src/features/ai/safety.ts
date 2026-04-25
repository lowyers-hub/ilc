import type { AIResponse } from './contracts';

const DISALLOWED_PATTERNS: Array<{ re: RegExp; replace: string }> = [
  { re: /\b(pasti menang|pasti menang di pengadilan)\b/gi, replace: 'memiliki peluang, namun tidak ada kepastian hasil' },
  { re: /\b(jamin|menjamin|jaminan)\b/gi, replace: 'tidak dapat menjamin' },
  { re: /\b100%\b/g, replace: 'tanpa kepastian 100%' },
];

function sanitizeText(text: string) {
  let out = text;
  for (const p of DISALLOWED_PATTERNS) out = out.replace(p.re, p.replace);
  return out;
}

export function sanitizeAiResponse(ai: AIResponse): AIResponse {
  const disclaimer = sanitizeText(ai.disclaimer || '');
  const standardDisclaimer = 'Ini adalah informasi umum, bukan nasihat hukum final.';

  return {
    ...ai,
    summary: sanitizeText(ai.summary),
    legalExplanation: sanitizeText(ai.legalExplanation),
    suggestedSteps: (ai.suggestedSteps ?? []).map(sanitizeText),
    requiredDocuments: (ai.requiredDocuments ?? []).map(sanitizeText),
    risks: (ai.risks ?? []).map(sanitizeText),
    whenNeedLawyer: (ai.whenNeedLawyer ?? []).map(sanitizeText),
    disclaimer: disclaimer.includes(standardDisclaimer) ? disclaimer : `${disclaimer}\n\n${standardDisclaimer}`.trim(),
  };
}

export const SAFE_AI_FALLBACK =
  'Maaf, sistem tidak dapat memberikan jawaban saat ini.\nSilakan coba lagi atau konsultasikan dengan lawyer.\n\nIni adalah informasi umum, bukan nasihat hukum final.';
