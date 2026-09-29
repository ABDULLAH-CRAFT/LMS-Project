import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Course } from '../../entities/course.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  courseId!: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' }) // deleting a course removes its announcements
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @Column()
  teacherId!: string; // the teacher who posted it

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}