import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

// APPEND-ONLY: one row per paid billing month. paymentItemId is UNIQUE, so the same
// payment can never extend a subscription twice. Managed ONLY by migrations.
@Entity('subscription_payments', { synchronize: false })
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'uuid' })
  paymentItemId!: string;

  @Column({ type: 'timestamptz' })
  periodStart!: Date; // the month of access this payment bought

  @Column({ type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}