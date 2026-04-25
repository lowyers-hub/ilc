import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AiModule } from '@/modules/ai/ai.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ConsultationsModule } from '@/modules/consultations/consultations.module';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { LawyersModule } from '@/modules/lawyers/lawyers.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { RagModule } from '@/modules/rag/rag.module';
import { UsersModule } from '@/modules/users/users.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // use migrations in production
        migrations: ['dist/migrations/*.js'],
        migrationsRun: false,
      }),
    }),
    AuthModule,
    UsersModule,
    LawyersModule,
    ConsultationsModule,
    PaymentsModule,
    DocumentsModule,
    RagModule,
    AiModule,
    WebhooksModule,
  ],
  controllers: [AppController]
})
export class AppModule {}
