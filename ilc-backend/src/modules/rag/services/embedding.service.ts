import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  // Replace with OpenAI/Vertex/local embedding model.
  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Deterministic fake embedding for local dev without OpenAI.
      return texts.map((t) => {
        const h = hash(t);
        return [h % 1, (h % 10) / 10, (h % 100) / 100];
      });
    }

    const client = new OpenAI({ apiKey });
    const res = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      input: texts,
    });
    return res.data.map((x) => x.embedding as number[]);
  }
}

function hash(s: string) {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return x;
}
