import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Payment } from './payment.entity';

// One line item within a Payment. Generic — referenceType/referenceId is
// how the calling app (LMS's enrollments, later Lumina's orders) links
// this back to its own domain object.
@Entity('payment_items')
export class PaymentItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: 'CASCADE' })
  payment!: Payment;

  @Column()
  referenceType!: string; // e.g. 'course_enrollment'

  @Column()
  referenceId!: string; // e.g. a courseId

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number; // price of just this item at time of purchase

  @Column({ default: 1 })
  quantity!: number; // always 1 for courses — kept generic for Lumina reuse later
}