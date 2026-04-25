import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ConsultationStatus = 'pending_payment' | 'paid' | 'confirmed' | 'completed' | 'cancelled';

@Entity('consultations')
export class ConsultationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  lawyerId!: string;

  @Index()
  @Column({ type: 'text', default: 'pending_payment' })
  status!: ConsultationStatus;

  @Index()
  @Column({ type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ type: 'int' })
  price!: number;

  @Column({ type: 'text', nullable: true })
  topic!: string | null;

  @Column({ type: 'uuid', nullable: true })
  paymentId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

