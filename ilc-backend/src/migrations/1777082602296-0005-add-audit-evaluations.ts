import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditEvaluations1777082602296 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_audits" ADD "evaluations" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_audits" DROP COLUMN "evaluations"`);
    }

}
