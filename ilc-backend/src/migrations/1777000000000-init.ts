import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1777000000000 implements MigrationInterface {
    name = 'Init1777000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
        await queryRunner.query(`CREATE TABLE "consultations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "lawyerId" uuid NOT NULL, "status" text NOT NULL DEFAULT 'pending_payment', "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL, "price" integer NOT NULL, "topic" text, "paymentId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c5b78e9424d9bc68464f6a12103" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e5b6a3f67f026ba680ec7934d9" ON "consultations" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2d4dc28f02202761c7c49a11ac" ON "consultations" ("lawyerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e75c735da4edfcec042902c751" ON "consultations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_5fcaaf06511526939e8b3bc044" ON "consultations" ("scheduledAt") `);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" text NOT NULL, "source" text NOT NULL, "status" text NOT NULL DEFAULT 'uploaded', "storageKey" text NOT NULL, "mimeType" text, "sizeBytes" bigint, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e300b5c2e3fefa9d6f8a3f2597" ON "documents" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_709389d904fa03bdf5ec84998d" ON "documents" ("status") `);
        await queryRunner.query(`CREATE TABLE "lawyers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "name" text NOT NULL, "specialization" text array NOT NULL DEFAULT '{}'::text[], "experienceYears" integer NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "verified" boolean NOT NULL DEFAULT false, "pricePerSession" integer NOT NULL, "available" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8adba1a65dc0076bb9fa0910d8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_691df6dcf80d3399bcaff80aa6" ON "lawyers" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad8301d90bef3b335d328dab42" ON "lawyers" ("verified") `);
        await queryRunner.query(`CREATE INDEX "IDX_7058c5b2e9ab0bde8265efd326" ON "lawyers" ("pricePerSession") `);
        await queryRunner.query(`CREATE INDEX "IDX_eca324cc965d7a4db894f2a721" ON "lawyers" ("available") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "consultationId" uuid NOT NULL, "provider" text NOT NULL, "orderId" text NOT NULL, "providerPaymentId" text, "status" text NOT NULL DEFAULT 'requires_action', "amount" integer NOT NULL, "currency" text NOT NULL DEFAULT 'IDR', "checkoutUrl" text, "paidAt" TIMESTAMP WITH TIME ZONE, "rawWebhook" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d35cb3c13a18e1ea1705b2817b" ON "payments" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1a957dd108a1f8071f8c8444dc" ON "payments" ("consultationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5c47d119e322c5bf5c091739ba" ON "payments" ("provider") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_af929a5f2a400fdb6913b4967e" ON "payments" ("orderId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_50d2f08323fc3531369f2f4184" ON "payments" ("providerPaymentId") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneE164" text, "email" text, "displayName" text, "passwordHash" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_eea212639be853c241e5dffcc5" ON "users" ("phoneE164") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "document_chunks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "documentId" uuid NOT NULL, "chunkIndex" integer NOT NULL, "content" text NOT NULL, "tokenCount" integer, "embedding" vector, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f9060084e9b872dbb567193978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eaf9afaf30fb7e2ac25989db51" ON "document_chunks" ("documentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f71e2a71504c641a13a00795d4" ON "document_chunks" ("embedding") `);
        await queryRunner.query(`CREATE TABLE "ai_audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requestId" uuid NOT NULL, "userId" uuid NOT NULL, "kind" text NOT NULL, "promptVersion" text NOT NULL, "model" text, "tokenUsage" jsonb, "retrievedChunkIds" text array NOT NULL DEFAULT '{}', "confidence" text, "escalation" boolean NOT NULL DEFAULT false, "escalationMeta" jsonb, "fallbackUsed" boolean NOT NULL DEFAULT false, "cacheHit" boolean NOT NULL DEFAULT false, "latencyMs" integer, "input" jsonb, "rawModelOutput" text, "sanitizedOutput" jsonb, "finalResponse" jsonb, "cacheKey" text, "evaluations" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b3a473f28a8c3832c69af6432db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_76b2c5018d41508a79911a91a0" ON "ai_audits" ("requestId") `);
        await queryRunner.query(`CREATE INDEX "IDX_69a91375742d5d3a6d6994075e" ON "ai_audits" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_267b321823b7961fc6e8678ba5" ON "ai_audits" ("kind") `);
        await queryRunner.query(`CREATE TABLE "ai_chat_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b4f4844c31ab277de498502d1cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2d02a651fbefaa506d31dba328" ON "ai_chat_sessions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a274406cbd75f7218e71a21c08" ON "ai_chat_sessions" ("userId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "ai_chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "role" text NOT NULL, "content" text NOT NULL, "meta" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_68e330d1b2a3c5368bf6d2f67cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c21b53eccf0eb35723bb10f549" ON "ai_chat_messages" ("sessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a7e22397425444ff0444489143" ON "ai_chat_messages" ("sessionId", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a7e22397425444ff0444489143"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c21b53eccf0eb35723bb10f549"`);
        await queryRunner.query(`DROP TABLE "ai_chat_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a274406cbd75f7218e71a21c08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d02a651fbefaa506d31dba328"`);
        await queryRunner.query(`DROP TABLE "ai_chat_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_267b321823b7961fc6e8678ba5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69a91375742d5d3a6d6994075e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76b2c5018d41508a79911a91a0"`);
        await queryRunner.query(`DROP TABLE "ai_audits"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f71e2a71504c641a13a00795d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eaf9afaf30fb7e2ac25989db51"`);
        await queryRunner.query(`DROP TABLE "document_chunks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eea212639be853c241e5dffcc5"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50d2f08323fc3531369f2f4184"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af929a5f2a400fdb6913b4967e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5c47d119e322c5bf5c091739ba"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a957dd108a1f8071f8c8444dc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d35cb3c13a18e1ea1705b2817b"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eca324cc965d7a4db894f2a721"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7058c5b2e9ab0bde8265efd326"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad8301d90bef3b335d328dab42"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_691df6dcf80d3399bcaff80aa6"`);
        await queryRunner.query(`DROP TABLE "lawyers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_709389d904fa03bdf5ec84998d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e300b5c2e3fefa9d6f8a3f2597"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5fcaaf06511526939e8b3bc044"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e75c735da4edfcec042902c751"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d4dc28f02202761c7c49a11ac"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5b6a3f67f026ba680ec7934d9"`);
        await queryRunner.query(`DROP TABLE "consultations"`);
    }

}
