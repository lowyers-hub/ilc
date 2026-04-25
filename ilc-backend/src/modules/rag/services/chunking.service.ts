import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  chunk(text: string, opts: { maxChars?: number; overlapChars?: number } = {}) {
    const maxChars = opts.maxChars ?? 2000;
    const overlap = opts.overlapChars ?? 200;
    const chunks: string[] = [];

    let i = 0;
    while (i < text.length) {
      const end = Math.min(text.length, i + maxChars);
      const slice = text.slice(i, end);
      chunks.push(slice);
      if (end === text.length) break;
      i = Math.max(0, end - overlap);
    }
    return chunks;
  }
}

