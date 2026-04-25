import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentEntity } from '@/modules/documents/entities/document.entity';
import { RedisCacheService } from '@/common/cache/redis-cache.service';

import { DocumentChunkEntity } from './entities/document-chunk.entity';

import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { RetrievalService } from './services/retrieval.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunkEntity, DocumentEntity])],
  providers: [ChunkingService, EmbeddingService, RetrievalService, RedisCacheService],
  exports: [ChunkingService, EmbeddingService, RetrievalService],
})
export class RagModule {}
