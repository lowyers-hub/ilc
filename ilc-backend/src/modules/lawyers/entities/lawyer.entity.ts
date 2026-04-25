import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('lawyers')
export class LawyerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Index()
  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  specialization!: string[];

  @Column({ type: 'int', default: 0 })
  experienceYears!: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating!: string;

  @Index()
  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Index()
  @Column({ type: 'int' })
  pricePerSession!: number;

  @Index()
  @Column({ type: 'boolean', default: true })
  available!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

