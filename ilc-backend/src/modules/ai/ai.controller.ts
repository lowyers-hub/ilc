import { Body, Controller, Get, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';

import { CurrentUser } from '@/common/auth/current-user.decorator';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator';
import { RedisRateLimitGuard } from '@/common/rate-limit/redis-rate-limit.guard';

import { AiService } from './ai.service';
import { AiAuditService } from './services/ai-audit.service';
import { ChatDto } from './dto/chat.dto';
import { ClassifyDto } from './dto/classify.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService, private audits: AiAuditService) {}

  @Post('classify')
  async classify(@Body() dto: ClassifyDto) {
    return this.ai.classify(dto.message);
  }

  @Post('chat')
  @UseGuards(RedisRateLimitGuard)
  @RateLimit({ key: 'ai.chat', limit: 20, windowSec: 60 })
  async chat(@CurrentUser() u: { userId: string }, @Body() dto: ChatDto) {
    return this.ai.chat(u.userId, { message: dto.message, sessionId: dto.sessionId, history: dto.history });
  }

  @Get('chat/sessions')
  async getSessions(@CurrentUser() u: { userId: string }) {
    return this.ai.getSessions(u.userId);
  }

  @Get('chat/:sessionId/messages')
  async getMessages(@CurrentUser() u: { userId: string }, @Param('sessionId') sessionId: string) {
    try {
      return await this.ai.getMessages(u.userId, sessionId);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
  }

  @Get('audit/:requestId')
  async audit(@CurrentUser() u: { userId: string }, @Param('requestId') requestId: string) {
    const rec = await this.audits.findByRequestId(requestId);
    if (!rec) return null;
    // Minimal access control: only the same user can view their audit record.
    if (rec.userId !== u.userId) return null;
    return {
      requestId: rec.requestId,
      promptVersion: rec.promptVersion,
      model: rec.model,
      tokenUsage: rec.tokenUsage,
      retrievedChunkIds: rec.retrievedChunkIds,
      confidence: rec.confidence,
      escalation: rec.escalation,
      escalationMeta: rec.escalationMeta,
      fallbackUsed: rec.fallbackUsed,
      cacheHit: rec.cacheHit,
      latencyMs: rec.latencyMs,
      input: rec.input,
      rawModelOutput: rec.rawModelOutput,
      sanitizedOutput: rec.sanitizedOutput,
      finalResponse: rec.finalResponse,
      createdAt: rec.createdAt,
    };
  }
}
