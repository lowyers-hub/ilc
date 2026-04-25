import { Injectable } from '@nestjs/common';

@Injectable()
export class SafetySanitizerService {
  sanitize(text: string) {
    return this.stripGuarantees(text).trim();
  }

  stripGuarantees(text: string) {
    return text
      .replace(/\b(pasti menang|pasti menang di pengadilan)\b/gi, 'memiliki peluang, namun tidak ada kepastian hasil')
      .replace(/\b(jamin|menjamin|jaminan)\b/gi, 'tidak dapat menjamin')
      .replace(/\b100%\b/g, 'tanpa kepastian 100%');
  }

  /**
   * Jika tidak ada konteks dokumen/rujukan, hindari "mengarang pasal/UU".
   * Ini bukan perfect, tapi jadi pagar minimal untuk produksi.
   */
  stripLawCitationsIfNoContext(text: string, hasContext: boolean) {
    if (hasContext) return text;
    return text
      .replace(/\bUU\s*\d+\s*\/\s*\d+\b/gi, 'ketentuan peraturan yang relevan')
      .replace(/\bUndang-Undang\s+No\.?\s*\d+\s*\/\s*\d+\b/gi, 'ketentuan peraturan yang relevan')
      .replace(/\bPasal\s+\d+[A-Za-z]?\b/gi, 'ketentuan pasal yang relevan');
  }

  appendDisclaimer(text: string) {
    const disclaimer = 'Ini adalah informasi umum, bukan nasihat hukum final.';
    if (text.includes(disclaimer)) return text;
    return `${text}\n\n${disclaimer}`;
  }
}
