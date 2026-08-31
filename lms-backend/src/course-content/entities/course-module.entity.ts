import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'; // TypeORM decorators
import { Course } from 'src/entities/course.entity'; // for the course relation

@Entity('course_modules') // table name — "modules" alone would be a confusing/reserved-sounding name
export class CourseModule {
  @PrimaryGeneratedColumn('uuid') // auto-generated ID
  id!: string;

  @Column()
  courseId!: string; // raw foreign key for fast lookups

  @ManyToOne(() => Course, { eager: false }) // many modules belong to one course
  course!: Course;

  @Column()
  title!: string; // e.g. "Getting Started"

  @Column({ type: 'int', default: 0 }) // controls display order within the course
  order!: number;
}