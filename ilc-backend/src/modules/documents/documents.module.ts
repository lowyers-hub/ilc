import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RagModule } from '@/modules/rag/rag.module';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';
import { AiModule } from '@/modules/ai/ai.module';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsProcessor } from './workers/documents.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentChunkEntity]),
    RagModule,
    AiModule,
    BullModule.registerQueue({
      name: 'documents',
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsProcessor],
})
export class DocumentsModule {}
