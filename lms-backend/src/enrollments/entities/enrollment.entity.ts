import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm'; // TypeORM decorators
import { User } from '../../users/entities/user.entity'; // for the student relation
import { Course } from 'src/entities/course.entity'; // for the course relation

export enum EnrollmentStatus { // tracks the state of an enrollment — room to grow later (e.g. completed, cancelled)
  ACTIVE = 'active', // student is currently enrolled
}

@Entity('enrollments') // maps to a table named "enrollments"
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') // auto-generated unique ID
  id!: string;

  @Column()
  studentId!: string; // raw foreign key — used for fast "is this MY enrollment" checks without a join

  @Column()
  courseId!: string; // raw foreign key — same reasoning

  @ManyToOne(() => User, { eager: false }) // many enrollments belong to one student
  student!: User; // gives access to the full student object when needed

  @ManyToOne(() => Course, { eager: true }) // eager: true — automatically loads the full course details on every query, since the frontend always needs them alongside the enrollment
  course!: Course;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE }) // defaults to active on creation
  status!: EnrollmentStatus;

  @CreateDateColumn()
  enrolledAt!: Date; // timestamp of when the enrollment happened
}