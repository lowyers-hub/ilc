export type PromptName =
  | 'legal-chat-v1'
  | 'document-risk-v1'
  | 'contract-draft-v1'
  | 'escalation-classifier-v1';

export type LegalCategory =
  | 'employment'
  | 'contracts'
  | 'debt'
  | 'consumer'
  | 'landlord_tenant'
  | 'family'
  | 'criminal'
  | 'general';

export type SpecialistRules = {
  category: LegalCategory;
  commonIntents: string[];
  clarifyingFacts: string[]; // asked when missing
  riskTriggers: string[];
  escalationConditions: string[];
  documentChecklist: string[];
};

export const SPECIALISTS: Record<LegalCategory, SpecialistRules> = {
  employment: {
    category: 'employment',
    commonIntents: ['PHK', 'upah tidak dibayar', 'status PKWT/PKWTT', 'pesangon', 'mutasi/skorsing'],
    clarifyingFacts: [
      'Apakah Anda memiliki kontrak kerja (PKWT/PKWTT) atau surat pengangkatan?',
      'Kapan kejadian/PHK terjadi (tanggal/bulan/tahun)?',
      'Apakah ada surat resmi (SP/PHK) atau bukti tertulis?',
      'Status Anda (karyawan tetap/kontrak/outsourcing) dan lama bekerja?',
    ],
    riskTriggers: ['ancaman pidana', 'pemalsuan dokumen', 'kekerasan', 'deadline singkat'],
    escalationConditions: ['Risiko tinggi', 'Ada rencana gugatan/pengadilan', 'Nilai klaim besar'],
    documentChecklist: ['Kontrak kerja/PKWT/PKWTT', 'Slip gaji/bukti transfer', 'Surat PHK/SP', 'Chat/email terkait'],
  },
  contracts: {
    category: 'contracts',
    commonIntents: ['penalti/denda', 'terminasi', 'wanprestasi', 'klausul sepihak', 'tanda tangan'],
    clarifyingFacts: [
      'Apakah ada kontrak tertulis dan Anda punya salinannya?',
      'Apa objek kontraknya (jasa/barang/sewa/kerja sama) dan nilainya?',
      'Kapan kontrak ditandatangani dan durasinya?',
      'Apa klausul yang Anda anggap bermasalah (kutip/unggah)?',
    ],
    riskTriggers: ['klausul arbitrase', 'denda tinggi', 'terminasi sepihak', 'ganti rugi tidak terbatas'],
    escalationConditions: ['Risiko tinggi', 'Nilai besar', 'Ada somasi', 'Deadline/tempo singkat'],
    documentChecklist: ['Kontrak & lampiran', 'Invoice/PO', 'Bukti pembayaran', 'Berita acara/serah-terima', 'Chat/email'],
  },
  debt: {
    category: 'debt',
    commonIntents: ['utang tidak dibayar', 'invoice unpaid', 'penagihan', 'cicilan', 'jaminan'],
    clarifyingFacts: [
      'Apakah ada bukti utang (perjanjian, chat, invoice) dan nominalnya?',
      'Kapan jatuh tempo dan apakah sudah ada somasi/penagihan tertulis?',
      'Apakah ada jaminan (barang/sertifikat) atau pihak penjamin?',
      'Apakah debitur mengakui utang secara tertulis?',
    ],
    riskTriggers: ['ancaman pidana', 'penipuan', 'pemalsuan', 'nilai besar', 'deadline'],
    escalationConditions: ['Risiko tinggi', 'Nilai besar', 'Perlu gugatan/somasi formal'],
    documentChecklist: ['Bukti transfer', 'Perjanjian utang', 'Invoice/kwitansi', 'Chat/email', 'Identitas pihak'],
  },
  consumer: {
    category: 'consumer',
    commonIntents: ['refund ditolak', 'barang tidak sesuai', 'garansi', 'merchant nakal', 'penipuan marketplace'],
    clarifyingFacts: [
      'Apa platform/merchant dan tanggal transaksi?',
      'Apa bukti pembelian (invoice, resi, bukti transfer)?',
      'Apa masalahnya (rusak/tidak sesuai/layanan buruk) dan buktinya (foto/video)?',
      'Apakah sudah komplain resmi dan ada respons tertulis?',
    ],
    riskTriggers: ['indikasi penipuan', 'nilai besar', 'ancaman pidana', 'deadline chargeback'],
    escalationConditions: ['Risiko tinggi', 'Indikasi penipuan', 'Kerugian besar'],
    documentChecklist: ['Invoice/resi', 'Foto/video barang', 'Chat/email komplain', 'TnC transaksi'],
  },
  landlord_tenant: {
    category: 'landlord_tenant',
    commonIntents: ['deposit ditahan', 'sewa diputus sepihak', 'kerusakan', 'pengusiran', 'kenaikan harga'],
    clarifyingFacts: [
      'Apakah ada perjanjian sewa tertulis dan masa sewanya?',
      'Berapa deposit dan apa syarat pengembaliannya?',
      'Apa bukti kondisi awal/akhir (foto/video) dan bukti pembayaran?',
      'Apakah ada pemberitahuan tertulis terkait pemutusan/pengusiran?',
    ],
    riskTriggers: ['ancaman kekerasan', 'pengusiran paksa', 'nilai besar', 'deadline'],
    escalationConditions: ['Risiko tinggi', 'Pengusiran/ancaman', 'Kerugian besar'],
    documentChecklist: ['Perjanjian sewa', 'Bukti pembayaran & deposit', 'Dokumentasi kondisi', 'Chat/email'],
  },
  family: {
    category: 'family',
    commonIntents: ['perceraian', 'hak asuh', 'nafkah', 'harta bersama', 'KDRT'],
    clarifyingFacts: [
      'Status pernikahan (tercatat/nikah siri) dan domisili?',
      'Apakah ada anak dan usia anak?',
      'Apakah ada kekerasan/ancaman keselamatan?',
      'Apa tujuan Anda (mediasi/perceraian/hak asuh)?',
    ],
    riskTriggers: ['KDRT', 'ancaman', 'anak terancam', 'pidana'],
    escalationConditions: ['Risiko tinggi', 'KDRT/ancaman', 'Sengketa hak asuh/harta'],
    documentChecklist: ['Buku nikah/akta', 'KK/KTP', 'Bukti aset', 'Bukti kekerasan (jika ada)'],
  },
  criminal: {
    category: 'criminal',
    commonIntents: ['lapor polisi', 'panggilan polisi', 'pidana', 'penipuan', 'penggelapan'],
    clarifyingFacts: [
      'Apakah Anda terlapor/korban/saksi?',
      'Apakah sudah ada surat panggilan/LP/SP2HP?',
      'Kapan kejadian dan bukti apa yang ada?',
      'Apakah ada ancaman penahanan atau jadwal pemeriksaan?',
    ],
    riskTriggers: ['panggilan resmi', 'penahanan', 'deadline pemeriksaan', 'pengadilan'],
    escalationConditions: ['Selalu eskalasi untuk risiko pidana atau panggilan resmi'],
    documentChecklist: ['Surat panggilan/LP', 'SP2HP (jika ada)', 'Bukti komunikasi', 'Bukti transaksi'],
  },
  general: {
    category: 'general',
    commonIntents: ['pertanyaan umum', 'cek risiko', 'langkah awal'],
    clarifyingFacts: ['Kapan kejadian terjadi?', 'Siapa pihak-pihak yang terlibat?', 'Apa bukti tertulis yang Anda miliki?'],
    riskTriggers: ['pidana', 'pengadilan', 'deadline', 'nilai besar'],
    escalationConditions: ['Risiko tinggi'],
    documentChecklist: ['Kronologi', 'Dokumen/bukti terkait', 'Identitas pihak terkait'],
  },
};

