import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/auth/current-user.decorator';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create')
  async create(@CurrentUser() u: { userId: string }, @Body() dto: CreatePaymentDto) {
    const payment = await this.payments.create(u.userId, dto);
    return { payment };
  }

  @Get(':id')
  async get(@CurrentUser() u: { userId: string }, @Param('id') id: string) {
    return this.payments.getForUser(u.userId, id);
  }
}

