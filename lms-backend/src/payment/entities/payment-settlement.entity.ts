import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

// APPEND-ONLY marker: "this payment has been turned into revenue + enrollments".
// paymentId is UNIQUE in the database, so a payment can be settled exactly once
// no matter how many of /verify, the webhook and the return URL fire.
// Managed ONLY by migrations (synchronize: false).
@Entity('payment_settlements', { synchronize: false })
export class PaymentSettlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'int' })
  courseItemCount!: number; // course_enrollment items found in the payment

  @Column({ type: 'int' })
  revenueTransactionCount!: number; // of those, how many had a paid amount and got a ledger transaction

  @CreateDateColumn({ type: 'timestamptz' })
  settledAt!: Date;
}
