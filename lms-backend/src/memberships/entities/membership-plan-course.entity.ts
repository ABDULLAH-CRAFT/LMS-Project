import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('membership_plan_courses', { synchronize: false })
export class MembershipPlanCourse {
  @PrimaryColumn({ type: 'uuid' })
  membershipPlanId!: string;

  @PrimaryColumn({ type: 'uuid' })
  courseId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}