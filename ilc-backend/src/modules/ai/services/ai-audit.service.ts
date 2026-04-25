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
}

