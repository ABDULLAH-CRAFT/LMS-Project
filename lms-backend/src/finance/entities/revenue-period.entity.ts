import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RevenuePeriodStatus } from '../finance.enums';

// Mutable while OPEN..CALCULATED. Once FINALIZED the database itself freezes
// the amounts and dates (trigger), and status may only move forward.
@Entity('revenue_periods', { synchronize: false })
export class RevenuePeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  periodStart!: string; // "2026-09-01"

  @Column({ type: 'date' })
  periodEnd!: string; // "2026-09-30"

  @Column({ type: 'enum', enum: RevenuePeriodStatus, enumName: 'revenue_period_status', default: RevenuePeriodStatus.OPEN })
  status!: RevenuePeriodStatus;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  grossRevenue!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  eligibleRevenue!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  platformRevenue!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  teacherPool!: string;

  @Column({ type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  finalizedById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}