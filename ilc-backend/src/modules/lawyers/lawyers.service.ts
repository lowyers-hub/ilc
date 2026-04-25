import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LawyerEntity } from './entities/lawyer.entity';

@Injectable()
export class LawyersService {
  constructor(@InjectRepository(LawyerEntity) private repo: Repository<LawyerEntity>) {}

  async list() {
    return this.repo.find({ order: { verified: 'DESC', rating: 'DESC' as any } });
  }

  async getById(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}

