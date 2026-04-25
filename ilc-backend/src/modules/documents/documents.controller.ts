import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '@/common/auth/current-user.decorator';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator';
import { RedisRateLimitGuard } from '@/common/rate-limit/redis-rate-limit.guard';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  @Get()
  async list(@CurrentUser() u: { userId: string }) {
    return { items: await this.docs.listForUser(u.userId), nextCursor: null };
  }

  @Get(':id')
  async get(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.docs.getForUser(u.userId, id);
  }

  // Matches mobile app contract (multipart/form-data with "file" and "title")
  @Post()
  @UseGuards(RedisRateLimitGuard)
  @RateLimit({ key: 'documents.upload', limit: 10, windowSec: 60 })
  @UseInterceptors(FileInterceptor('file'))
  async create(@CurrentUser() u: { userId: string }, @UploadedFile() _file: any, @Body() dto: UploadDocumentDto) {
    const document = await this.docs.upload(u.userId, dto);
    return { document };
  }

  @Post('upload')
  @UseGuards(RedisRateLimitGuard)
  @RateLimit({ key: 'documents.upload', limit: 10, windowSec: 60 })
  async upload(@CurrentUser() u: { userId: string }, @Body() dto: UploadDocumentDto) {
    return this.docs.upload(u.userId, dto);
  }

  @Post(':id/ocr')
  async startOcr(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.docs.startOcr(u.userId, id);
  }

  @Get(':id/ocr')
  async getOcr(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.docs.getOcr(u.userId, id);
  }

  @Post(':id/risk-analysis')
  async startRisk(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.docs.startRisk(u.userId, id);
  }

  @Get(':id/risk-analysis')
  async getRisk(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.docs.getRisk(u.userId, id);
  }
}
