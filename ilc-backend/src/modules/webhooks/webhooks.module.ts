import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PaymentsModule } from '@/modules/payments/payments.module';

import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ConfigModule, PaymentsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

