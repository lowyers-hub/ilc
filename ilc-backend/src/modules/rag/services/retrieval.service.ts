import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KB_USER_ID } from '@/common/constants';
import { DocumentEntity } from '@/modules/documents/entities/document.entity';

import { DocumentChunkEntity } from '../entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';

export type RetrievedChunk = { id: string; content: string; score: number; source: string };

@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(DocumentChunkEntity) private chunks: Repository<DocumentChunkEntity>,
    private embeddings: EmbeddingService,
    @InjectRepository(DocumentEntity) private docs: Repository<DocumentEntity>
  ) {}

  // Replace with pgvector / Pinecone / Weaviate and enforce ACL via userId filters.
  async retrieve(args: { userId: string; query: string; topK?: number }): Promise<RetrievedChunk[]> {
    const topK = args.topK ?? 5;
    const [qEmb] = await this.embeddings.embed([args.query]);
    if (!qEmb || qEmb.length < 3) return [];

    // Filter docs by owner first (ACL).
    const docRows = await this.docs
      .createQueryBuilder('d')
      .select(['d.id AS id'])
      .where('d.userId = :uid', { uid: args.userId })
      .orWhere('d.userId = :kb', { kb: KB_USER_ID })
      .getRawMany<{ id: string }>();
    const docIds = docRows.map((d) => d.id);
    if (docIds.length === 0) return [];

    // pgvector expects '[1,2,3]' string. Use L2 distance operator <->.
    const qVector = `[${qEmb.join(',')}]`;

    const rows = await this.chunks
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.content AS content', 'c.documentId AS "documentId"'])
      .addSelect(`(1 / (1 + (c.embedding <-> :q)))`, 'score')
      .where('c.documentId = ANY(:docIds)', { docIds })
      .andWhere('c.embedding IS NOT NULL')
      .orderBy('c.embedding <-> :q', 'ASC')
      .limit(topK)
      .setParameter('q', qVector)
      .getRawMany<{ id: string; content: string; documentId: string; score: string }>();

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      score: Number(r.score),
      source: `document:${r.documentId}`,
    }));
  }
}
