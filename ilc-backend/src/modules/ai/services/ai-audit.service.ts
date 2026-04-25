import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiAuditEntity } from '../entities/ai-audit.entity';

@Injectable()
export class AiAuditService {
  constructor(@InjectRepository(AiAuditEntity) private repo: Repository<AiAuditEntity>) {}

  async record(data: Partial<AiAuditEntity>) {
    const ent = this.repo.create(data);
    await this.repo.save(ent);
  }

  async findByRequestId(requestId: string) {
    return this.repo.findOne({ where: { requestId } });
  }

  async saveEvaluation(requestId: string, evaluations: AiAuditEntity['evaluations']) {
    await this.repo.update({ requestId }, { evaluations });
  }

  // --- Observability Metrics ---

  async getHallucinationRate(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('audit')
      .select(`SUM(CAST(audit.evaluations->>'hallucinationScore' AS NUMERIC)) / NULLIF(COUNT(audit.id), 0)`, 'rate')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere("audit.evaluations->>'hallucinationScore' IS NOT NULL")
      .getRawOne();

    return parseFloat(result?.rate || '0');
  }

  async getCorrectnessTrend(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('audit')
      .select(`AVG(CAST(audit.evaluations->>'correctnessScore' AS NUMERIC))`, 'averageCorrectness')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere("audit.evaluations->>'correctnessScore' IS NOT NULL")
      .getRawOne();

    return parseFloat(result?.averageCorrectness || '0');
  }

  async getEscalationRate(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('audit')
      .select(`SUM(CASE WHEN audit.escalation = true THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(audit.id), 0)`, 'rate')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result?.rate || '0');
  }
}

