import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RevenueRecipientType, RevenueSourceType, CALCULATION_VERSION } from '../finance.enums';

// APPEND-ONLY. Says who got what share of a RevenueTransaction.
// The allocations of a transaction must sum EXACTLY to its amount (enforced by a
// deferred database trigger at commit).
@Entity('revenue_allocations', { synchronize: false })
export class RevenueAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  revenueTransactionId!: string;

  @Column({ type: 'enum', enum: RevenueRecipientType, enumName: 'revenue_recipient_type' })
  recipientType!: RevenueRecipientType;

  @Column({ type: 'uuid', nullable: true })
  recipientId!: string | null; // teacher user id; NULL for PLATFORM

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  percentage!: string; // the rule percentage that applied (informational; amount is authoritative)

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string; // signed, same sign as the transaction

  @Column({ type: 'enum', enum: RevenueSourceType, enumName: 'revenue_source_type' })
  sourceType!: RevenueSourceType;

  @Column({ type: 'uuid' })
  sourceId!: string; // COURSE_PURCHASE -> courseId, MEMBERSHIP_POOL -> periodId

  @Column({ type: 'int', default: CALCULATION_VERSION })
  calculationVersion!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}