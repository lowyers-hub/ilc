import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { RagModule } from '@/modules/rag/rag.module';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAuditEntity } from './entities/ai-audit.entity';
import { ChatSessionEntity } from './entities/chat-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { SafetySanitizerService } from './services/safety-sanitizer.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';
import { AiAuditService } from './services/ai-audit.service';
import { AiEvaluationProcessor } from './workers/ai-evaluation.processor';

@Module({
  imports: [
    RagModule, 
    TypeOrmModule.forFeature([AiAuditEntity, ChatSessionEntity, ChatMessageEntity]),
    BullModule.registerQueue({
      name: 'ai-evaluations',
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, SafetySanitizerService, RedisCacheService, AiAuditService, AiEvaluationProcessor],
  exports: [AiAuditService],
})
export class AiModule {}
