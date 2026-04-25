import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetaToChatMessage1777080088683 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" ADD "meta" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP COLUMN "meta"`);
    }

}
