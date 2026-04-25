import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatIndexes1777080835536 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_ai_chat_sessions_userId_createdAt" ON "ai_chat_sessions" ("userId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_ai_chat_messages_sessionId_createdAt" ON "ai_chat_messages" ("sessionId", "createdAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_chat_messages_sessionId_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_chat_sessions_userId_createdAt"`);
    }

}
