import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { ConsultationEntity } from '@/modules/consultations/entities/consultation.entity';
import { DocumentEntity } from '@/modules/documents/entities/document.entity';
import { LawyerEntity } from '@/modules/lawyers/entities/lawyer.entity';
import { PaymentEntity } from '@/modules/payments/entities/payment.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { DocumentChunkEntity } from '@/modules/rag/entities/document-chunk.entity';
import { AiAuditEntity } from '@/modules/ai/entities/ai-audit.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, LawyerEntity, ConsultationEntity, PaymentEntity, DocumentEntity, DocumentChunkEntity, AiAuditEntity],
  migrations: ['src/migrations/*.ts'],
});
