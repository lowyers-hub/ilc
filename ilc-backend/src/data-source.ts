import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

import { ConsultationEntity } from '@/modules/consultations/entities/consultation.entity';
import { DocumentEntity } from '@/modules/documents/entities/document.entity';
import { LawyerEntity } from '@/modules/lawyers/entities/lawyer.entity';
import { PaymentEntity } from '@/modules/payments/entities/payment.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';
import { AiAuditEntity } from '@/modules/ai/entities/ai-audit.entity';
import { ChatSessionEntity } from '@/modules/ai/entities/chat-session.entity';
import { ChatMessageEntity } from '@/modules/ai/entities/chat-message.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, LawyerEntity, ConsultationEntity, PaymentEntity, DocumentEntity, DocumentChunkEntity, AiAuditEntity, ChatSessionEntity, ChatMessageEntity],
  migrations: ['src/migrations/*.ts'],
});
