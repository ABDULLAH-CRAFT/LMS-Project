import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RevenueSourceType } from '../finance.enums';

// Append-only, effective-dated split configuration.
// The rule in force at time T is the row with the latest effectiveFrom <= T.
// Old rows are never edited, so historical calculations stay reproducible.
// Managed ONLY by migrations (synchronize: false) - never by schema sync.
@Entity('revenue_rules', { synchronize: false })
export class RevenueRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: RevenueSourceType, enumName: 'revenue_source_type' })
  sourceType!: RevenueSourceType;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  platformPercentage!: string; // "30.00"

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  teacherPercentage!: string; // "70.00"

  @Column({ type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null; // admin who scheduled it; null = system seed

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}