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

  // Post-generation evaluation metrics
  @Column({ type: 'jsonb', nullable: true })
  evaluations!: {
    correctnessScore?: number; // 0.0 - 1.0
    hallucinationScore?: number; // 0 (pass) or 1 (fail)
    usefulnessScore?: number; // 0.0 - 1.0
    rationale?: string;
    evaluatedAt?: string;
    model?: string;
  } | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

