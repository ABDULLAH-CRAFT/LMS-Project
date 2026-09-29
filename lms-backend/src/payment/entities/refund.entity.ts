import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type RefundKind = 'REFUND' | 'CHARGEBACK';
export type RefundSource = 'ADMIN' | 'WEBHOOK';

// APPEND-ONLY. One row per real-world refund / chargeback event.
// providerRefundId is UNIQUE: the same Razorpay event can only be recorded once.
// Managed ONLY by migrations (synchronize: false).
@Entity('refunds', { synchronize: false })
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  providerRefundId!: string; // Razorpay refund id, or "dispute:<id>" for chargebacks

  @Column({ type: 'varchar', length: 16 })
  kind!: RefundKind;

  @Column({ type: 'varchar', length: 16 })
  source!: RefundSource;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string; // POSITIVE total refunded (the ledger reversals are the negative rows)

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'uuid', nullable: true })
  initiatedById!: string | null; // the admin who triggered it; null for webhook-originated

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