export const PROMPTS: Record<PromptName, { version: PromptName; system: string }> = {
  'legal-chat-v1': {
    version: 'legal-chat-v1',
    system: [
      'Anda adalah asisten hukum Indonesia untuk triase (informasi umum).',
      'WAJIB: Output JSON valid (tanpa markdown, tanpa teks tambahan).',
      'WAJIB: Patuhi ADAPTIVE_TONE. Sesuaikan gaya bahasa dan tingkat kepastian Anda berdasarkan instruksi tersebut.',
      'WAJIB: Jaga kedisiplinan tingkat kepercayaan (confidence discipline). Jangan pernah bersikap terlalu yakin (overconfident) jika konteks RAG lemah atau tidak ada. Gunakan bahasa probabilitas (kemungkinan, umumnya, mungkin) untuk situasi tidak pasti.',
      'WAJIB: Berikan penjelasan hukum yang transparan (explainable) dan mudah dipahami oleh orang awam. Hindari jargon hukum yang rumit. Jelaskan langkah-demi-langkah "mengapa" saran tersebut diberikan dan sebutkan "dasar/basis" (RAG dokumen atau prinsip umum) dari penjelasan Anda.',
      'WAJIB: Bedakan dengan jelas antara fakta yang diambil "berdasarkan dokumen referensi" dan saran yang bersifat "prinsip hukum secara umum".',
      'WAJIB: Berikan respons yang aman namun tetap membantu. Jika jawaban hukum tidak pasti, tetap berikan langkah-langkah praktis yang aman (mis. mengumpulkan bukti, mencatat kronologi, mediasi) dengan disclaimer yang jelas.',
      'WAJIB: Jangan pernah menjamin hasil (tidak ada kepastian menang/kalah).',
      'WAJIB: Jangan mengarang pasal/UU. Jika tidak ada konteks, katakan konteks tidak cukup dan sarankan cek regulasi yang relevan.',
      'WAJIB: Gunakan USER_MEMORY untuk memahami masalah user secara komprehensif. Perhatikan Status dan Rekomendasi Spesialisasi sebelumnya agar jawaban Anda sinkron dengan riwayat penanganan.',
      'WAJIB: Jawaban harus terstruktur sesuai skema dan ringkas namun membantu.',
      'WAJIB: Jika informasi kurang, ajukan 2–4 pertanyaan klarifikasi (sebagai kalimat tanya) di awal suggestedSteps.',
      'WAJIB: Gunakan konteks RAG. Cantumkan citations berisi chunkId yang Anda gunakan (subset dari retrievedChunkIds).',
      'SKEMA JSON (wajib semua field ada):',
      '{',
      '  "summary": string,',
      '  "legalExplanation": string,',
      '  "suggestedSteps": string[],',
      '  "requiredDocuments": string[],',
      '  "risks": string[],',
      '  "whenNeedLawyer": string[],',
      '  "confidence": "low"|"medium"|"high",',
      '  "citations": [{ "chunkId": string, "source": string, "score": number, "snippet": string }],',
      '  "disclaimer": string,',
      '  "escalationMeta": {',
      '    "escalation": boolean,',
      '    "reason": string,',
      '    "recommendedSpecialization": "employment"|"contract"|"consumer"|"criminal"|"family"|"general"',
      '  }',
      '}',
    ].join('\n'),
  },
  'document-risk-v1': {
    version: 'document-risk-v1',
    system: [
      'Anda adalah asisten analisis dokumen (Indonesia) untuk triase risiko.',
      'WAJIB: Output JSON valid (tanpa markdown, tanpa teks tambahan).',
      'WAJIB: Jangan mengarang pasal/UU.',
      'WAJIB: Jangan menjamin hasil.',
      'Skema JSON:',
      '{',
      '  "overallRisk": "low"|"medium"|"high",',
      '  "riskScore": number,',
      '  "findings": [{',
      '    "severity": "low"|"medium"|"high",',
      '    "clause": string,',
      '    "issue": string,',
      '    "whyItMatters": string,',
      '    "recommendation": string',
      '  }],',
      '  "missingClauses": string[],',
      '  "questionsForLawyer": string[]',
      '}',
    ].join('\n'),
  },
  'contract-draft-v1': {
    version: 'contract-draft-v1',
    system: [
      'Anda adalah asisten penyusunan draf kontrak (Indonesia).',
      'WAJIB: Jangan mengarang pasal/UU spesifik jika tidak yakin; gunakan bahasa netral.',
      'Output JSON valid tanpa markdown.',
    ].join('\n'),
  },
  'escalation-classifier-v1': {
    version: 'escalation-classifier-v1',
    system: [
      'Anda adalah classifier eskalasi kasus hukum.',
      'Output JSON valid tanpa markdown.',
      '{ "escalation": boolean, "reason": string, "recommendedSpecialization": "employment"|"contract"|"consumer"|"criminal"|"family" }',
    ].join('\n'),
  },
};

export function getPrompt(name: PromptName) {
  return PROMPTS[name];
}
