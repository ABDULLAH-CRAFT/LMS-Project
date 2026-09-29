import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

// APPEND-ONLY. How one refund was applied to one payment item.
// Managed ONLY by migrations (synchronize: false).
@Entity('refund_items', { synchronize: false })
export class RefundItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  refundId!: string;

  @Column({ type: 'uuid' })
  paymentItemId!: string;

  @Column({ type: 'uuid' })
  revenueTransactionId!: string; // the original COURSE_PURCHASE

  @Column({ type: 'uuid' })
  reversalTransactionId!: string; // the negative REFUND / CHARGEBACK row

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string; // positive

  @Column({ type: 'boolean', default: false })
  accessRevoked!: boolean; // true if this reversal took the student's net for the course to zero

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
