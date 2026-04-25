import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PaymentStatus = 'requires_action' | 'paid' | 'failed' | 'refunded';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  consultationId!: string;

  @Index()
  @Column({ type: 'text' })
  provider!: string; // "midtrans"

  @Index({ unique: true })
  @Column({ type: 'text' })
  orderId!: string; // provider order_id

  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  providerPaymentId!: string | null; // Midtrans Snap token (or provider transaction id)

  @Column({ type: 'text', default: 'requires_action' })
  status!: PaymentStatus;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'text', default: 'IDR' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  checkoutUrl!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  rawWebhook!: any | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
