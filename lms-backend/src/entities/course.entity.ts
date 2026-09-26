// lms-backend/src/entities/course.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status!: CourseStatus;

  @Column()
  teacherId!: string;

  @ManyToOne(() => User, { eager: false })
  teacher!: User;

  @Column({ type: 'text', nullable: true }) // NEW — optional cover image URL; null means no cover set
  coverImageUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}