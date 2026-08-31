import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm'; // decorators for defining a DB table via TypeORM
import { User } from 'src/users/entities/user.entity'; // needed for the teacher relationship below

export enum CourseStatus { // controls whether students can see a course yet
  DRAFT = 'draft', // teacher is still working on it — hidden from students
  PUBLISHED = 'published', // visible in the student catalog
}

@Entity('courses') // maps this class to a table named "courses"
export class Course {
  @PrimaryGeneratedColumn('uuid') // auto-generated unique ID for each course
  id!: string;

  @Column()
  title!: string; // course name, e.g. "Intro to React"

  @Column({ type: 'text' }) // 'text' allows longer content than a normal varchar column
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) // stores money accurately — avoids floating point rounding issues
  price!: number;

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT }) // new courses start hidden until the teacher publishes them
  status!: CourseStatus;

  @Column()
  teacherId!: string; // stores the raw foreign key — used for quick "is this MY course" checks without a join

  @ManyToOne(() => User, { eager: false }) // defines the relationship: many courses belong to one teacher (User)
  teacher!: User; // gives you access to the full teacher object when you need it (e.g. course.teacher.name)

  @CreateDateColumn()
  createdAt!: Date;
}