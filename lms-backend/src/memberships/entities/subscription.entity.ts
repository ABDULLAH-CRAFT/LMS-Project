import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionStatus } from '../memberships.enums';

@Entity('subscriptions', { synchronize: false })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  studentId!: string;

  @Column({ type: 'uuid' })
  membershipPlanId!: string;

  @Column({ type: 'varchar', length: 32, default: 'razorpay' })
  provider!: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  providerSubscriptionId!: string | null; // reserved for Razorpay auto-debit subscriptions

  @Column({ type: 'enum', enum: SubscriptionStatus, enumName: 'subscription_status', default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodStart!: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodEnd!: Date; // "paid-through" date: access ends here unless renewed

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null; // when the student asked to cancel

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}