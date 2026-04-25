import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditCacheKey1777084967804 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_audits" ADD "cacheKey" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_audits" DROP COLUMN "cacheKey"`);
    }

}
