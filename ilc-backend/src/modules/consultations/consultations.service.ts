import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LawyersService } from '@/modules/lawyers/lawyers.service';

import { ConsultationEntity, type ConsultationStatus } from './entities/consultation.entity';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(ConsultationEntity) private repo: Repository<ConsultationEntity>,
    private lawyers: LawyersService
  ) {}

  async listForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getForUser(userId: string, consultationId: string) {
    const c = await this.repo.findOne({ where: { id: consultationId } });
    if (!c) throw new NotFoundException('Not found');
    if (c.userId !== userId) throw new ForbiddenException();
    return c;
  }

  async create(userId: string, args: { lawyerId: string; scheduledAt: string; topic: string }) {
    const scheduledAt = new Date(args.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('scheduledAt invalid');
    if (scheduledAt.getTime() < Date.now() + 5 * 60 * 1000) throw new BadRequestException('scheduledAt too soon');

    const lawyer = await this.lawyers.getById(args.lawyerId);
    if (!lawyer) throw new BadRequestException('lawyer not found');

    // Double booking protection at service layer (DB unique index should be primary protection)
    const existing = await this.repo.findOne({
      where: { lawyerId: args.lawyerId, scheduledAt, status: 'confirmed' as ConsultationStatus },
    });
    if (existing) throw new BadRequestException('slot already booked');

    const c = this.repo.create({
      userId,
      lawyerId: args.lawyerId,
      scheduledAt,
      topic: args.topic,
      price: lawyer.pricePerSession,
      status: 'pending_payment',
    });
    return this.repo.save(c);
  }

  async attachPayment(consultationId: string, paymentId: string) {
    const c = await this.repo.findOne({ where: { id: consultationId } });
    if (!c) throw new NotFoundException('Not found');
    c.paymentId = paymentId;
    // Payment created implies still pending payment unless already paid via out-of-band reconciliation.
    if (c.status === 'pending_payment') {
      // no-op
    }
    return this.repo.save(c);
  }

  async confirm(userId: string, consultationId: string) {
    const c = await this.getForUser(userId, consultationId);
    if (c.status === 'cancelled') throw new BadRequestException('cancelled');
    if (c.status === 'completed') return c;
    c.status = 'confirmed';
    return this.repo.save(c);
  }

  async complete(userId: string, consultationId: string) {
    const c = await this.getForUser(userId, consultationId);
    if (c.status !== 'confirmed') throw new BadRequestException('not confirmed');
    c.status = 'completed';
    return this.repo.save(c);
  }

  async cancel(userId: string, consultationId: string) {
    const c = await this.getForUser(userId, consultationId);
    c.status = 'cancelled';
    return this.repo.save(c);
  }

  // Internal use: webhook can confirm by consultationId without user context
  async confirmBySystem(consultationId: string) {
    const c = await this.repo.findOne({ where: { id: consultationId } });
    if (!c) throw new NotFoundException('Not found');
    if (c.status === 'confirmed' || c.status === 'completed') return c;
    if (c.status === 'cancelled') return c;
    c.status = 'confirmed';
    return this.repo.save(c);
  }
}
