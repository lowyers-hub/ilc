import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/auth/current-user.decorator';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';

import { CreateConsultationDto } from './dto/create-consultation.dto';
import { ConsultationsService } from './consultations.service';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private consultations: ConsultationsService) {}

  @Get()
  async list(@CurrentUser() u: { userId: string }) {
    return { items: await this.consultations.listForUser(u.userId), nextCursor: null };
  }

  @Get(':id')
  async get(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.consultations.getForUser(u.userId, id);
  }

  @Post()
  async create(@CurrentUser() u: { userId: string }, @Body() dto: CreateConsultationDto) {
    return this.consultations.create(u.userId, dto);
  }

  @Post(':id/confirm')
  async confirm(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.consultations.confirm(u.userId, id);
  }

  @Post(':id/complete')
  async complete(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.consultations.complete(u.userId, id);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.consultations.cancel(u.userId, id);
  }
}

