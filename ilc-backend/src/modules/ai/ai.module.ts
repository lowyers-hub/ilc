import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RagModule } from '@/modules/rag/rag.module';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAuditEntity } from './entities/ai-audit.entity';
import { SafetySanitizerService } from './services/safety-sanitizer.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';
import { AiAuditService } from './services/ai-audit.service';

@Module({
  imports: [RagModule, TypeOrmModule.forFeature([AiAuditEntity])],
  controllers: [AiController],
  providers: [AiService, SafetySanitizerService, RedisCacheService, AiAuditService],
  exports: [AiAuditService],
})
export class AiModule {}
