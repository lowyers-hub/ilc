import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import { PaymentsService } from '@/modules/payments/payments.service';

type MidtransWebhookPayload = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
};

@Controller('payments')
export class WebhooksController {
  constructor(private cfg: ConfigService, private payments: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async midtransWebhook(@Body() payload: MidtransWebhookPayload, @Headers() _headers: Record<string, any>) {
    // 1) verify signature
    const serverKey = this.cfg.get<string>('MIDTRANS_SERVER_KEY') ?? '';
    const expected = createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest('hex');

    if (expected !== payload.signature_key) {
      // Intentionally return 200 with error to prevent excessive retries leaking info.
      return { ok: false, message: 'invalid signature' };
    }

    // 1b) validate minimal payload fields
    if (!payload.order_id || !payload.transaction_status) return { ok: true };

    // 2) find payment by order_id
    const payment = await this.payments.findByOrderId(payload.order_id);
    if (!payment) return { ok: true }; // unknown order_id, ignore

    // Basic integrity check: ensure amount matches
    const gross = Number(payload.gross_amount);
    if (!Number.isNaN(gross) && gross !== payment.amount) {
      return { ok: true, message: 'amount_mismatch' };
    }

    // 3) update payment.status (idempotent)
    const status = mapMidtransStatus(payload.transaction_status, payload.fraud_status);
    await this.payments.setStatus(payment.id, status, payload);

    // 4) if paid → payments.setStatus will confirm consultation via ConsultationsService
    return { ok: true };
  }
}

function mapMidtransStatus(transactionStatus: string, fraudStatus?: string) {
  // Midtrans: settlement/capture => success; pending => requires_action; deny/cancel/expire => failed
  const ts = String(transactionStatus).toLowerCase();
  if (ts === 'capture') {
    if (String(fraudStatus ?? '').toLowerCase() === 'challenge') return 'requires_action';
    return 'paid';
  }
  if (ts === 'settlement') return 'paid';
  if (ts === 'pending') return 'requires_action';
  if (ts === 'deny' || ts === 'cancel' || ts === 'expire') return 'failed';
  return 'requires_action';
}
