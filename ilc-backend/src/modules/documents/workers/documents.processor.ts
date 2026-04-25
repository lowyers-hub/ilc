import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChunkingService } from '@/modules/rag/services/chunking.service';
import { EmbeddingService } from '@/modules/rag/services/embedding.service';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';

import { DocumentEntity } from '../entities/document.entity';

@Processor('documents')
export class DocumentsProcessor extends WorkerHost {
  constructor(
    private chunking: ChunkingService,
    private embedding: EmbeddingService,
    @InjectRepository(DocumentEntity) private docs: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity) private chunks: Repository<DocumentChunkEntity>
  ) {
    super();
  }

  async process(job: Job<{ documentId: string; userId: string }>) {
    const { documentId } = job.data;

    // upload → OCR → chunk → embed → store
    // TODO in production:
    // 1) fetch file from S3
    // 2) OCR/text extraction (Textract/Tesseract/etc)
    // 3) chunk text
    // 4) embed chunks (OpenAI embeddings)
    // 5) store vectors (pgvector) + metadata
    // 6) update document status = ready/failed

    const doc = await this.docs.findOne({ where: { id: documentId } });
    if (!doc) return;

    doc.status = 'processing';
    await this.docs.save(doc);

    const extractedText = `Document ${documentId} extracted text...`;
    const parts = this.chunking.chunk(extractedText);
    const embeddings = await this.embedding.embed(parts);

    // Write chunks
    for (let i = 0; i < parts.length; i++) {
      const chunk = this.chunks.create({
        documentId,
        chunkIndex: i,
        content: parts[i],
        tokenCount: null,
        embedding: embeddings[i] ?? null,
      });
      await this.chunks.save(chunk);
    }

    doc.status = 'ready';
    await this.docs.save(doc);
  }
}
