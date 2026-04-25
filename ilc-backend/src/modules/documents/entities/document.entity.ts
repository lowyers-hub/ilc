import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  source!: string;

  @Index()
  @Column({ type: 'text', default: 'uploaded' })
  status!: DocumentStatus;

  @Column({ type: 'text' })
  storageKey!: string;

  @Column({ type: 'text', nullable: true })
  mimeType!: string | null;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

