import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RevenueTransactionStatus, RevenueTransactionType } from '../finance.enums';

// APPEND-ONLY. One row per money event. Refunds/chargebacks are NEW rows with a
// negative amount and reversesTransactionId pointing at the original.
// Rows can never be updated or deleted (database trigger).
@Entity('revenue_transactions', { synchronize: false })
export class RevenueTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  idempotencyKey!: string; // UNIQUE - the same real-world event can only be posted once

  @Column({ type: 'enum', enum: RevenueTransactionType, enumName: 'revenue_transaction_type' })
  transactionType!: RevenueTransactionType;

  @Column({ type: 'enum', enum: RevenueTransactionStatus, enumName: 'revenue_transaction_status', default: RevenueTransactionStatus.POSTED })
  status!: RevenueTransactionStatus;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string; // signed: purchases positive, refunds/chargebacks negative

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  paymentItemId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  courseId!: string | null; // snapshot, for course revenue reports

  @Column({ type: 'uuid', nullable: true })
  studentId!: string | null; // the payer (snapshot)

  @Column({ type: 'uuid', nullable: true })
  periodId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reversesTransactionId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  revenueRuleId!: string | null; // the exact rule used, so the split is reproducible

  @Column({ type: 'timestamptz' })
  occurredAt!: Date; // business time (when the payment happened)

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}