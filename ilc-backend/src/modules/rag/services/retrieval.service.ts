import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';

import { KB_USER_ID } from '@/common/constants';
import { DocumentEntity } from '@/modules/documents/entities/document.entity';

import { DocumentChunkEntity } from '../entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';

export type RetrievedChunk = {
  id: string;
  content: string;
  score: number;
  source: string;
  confidence: 'high' | 'medium' | 'low';
};

@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(DocumentChunkEntity) private chunks: Repository<DocumentChunkEntity>,
    private embeddings: EmbeddingService,
    @InjectRepository(DocumentEntity) private docs: Repository<DocumentEntity>,
    private cache: RedisCacheService
  ) {}

  // Replace with pgvector / Pinecone / Weaviate and enforce ACL via userId filters.
  async retrieve(args: { userId: string; query: string; topK?: number; riskLevel?: 'low' | 'medium' | 'high' }): Promise<RetrievedChunk[]> {
    const t0 = Date.now();
    const finalTopK = args.topK ?? 5;
    const overfetchK = finalTopK * 2; // Reduced from 3x to 2x to save DB cost

    // 1. Query Rewriting (Legal Synonyms & Expansion)
    const rewrittenQuery = await this.rewriteQuery(args.query);

    const [qEmb] = await this.embeddings.embed([rewrittenQuery]);
    if (!qEmb || qEmb.length < 3) return [];

    // Filter docs by owner first (ACL).
    const docRows = await this.docs
      .createQueryBuilder('d')
      .select(['d.id AS id'])
      .where('d.userId = :uid', { uid: args.userId })
      .orWhere('d.userId = :kb', { kb: KB_USER_ID })
      .getRawMany<{ id: string }>();
    const docIds = docRows.map((d: { id: string }) => d.id);
    if (docIds.length === 0) return [];

    const qVector = `[${qEmb.join(',')}]`;

    // 2. Vector Search (Cosine Distance for better semantic ranking)
    const rows = await this.chunks
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.content AS content', 'c.documentId AS "documentId"'])
      // Cosine distance <=> operator. Similarity is 1 - distance.
      .addSelect(`1 - (c.embedding <=> :q)`, 'similarity')
      .where('c.documentId = ANY(:docIds)', { docIds })
      .andWhere('c.embedding IS NOT NULL')
      .orderBy('c.embedding <=> :q', 'ASC')
      .limit(overfetchK)
      .setParameter('q', qVector)
      .getRawMany();

    if (rows.length === 0) return [];

    // 3. Initial Filtering & Conditional Re-ranking
    // 3. Initial Filtering & Conditional Re-ranking
    // Fetch global health state to adapt behavior
    const health = await this.cache.getJson<{ hallucinationRate: number, correctnessTrend: number }>('ai:health:metrics');
    const isHallucinating = (health?.hallucinationRate || 0) > 0.05; // > 5% hallucination rate triggers stricter behavior

    // If system is hallucinating, increase the base similarity threshold to drop more noise
    const baseThreshold = isHallucinating ? 0.50 : 0.40;
    const candidates = rows.filter((r: any) => Number(r.similarity) >= baseThreshold);
    if (candidates.length === 0) return [];

    // Determine query complexity to balance cost vs accuracy dynamically
    const wordCount = args.query.trim().split(/\s+/).length;
    const isShortSimple = wordCount <= 5 && !args.query.includes('?');
    const isComplex = wordCount >= 15 || (args.query.match(/\?/g) || []).length > 1; // Long queries or multiple questions

    let shouldRerank = true;
    if (args.riskLevel === 'high') {
      shouldRerank = true; // Always rerank high-risk legal queries
    } else if (isComplex || isHallucinating) {
      shouldRerank = true; // Force rerank for complex queries OR if the system is currently hallucinating
    } else if (isShortSimple) {
      shouldRerank = false; // Skip rerank for short/simple queries
    } else if (args.riskLevel === 'low') {
      shouldRerank = false; // Skip rerank for low-risk, average-length queries
    }

    let scoredChunks: any[] = [];
    if (!shouldRerank) {
      // Avoid reranking for simple/low-risk queries to save LLM cost and latency
      scoredChunks = candidates.map((c: any) => ({ ...c, score: Number(c.similarity) }));
    } else {
      // Use LLM reranker ONLY for the absolute top candidates to reduce token cost
      const candidatesToRerank = candidates.slice(0, finalTopK + 2);
      scoredChunks = await this.rerankChunks(rewrittenQuery, candidatesToRerank);
      
      // Append the un-reranked chunks with their raw similarity score (lowered slightly to ensure they stay at bottom)
      const remaining = candidates.slice(finalTopK + 2).map((c: any) => ({ ...c, score: Number(c.similarity) * 0.8 }));
      scoredChunks = [...scoredChunks, ...remaining].sort((a, b) => b.score - a.score);
    }

    // 4. Confidence Scoring & Filtering
    // Increase final threshold dynamically if hallucination is rising
    const threshold = !shouldRerank 
      ? (isHallucinating ? 0.55 : 0.45) 
      : (isHallucinating ? 0.70 : 0.60); 
    
    return scoredChunks
      .filter((r: any) => r.score >= threshold)
      .slice(0, finalTopK)
      .map((r: any) => {
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (r.score >= 0.85) confidence = 'high';
        else if (r.score >= 0.70) confidence = 'medium';

        return {
          id: r.id,
          content: r.content,
          score: r.score,
          confidence,
          source: `document:${r.documentId}`,
        };
      });
  }

  private async rewriteQuery(query: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return query; // Fallback for local dev

    try {
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are a legal query rewriter for Indonesian law.
Your task is to rewrite the user's query to improve vector search retrieval.
- Add relevant legal synonyms (e.g., "dipecat" -> "PHK, Pemutusan Hubungan Kerja, pesangon").
- Correct typos.
- Do not answer the question. Only output the optimized search query.
- Keep it concise.`
          },
          { role: 'user', content: query }
        ]
      });
      return res.choices[0]?.message?.content || query;
    } catch (e) {
      console.error('Query rewrite failed:', e);
      return query;
    }
  }

  private async rerankChunks(query: string, chunks: any[]): Promise<Array<any & { score: number }>> {
    // In a production system, use a dedicated Cross-Encoder model (like Cohere Rerank or BGE-Reranker).
    // For this implementation, we use an LLM to score the chunks if the API key is present.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: just use the cosine similarity from pgvector
      return chunks.map((c: any) => ({ ...c, score: Number(c.similarity) }));
    }

    try {
      const client = new OpenAI({ apiKey });
      
      const prompt = `Rate the relevance of the following document chunks to the user query on a scale of 0.0 to 1.0.
Query: "${query}"

Return a JSON object containing a "scores" array of numbers corresponding to the chunks in order. Example: { "scores": [0.9, 0.2, 0.8] }

Chunks:
${chunks.map((c: any, i: number) => `[Chunk ${i}]: ${c.content.slice(0, 1000)}...`).join('\n\n')}`;

      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You output a JSON object with a "scores" array of numbers.' },
          { role: 'user', content: prompt }
        ]
      });

      const raw = res.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      const scores: number[] = parsed.scores || [];

      // Map scores back and sort. If the LLM misses a score, fallback to 0.0 (do not mix with raw cosine similarity)
      return chunks
        .map((c: any, i: number) => ({ ...c, score: scores[i] ?? 0.0 }))
        .sort((a, b) => b.score - a.score);

    } catch (e) {
      console.error('Reranking failed:', e);
      return chunks.map((c: any) => ({ ...c, score: Number(c.similarity) }));
    }
  }
}
