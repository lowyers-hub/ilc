import { chatAI, classifyMessage } from '@/src/features/ai/aiApi';
import { sanitizeAiResponse } from '@/src/features/ai/safety';

import { chatCases } from './fixtures/aiEvaluationCases';

function hasAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

describe('aiEvaluation (mock-mode automated checks)', () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
    process.env.EXPO_PUBLIC_USE_REAL_AI_CHAT = 'true';
  });

  it('chat cases: structured JSON + safety + escalation rules', async () => {
    for (const c of chatCases) {
      const cls = await classifyMessage({ message: c.userQuestion });
      // minimal expectation: high-risk questions should map to high risk
      if (c.riskLevel === 'high') expect(cls.riskLevel).toBe('high');

      const ai = sanitizeAiResponse(
        await chatAI({
          message: c.userQuestion,
          sessionId: 'sess_eval',
          classification: cls,
        } as any)
      );

      // Structured validity
      expect(typeof ai.summary).toBe('string');
      expect(typeof ai.legalExplanation).toBe('string');
      expect(Array.isArray(ai.suggestedSteps)).toBe(true);
      expect(Array.isArray(ai.requiredDocuments)).toBe(true);
      expect(Array.isArray(ai.risks)).toBe(true);
      expect(Array.isArray(ai.whenNeedLawyer ?? [])).toBe(true);

      // Disclaimer exists
      expect(ai.disclaimer).toContain('Ini adalah informasi umum, bukan nasihat hukum final.');

      // No guarantees
      expect(hasAny(ai.summary, c.forbidden)).toBe(false);
      expect(hasAny(ai.legalExplanation, c.forbidden)).toBe(false);

      // No fabricated law when no citations (mock mode returns citations empty)
      if (!ai.citations?.length) {
        expect(ai.summary.toLowerCase()).not.toContain('pasal');
        expect(ai.legalExplanation.toLowerCase()).not.toContain('uu ');
      }

      // Escalation
      if (c.riskLevel === 'high') expect(ai.escalation).toBe(true);

      // Required documents should be present
      expect(ai.requiredDocuments.length).toBeGreaterThan(0);
    }
  });
});

