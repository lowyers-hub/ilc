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

  async getEvaluationsBySessionIds(sessionIds: string[]) {
    if (sessionIds.length === 0) return [];
    
    return this.repo.createQueryBuilder('audit')
      .select(['audit.id', 'audit.input', 'audit.evaluations'])
      .where("audit.input->>'sessionId' IN (:...sessionIds)", { sessionIds })
      .andWhere('audit.evaluations IS NOT NULL')
      .orderBy("audit.input->>'sessionId'", 'ASC')
      .addOrderBy('audit.createdAt', 'DESC')
      .getMany();
  }

  // --- Observability Metrics ---

  async getMetricsByCategory(startDate: Date, endDate: Date) {
    return this.repo.createQueryBuilder('audit')
      .select(`audit.input->'classification'->>'category'`, 'category')
      .addSelect(`SUM(CAST(audit.evaluations->>'hallucinationScore' AS NUMERIC)) / NULLIF(COUNT(audit.id), 0)`, 'hallucinationRate')
      .addSelect(`AVG(CAST(audit.evaluations->>'correctnessScore' AS NUMERIC))`, 'correctnessTrend')
      .addSelect(`SUM(CASE WHEN audit.escalation = true THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(audit.id), 0)`, 'escalationRate')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere("audit.input->'classification'->>'category' IS NOT NULL")
      .andWhere('audit.evaluations IS NOT NULL')
      .groupBy(`audit.input->'classification'->>'category'`)
      .getRawMany();
  }

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

