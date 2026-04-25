import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiAuditEntity } from '../entities/ai-audit.entity';

@Injectable()
export class AiAuditService {
  constructor(@InjectRepository(AiAuditEntity) private repo: Repository<AiAuditEntity>) {}

  async record(audit: Partial<AiAuditEntity>) {
    const e = this.repo.create(audit);
    return this.repo.save(e);
  }

  async findByRequestId(requestId: string) {
    return this.repo.findOne({ where: { requestId } });
  }
}

