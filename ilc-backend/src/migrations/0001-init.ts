import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init0001 implements MigrationInterface {
  name = 'Init0001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phoneE164" text UNIQUE,
        "email" text UNIQUE,
        "displayName" text,
        "passwordHash" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lawyers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid UNIQUE,
        "name" text NOT NULL,
        "specialization" text[] NOT NULL DEFAULT '{}'::text[],
        "experienceYears" int NOT NULL DEFAULT 0,
        "rating" numeric(3,2) NOT NULL DEFAULT 0,
        "verified" boolean NOT NULL DEFAULT false,
        "pricePerSession" int NOT NULL,
        "available" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_lawyers_verified" ON "lawyers"("verified")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_lawyers_available" ON "lawyers"("available")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_lawyers_price" ON "lawyers"("pricePerSession")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consultations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "lawyerId" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'pending_payment',
        "scheduledAt" timestamptz NOT NULL,
        "price" int NOT NULL,
        "topic" text,
        "paymentId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_consultations_userId" ON "consultations"("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_consultations_lawyerId" ON "consultations"("lawyerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_consultations_status" ON "consultations"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_consultations_scheduledAt" ON "consultations"("scheduledAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "consultationId" uuid NOT NULL UNIQUE,
        "provider" text NOT NULL,
        "orderId" text NOT NULL UNIQUE,
        "providerPaymentId" text UNIQUE,
        "status" text NOT NULL DEFAULT 'requires_action',
        "amount" int NOT NULL,
        "currency" text NOT NULL DEFAULT 'IDR',
        "checkoutUrl" text,
        "paidAt" timestamptz,
        "rawWebhook" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payments_userId" ON "payments"("userId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" text NOT NULL,
        "source" text NOT NULL,
        "status" text NOT NULL DEFAULT 'uploaded',
        "storageKey" text NOT NULL,
        "mimeType" text,
        "sizeBytes" bigint,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_documents_userId" ON "documents"("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_documents_status" ON "documents"("status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_chunks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId" uuid NOT NULL,
        "chunkIndex" int NOT NULL,
        "content" text NOT NULL,
        "tokenCount" int,
        "embedding" vector(1536),
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_document_chunks_doc_idx" ON "document_chunks"("documentId","chunkIndex")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_document_chunks_documentId" ON "document_chunks"("documentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_document_chunks_embedding" ON "document_chunks" USING ivfflat ("embedding" vector_l2_ops) WITH (lists = 100)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consultations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lawyers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}

