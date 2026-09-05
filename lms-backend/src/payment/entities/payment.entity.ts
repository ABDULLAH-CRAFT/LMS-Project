import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PaymentItem } from './payment-item.entity';

export enum PaymentStatus {
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
}

// Represents ONE checkout — which may cover several items at once (a
// whole cart of courses). Stays generic: this entity has no idea what a
// "course" is, only that it paid for a list of PaymentItems.
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number; // total for the whole order

  @Column({ default: 'INR' })
  currency!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status!: PaymentStatus;

  @Column({ default: 'razorpay' })
  provider!: string;

  @Column()
  providerOrderId!: string;

  @Column({ type:'varchar',  nullable: true })
  providerPaymentId!: string | null;

  @OneToMany(() => PaymentItem, (item) => item.payment, { cascade: true, eager: true })
  items!: PaymentItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}