import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MembershipBillingPeriod, MembershipPlanStatus } from '../memberships.enums';

// Managed ONLY by migrations (synchronize: false), like the finance tables.
@Entity('membership_plans', { synchronize: false })
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string; // "599.00" - numeric comes back from Postgres as a string; never parse it into a float for money maths

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'enum', enum: MembershipBillingPeriod, enumName: 'membership_billing_period', default: MembershipBillingPeriod.MONTHLY })
  billingPeriod!: MembershipBillingPeriod;

  @Column({ type: 'enum', enum: MembershipPlanStatus, enumName: 'membership_plan_status', default: MembershipPlanStatus.ACTIVE })
  status!: MembershipPlanStatus;

  @Column({ type: 'boolean', default: false })
  includesAllCourses!: boolean; // true = every PUBLISHED course; false = only membership_plan_courses rows

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}