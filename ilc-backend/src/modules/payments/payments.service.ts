import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConsultationsService } from '@/modules/consultations/consultations.service';

import { PaymentEntity, type PaymentStatus } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity) private repo: Repository<PaymentEntity>,
    private consultations: ConsultationsService,
    private cfg: ConfigService
  ) {}

  async create(userId: string, args: { consultationId: string; amount: number }) {
    // 1) Create local payment first so we can use payment.id as Midtrans order_id.
    const p = this.repo.create({
      userId,
      consultationId: args.consultationId,
      provider: 'midtrans',
      orderId: 'pending',
      amount: args.amount,
      currency: 'IDR',
      status: 'requires_action',
      checkoutUrl: null,
      providerPaymentId: null,
    });
    const created = await this.repo.save(p);

    // order_id must be payment.id (per Phase 23)
    created.orderId = created.id;
    await this.repo.save(created);

    // Attach paymentId to consultation (ownership is handled at controller level in this skeleton)
    // NOTE: In production, also store consultation.status = pending_payment if not already.
    // We keep the write centralized here for consistency.
    // (This method exists in ConsultationsService; we can also do direct repository update later.)
    // For now, we confirm via webhook only.

    // 2) Call Midtrans Snap API
    const serverKey = this.cfg.get<string>('MIDTRANS_SERVER_KEY') ?? '';
    const isProduction = (this.cfg.get<string>('MIDTRANS_IS_PRODUCTION') ?? 'false') === 'true';
    const baseUrl = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';

    const snapReq = {
      transaction_details: {
        order_id: created.id,
        gross_amount: args.amount,
      },
      customer_details: {
        first_name: userId,
      },
    };

    const res = await axios.post(`${baseUrl}/snap/v1/transactions`, snapReq, {
      auth: { username: serverKey, password: '' },
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });

    const token = res.data?.token as string | undefined;
    const redirectUrl = res.data?.redirect_url as string | undefined;

    created.providerPaymentId = token ?? null;
    created.checkoutUrl = redirectUrl ?? null;
    await this.repo.save(created);

    await this.consultations.attachPayment(created.consultationId, created.id);

    return created;
  }

  async getForUser(userId: string, paymentId: string) {
    const p = await this.repo.findOne({ where: { id: paymentId } });
    if (!p) throw new NotFoundException('Not found');
    if (p.userId !== userId) throw new NotFoundException('Not found');
    return p;
  }

  async findByOrderId(orderId: string) {
    // Midtrans sends order_id, which we set to payment.id; keep fallback to orderId column for safety.
    const byId = await this.repo.findOne({ where: { id: orderId } });
    if (byId) return byId;
    return this.repo.findOne({ where: { orderId } });
  }

  async setStatus(paymentId: string, status: PaymentStatus, rawWebhook: any) {
    const p = await this.repo.findOne({ where: { id: paymentId } });
    if (!p) throw new NotFoundException('Not found');
    // Idempotency: if already in terminal paid/failed, no-op.
    if (p.status === 'paid' || p.status === 'failed') return p;

    p.status = status;
    p.rawWebhook = rawWebhook;
    if (status === 'paid') p.paidAt = new Date();
    const saved = await this.repo.save(p);

    if (status === 'paid') {
      await this.consultations.confirmBySystem(p.consultationId);
    }

    return saved;
  }
}
