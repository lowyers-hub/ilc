import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_audits')
export class AiAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  requestId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'text' })
  kind!: string; // legal-chat | document-risk | contract-draft | escalation-classifier

  @Column({ type: 'text' })
  promptVersion!: string;

  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tokenUsage!: any | null;

  @Column({ type: 'text', array: true, default: '{}' })
  retrievedChunkIds!: string[];

  @Column({ type: 'text', nullable: true })
  confidence!: string | null;

  @Column({ type: 'boolean', default: false })
  escalation!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  escalationMeta!: any | null;

  @Column({ type: 'boolean', default: false })
  fallbackUsed!: boolean;

  @Column({ type: 'boolean', default: false })
  cacheHit!: boolean;

  @Column({ type: 'int', nullable: true })
  latencyMs!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  input!: any | null;

  @Column({ type: 'text', nullable: true })
  rawModelOutput!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  sanitizedOutput!: any | null;

  @Column({ type: 'jsonb', nullable: true })
  finalResponse!: any | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

