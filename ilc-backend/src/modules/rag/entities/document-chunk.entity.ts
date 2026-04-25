import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_chunks')
export class DocumentChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  documentId!: string;

  @Column({ type: 'int' })
  chunkIndex!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', nullable: true })
  tokenCount!: number | null;

  // pgvector column (vector(1536)).
  // TypeORM doesn't have first-class typings here in all versions; keep as any.
  @Index()
  @Column({ type: 'vector', nullable: true } as any)
  embedding!: number[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

