describe('Skenario real (format AI)', () => {
  const scenarios = [
    { name: 'PHK', text: 'Saya di-PHK mendadak tanpa surat, apa yang harus saya lakukan?' },
    { name: 'Kontrak', text: 'Kontrak saya ada penalti besar jika terlambat, apakah wajar?' },
    { name: 'Utang', text: 'Teman saya utang tapi tidak mau bayar, langkah apa yang aman?' },
    { name: 'Konsumen', text: 'Barang online tidak sesuai deskripsi dan penjual menolak refund.' },
  ];

  for (const s of scenarios) {
    it(`menghasilkan respons terstruktur untuk ${s.name}`, async () => {
      jest.resetModules();
      process.env.EXPO_PUBLIC_USE_MOCK_DATA = 'true';
      process.env.EXPO_PUBLIC_USE_REAL_AI_CHAT = 'true';

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createChatSession, sendChatMessage } = require('@/src/features/chat/chatApi');

      const session = await createChatSession({ title: `Test ${s.name}` });
      const { assistantMessage } = await sendChatMessage(session.id, s.text);

      expect(assistantMessage.structured).toBeTruthy();
      expect(assistantMessage.structured.summary).toBeTruthy();
      expect(assistantMessage.structured.legalExplanation).toBeTruthy();
      expect(Array.isArray(assistantMessage.structured.suggestedSteps)).toBe(true);
      expect(Array.isArray(assistantMessage.structured.risks)).toBe(true);
      expect(String(assistantMessage.structured.disclaimer)).toContain('Ini adalah informasi umum');
    });
  }
});

