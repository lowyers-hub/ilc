import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAudits0002 implements MigrationInterface {
  name = 'AiAudits0002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_audits" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requestId" uuid NOT NULL UNIQUE,
        "userId" uuid NOT NULL,
        "kind" text NOT NULL,
        "promptVersion" text NOT NULL,
        "model" text,
        "tokenUsage" jsonb,
        "retrievedChunkIds" text[] NOT NULL DEFAULT '{}'::text[],
        "confidence" text,
        "escalation" boolean NOT NULL DEFAULT false,
        "escalationMeta" jsonb,
        "fallbackUsed" boolean NOT NULL DEFAULT false,
        "cacheHit" boolean NOT NULL DEFAULT false,
        "latencyMs" int,
        "input" jsonb,
        "rawModelOutput" text,
        "sanitizedOutput" jsonb,
        "finalResponse" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_audits_userId" ON "ai_audits"("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_audits_kind" ON "ai_audits"("kind")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_audits_createdAt" ON "ai_audits"("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_audits"`);
  }
}

