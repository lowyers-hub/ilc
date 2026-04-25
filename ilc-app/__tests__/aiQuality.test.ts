import { sanitizeAiResponse } from '@/src/features/ai/safety';

describe('AI quality safety', () => {
  it('removes guarantee language and keeps standard disclaimer', () => {
    const out = sanitizeAiResponse({
      summary: 'Anda pasti menang 100%',
      legalExplanation: 'Kami menjamin Anda menang.',
      suggestedSteps: ['Jaminan menang 100%'],
      requiredDocuments: [],
      risks: ['Tidak ada'],
      escalation: false,
      disclaimer: 'Menjamin hasil.',
      whenNeedLawyer: ['Jika pasti menang di pengadilan'],
    });

    expect(out.summary.toLowerCase()).not.toContain('pasti menang');
    expect(out.summary.toLowerCase()).toContain('tidak ada kepastian');
    expect(out.disclaimer).toContain('Ini adalah informasi umum, bukan nasihat hukum final.');
  });
});
